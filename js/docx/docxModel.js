/**
 * docx <-> in-memory model.
 *
 * We deliberately avoid a full DOM/XML parser round-trip (which tends to
 * reformat or drop attributes we don't understand). Instead we:
 *   1. Merge fragmented runs (runMerger.js)
 *   2. Replace every <w:t>...</w:t> with a unique placeholder token
 *   3. Keep the surrounding XML byte-for-byte as a "template"
 *   4. Expose a simple paragraphs/runs array for the UI to render & edit
 *
 * Re-generating the document.xml is then just substituting the placeholders
 * back in with (possibly converted) text - everything else in the file is
 * untouched.
 */
import { mergeDocumentRuns } from './runMerger.js';

const PARA_RE = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
const RUN_RE = /<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g;
const RPR_RE = /<w:rPr(?:\s[^>]*)?>([\s\S]*?)<\/w:rPr>|<w:rPr(?:\s[^>]*)?\/>/;
const T_TAG_RE = /<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/;
const PPR_ALIGN_RE = /<w:jc\s+w:val="([^"]+)"/;

const FONT_FILES = [
  'word/document.xml',
  'word/styles.xml',
  'word/settings.xml',
  'word/fontTable.xml',
  'word/webSettings.xml',
  'word/stylesWithEffects.xml',
];

const PLACEHOLDER_PREFIX = '\u0000RUN';
const PLACEHOLDER_SUFFIX = '\u0000';

function xmlEscape(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function xmlUnescape(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * @param {JSZip} zip
 * @returns {Promise<{model: object, sourceFontNames: string[]}>}
 */
export async function loadDocxModel(zip) {
  const docPath = 'word/document.xml';
  const rawXml = await zip.file(docPath).async('string');
  const mergedXml = mergeDocumentRuns(rawXml);

  const sourceFontNames = new Set();
  const fontRe = /w:(?:ascii|hAnsi|cs|eastAsia)="([^"]+)"/g;
  let fm;
  while ((fm = fontRe.exec(mergedXml))) {
    if (/[^\x00-\x7f]/.test('') || true) sourceFontNames.add(fm[1]);
  }

  let runCounter = 0;
  const runIndex = new Map(); // id -> original text (unicode, unescaped)
  const paragraphs = [];

  const templateXml = mergedXml.replace(PARA_RE, (paraXml) => {
    const runMatches = [...paraXml.matchAll(RUN_RE)];
    if (runMatches.length === 0) {
      paragraphs.push({ align: extractAlign(paraXml), runs: [] });
      return paraXml;
    }

    const alignMatch = PPR_ALIGN_RE.exec(paraXml);
    const paraModel = { align: alignMatch ? alignMatch[1] : 'left', runs: [] };

    let newParaXml = paraXml;
    // Replace runs back-to-front so earlier match indices stay valid.
    for (let i = runMatches.length - 1; i >= 0; i--) {
      const run = runMatches[i];
      const runXml = run[0];
      if (!T_TAG_RE.test(runXml)) continue; // run with no text (e.g. just a break)

      const rprMatch = RPR_RE.exec(runXml);
      const rprBlock = rprMatch ? rprMatch[0] : '';
      const bold = /<w:b\/>|<w:b\s/.test(rprBlock);
      const italic = /<w:i\/>|<w:i\s/.test(rprBlock);
      const underline = /<w:u\s/.test(rprBlock);
      const runPieces = [];

      // Every <w:t> in the run gets its own placeholder (runs containing
      // tabs hold several <w:t> elements and all of them carry text).
      const newRunXml = runXml.replace(
        new RegExp(T_TAG_RE.source, 'g'),
        (whole, attrs, inner) => {
          const id = `${PLACEHOLDER_PREFIX}${runCounter++}${PLACEHOLDER_SUFFIX}`;
          const originalText = xmlUnescape(inner);
          runIndex.set(id, { originalText, rprBlock });
          runPieces.push({ id, text: originalText, bold, italic, underline });
          return `<w:t xml:space="preserve">${id}</w:t>`;
        }
      );
      paraModel.runs.unshift(...runPieces);
      const start = run.index;
      const end = start + runXml.length;
      newParaXml = newParaXml.slice(0, start) + newRunXml + newParaXml.slice(end);
    }
    paragraphs.push(paraModel);
    return newParaXml;
  });

  return {
    templateXml,
    runIndex,
    paragraphs,
    sourceFontNames: [...sourceFontNames],
  };
}

