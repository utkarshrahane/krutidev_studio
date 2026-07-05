import { FONT_FILES, renderDocumentXml } from './docxModel.js';

const TARGET_FONT = 'Kruti Dev 035';
// Never swap this font: it's what the exporter injects for Latin-passthrough
// runs (x, ×, =, % and Latin words that have no Kruti Dev glyph).
const LATIN_FONT = 'Cambria';

function swapFonts(xml, sourceFontNames) {
  let out = xml;
  for (const name of sourceFontNames) {
    if (name === TARGET_FONT || name === LATIN_FONT) continue;
    out = out.split(name).join(TARGET_FONT);
  }
  return out;
}

/**
 * @param {JSZip} zip - the originally-loaded zip (files will be overwritten
 *   with freshly computed content; safe to call repeatedly)
 * @param {string} templateXml
 * @param {Map<string, Array<{kind: 'kd'|'latin', text: string}>>} segmentsById
 * @param {string[]} sourceFontNames - font names found in the source doc to replace
 * @returns {Promise<Blob>}
 */
export async function exportDocx(zip, templateXml, segmentsById, sourceFontNames) {
  const newDocumentXml = renderDocumentXml(templateXml, segmentsById);
  zip.file('word/document.xml', swapFonts(newDocumentXml, sourceFontNames));

  for (const path of FONT_FILES) {
    if (path === 'word/document.xml') continue;
    const file = zip.file(path);
    if (!file) continue;
    const content = await file.async('string');
    zip.file(path, swapFonts(content, sourceFontNames));
  }

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
