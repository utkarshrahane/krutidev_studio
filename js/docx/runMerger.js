/**
 * Merge consecutive, identically-formatted <w:r> runs within each paragraph
 * of a WordprocessingML document.xml string. Real-world docx files (especially
 * ones that went through spellcheck/paste operations) can end up with a
 * separate run per word or even per character, which breaks Kruti Dev
 * conversion because matra-reordering and conjunct rules need to see a
 * whole word at once.
 *
 * This module works on raw XML strings (not a DOM) to guarantee byte-for-byte
 * fidelity of everything we don't intentionally change.
 */

const RUN_RE = /<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g;
const RPR_RE = /<w:rPr(?:\s[^>]*)?>([\s\S]*?)<\/w:rPr>|<w:rPr(?:\s[^>]*)?\/>/;
const T_RE = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/;
const PARA_RE = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;

function normalizeRPr(runXml) {
  const m = RPR_RE.exec(runXml);
  if (!m) return '';
  return m[0].replace('<w:cs/>', '');
}

function mergeParagraphRuns(paraXml) {
  const runs = [...paraXml.matchAll(RUN_RE)];
  if (runs.length < 2) return paraXml;

  const pieces = [];
  for (const r of runs) {
    const runXml = r[0];
    if (
      runXml.includes('<w:tab') || runXml.includes('<w:br') ||
      runXml.includes('<w:drawing') || runXml.includes('<w:fldChar') ||
      runXml.includes('<w:instrText') || runXml.includes('<w:noBreakHyphen') ||
      (runXml.match(/<w:t(?:\s|>)/g) || []).length > 1
    ) {
      return paraXml; // bail out, leave this paragraph untouched
    }
    const tMatch = T_RE.exec(runXml);
    pieces.push({
      rpr: normalizeRPr(runXml),
      text: tMatch ? tMatch[1] : null,
      raw: runXml,
    });
  }

  const outRuns = [];
  let changed = false;
  let i = 0;
  while (i < pieces.length) {
    const { rpr, text, raw } = pieces[i];
    if (text === null) {
      outRuns.push(raw);
      i++;
      continue;
    }
    let j = i + 1;
    let mergedText = text;
    while (j < pieces.length && pieces[j].rpr === rpr && pieces[j].text !== null) {
      mergedText += pieces[j].text;
      j++;
    }
    if (j - i > 1) {
      changed = true;
      const rprMatch = RPR_RE.exec(raw);
      const rprBlock = rprMatch ? rprMatch[0] : '';
      const needsPreserve = mergedText !== mergedText.trim() || mergedText.includes('  ');
      const spaceAttr = needsPreserve ? ' xml:space="preserve"' : '';
      outRuns.push(`<w:r>${rprBlock}<w:t${spaceAttr}>${mergedText}</w:t></w:r>`);
    } else {
      outRuns.push(raw);
    }
    i = j;
  }

  if (!changed) return paraXml;

  const firstStart = runs[0].index;
  const lastEnd = runs[runs.length - 1].index + runs[runs.length - 1][0].length;
  return paraXml.slice(0, firstStart) + outRuns.join('') + paraXml.slice(lastEnd);
}

export function mergeDocumentRuns(xmlText) {
  return xmlText.replace(PARA_RE, (paraXml) => mergeParagraphRuns(paraXml));
}