function extractAlign(paraXml) {
  const m = PPR_ALIGN_RE.exec(paraXml);
  return m ? m[1] : 'left';
}

const LATIN_RFONTS = '<w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria"/>';
const RFONTS_RE = /<w:rFonts\s[^>]*\/>/;

/** Return a copy of a run's rPr block with fonts forced to Cambria. */
function latinRPr(originalRPr) {
  if (!originalRPr) return `<w:rPr>${LATIN_RFONTS}</w:rPr>`;
  if (RFONTS_RE.test(originalRPr)) return originalRPr.replace(RFONTS_RE, LATIN_RFONTS);
  if (originalRPr.endsWith('/>')) return `<w:rPr>${LATIN_RFONTS}</w:rPr>`;
  return originalRPr.replace('<w:rPr>', `<w:rPr>${LATIN_RFONTS}`);
}

/**
 * Render the model's document.xml with each run's converted segments.
 *
 * @param {string} templateXml
 * @param {Map<string, Array<{kind: 'kd'|'latin', text: string}>>} segmentsById
 *   Per-placeholder converted segments (from segmenter.convertToSegments).
 *   'latin' segments are emitted as separate Cambria-font runs so that
 *   characters with no Kruti Dev glyph (x, ×, =, %, Latin words) render
 *   correctly — the same technique the reference court document uses.
 */
export function renderDocumentXml(templateXml, segmentsById) {
  const RUN_G_RE = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g;

  return templateXml.replace(RUN_G_RE, (runXml) => {
    const placeholderIds = [...runXml.matchAll(/\u0000RUN\d+\u0000/g)].map((m) => m[0]);
    if (placeholderIds.length === 0) return runXml;

    const isSimple =
      placeholderIds.length === 1 &&
      !runXml.includes('<w:tab') &&
      !runXml.includes('<w:br');

    if (isSimple) {
      const id = placeholderIds[0];
      const segments = segmentsById.get(id) ?? [];
      const hasLatin = segments.some((s) => s.kind === 'latin');
      if (hasLatin) {
        // Split into a sequence of runs with alternating fonts.
        const rprMatch = RPR_RE.exec(runXml);
        const rpr = rprMatch ? rprMatch[0] : '';
        return segments
          .map((s) => {
            const body = xmlEscape(s.text);
            const rprBlock = s.kind === 'latin' ? latinRPr(rpr) : rpr;
            return `<w:r>${rprBlock}<w:t xml:space="preserve">${body}</w:t></w:r>`;
          })
          .join('');
      }
      const text = segments.map((s) => s.text).join('');
      return runXml.split(id).join(xmlEscape(text));
    }

    // Structured run (tabs/breaks, multiple text pieces): substitute each
    // placeholder in place. Latin segments stay inline; they will inherit
    // the KD font, so warn if any slipped in (none do in typical documents,
    // since calculations don't appear inside tab-structured header runs).
    let out = runXml;
    for (const id of placeholderIds) {
      const segments = segmentsById.get(id) ?? [];
      if (segments.some((s) => s.kind === 'latin')) {
        console.warn('Latin passthrough inside a structured run; font not switched for:', id);
      }
      const text = segments.map((s) => s.text).join('');
      out = out.split(id).join(xmlEscape(text));
    }
    return out;
  });
}

export { FONT_FILES, xmlEscape, xmlUnescape };
