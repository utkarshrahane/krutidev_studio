/**
 * Latin-passthrough segmentation.
 *
 * Kruti Dev 035 has no glyphs for Latin letters or for '×', '=', '%' —
 * those character slots are reused for Devanagari shapes, so if they were
 * left inside a Kruti Dev-font run they would render as unrelated Marathi
 * characters. The reference court document solves this by putting just
 * those characters into separate Cambria-font runs (e.g. its
 * "115 x 40 = 4600" calculation), and this module replicates that.
 *
 * ASCII digits are NOT passed through: they render correctly in Kruti Dev
 * (verified in the reference document), so they stay in the KD runs.
 *
 * Segmentation runs on the *source* Unicode text, before conversion —
 * this matters because legitimate converted KD text also contains 'x'
 * (the code for ग), '=' (त्र) and '%' (colon), which must not be touched.
 */
import { convertText } from './convert.js';
import { applySourceCorrections } from './sourceCorrections.js';

const PASSTHROUGH_RE = /[A-Za-z\u00d7=%]+/g;

/**
 * @param {string} sourceText - Unicode Devanagari source
 * @returns {Array<{kind: 'kd'|'latin', text: string}>} raw segments
 */
export function segmentSource(sourceText) {
  const parts = [];
  let last = 0;
  for (const m of sourceText.matchAll(PASSTHROUGH_RE)) {
    if (m.index > last) parts.push({ kind: 'kd', text: sourceText.slice(last, m.index) });
    parts.push({ kind: 'latin', text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < sourceText.length) parts.push({ kind: 'kd', text: sourceText.slice(last) });
  return parts;
}

/**
 * Full per-run pipeline: corrections -> segmentation -> conversion.
 * @param {string} sourceText
 * @returns {Array<{kind: 'kd'|'latin', text: string}>} converted segments;
 *   'kd' segments hold Kruti Dev-encoded text, 'latin' segments hold the
 *   literal characters that must be rendered in a Latin font.
 */
export function convertToSegments(sourceText) {
  const corrected = applySourceCorrections(sourceText);
  return segmentSource(corrected)
    .filter((s) => s.text.length > 0)
    .map((s) => (s.kind === 'kd' ? { kind: 'kd', text: convertText(s.text) } : s));
}
