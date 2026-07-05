/**
 * Source-text corrections.
 *
 * These are content fixes applied to the *Unicode source* before any
 * Kruti Dev conversion happens. They exist for recurring typos that must
 * always be corrected in the output (the primary editing workflow is still
 * to fix text directly in the left editor pane — this list is a safety net
 * for known systematic mistakes).
 *
 * To add a correction, append a [wrong, right] pair below. Corrections run
 * in order, as plain text replacements on the readable Devanagari text,
 * which makes them easy to review and hard to get wrong.
 */
export const SOURCE_CORRECTIONS = [
  // कमांक (missing र्) -> क्रमांक. Note the typo is not a substring of the
  // correct word (क् + र vs bare क), so this can never double-apply.
  ['\u0915\u092e\u093e\u0902\u0915', '\u0915\u094d\u0930\u092e\u093e\u0902\u0915'],
];

export function applySourceCorrections(text) {
  let out = text;
  for (const [wrong, right] of SOURCE_CORRECTIONS) {
    out = out.split(wrong).join(right);
  }
  return out;
}
