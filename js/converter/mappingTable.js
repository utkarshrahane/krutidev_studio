/**
 * Unicode Devanagari -> Kruti Dev 035 character mapping table.
 *
 * Base table adapted from the widely-used UnicodeToKrutidev algorithm
 * (originally C#: abusaadp/Unity3dHindiRenderer), with corrections verified
 * against a real Kruti Dev 035 court document (see CORRECTIONS below).
 *
 * This module only exports data - see convert.js for the algorithm that
 * uses it.
 */

// Base table: source Unicode sequences (longest/most specific first within
// each group) mapped to their Kruti Dev output sequence.
export const BASE_ARRAY_ONE = [
  '\u2018', '\u2019', '\u201c', '\u201d', '(', ')', '{', '}',
  '=', '\u0964', '?', '-', '\u00b5', '\u0970', ',', '.', '\u094d ', '\u0966', '\u0967',
  '\u0968', '\u0969', '\u096a', '\u096b', '\u096c', '\u096d', '\u096e', '\u096f', 'x',
  '\u095e\u094d', '\u0958', '\u0959', '\u095a', '\u095b\u094d', '\u095b', '\u095c', '\u095d', '\u095e', '\u095f',
  '\u0931', '\u0929', '\u0924\u094d\u0924\u094d', '\u0924\u094d\u0924', '\u0915\u094d\u0924', '\u0926\u0943', '\u0915\u0943', '\u0939\u094d\u0928', '\u0939\u094d\u092f', '\u0939\u0943',
  '\u0939\u094d\u092e', '\u0939\u094d\u0930', '\u0939\u094d', '\u0926\u094d\u0926', '\u0915\u094d\u0937\u094d', '\u0915\u094d\u0937', '\u0924\u094d\u0930\u094d', '\u0924\u094d\u0930', '\u091c\u094d\u091e', '\u091b\u094d\u092f', '\u091f\u094d\u092f',
  '\u0920\u094d\u092f', '\u0921\u094d\u092f', '\u0922\u094d\u092f', '\u0926\u094d\u092f', '\u0926\u094d\u0935', '\u0936\u094d\u0930', '\u091f\u094d\u0930', '\u0921\u094d\u0930', '\u0922\u094d\u0930', '\u091b\u094d\u0930',
  '\u0915\u094d\u0930', '\u092b\u094d\u0930', '\u0926\u094d\u0930', '\u092a\u094d\u0930', '\u0917\u094d\u0930', '\u0930\u0941', '\u0930\u0942', '\u094d\u0930', '\u0913', '\u0914',
  '\u0906', '\u0905', '\u0908', '\u0907', '\u0909', '\u090a', '\u0910', '\u090f', '\u090b', '\u0915\u094d',
  '\u0915', '\u0915\u094d\u0915', '\u0916\u094d', '\u0916', '\u0917\u094d', '\u0917', '\u0918\u094d', '\u0918', '\u0919',
  '\u091a\u0948', '\u091a\u094d', '\u091a', '\u091b', '\u091c\u094d', '\u091c', '\u091d\u094d', '\u091d', '\u091e', '\u091f\u094d\u091f',
  '\u091f\u094d\u0920', '\u091f', '\u0920', '\u0921\u094d\u0921', '\u0921\u094d\u0922', '\u0921', '\u0922', '\u0923\u094d', '\u0923',
  '\u0924\u094d', '\u0924', '\u0925\u094d', '\u0925', '\u0926\u094d\u0927', '\u0926', '\u0927\u094d', '\u0927', '\u0928\u094d', '\u0928', '\u092a\u094d',
  '\u092a', '\u092b\u094d', '\u092b', '\u092c\u094d', '\u092c', '\u092d\u094d', '\u092d', '\u092e\u094d', '\u092e', '\u092f\u094d', '\u092f',
  '\u0930', '\u0932\u094d', '\u0932', '\u0933', '\u0935\u094d', '\u0935', '\u0936\u094d', '\u0936', '\u0937\u094d', '\u0937', '\u0938\u094d',
  '\u0938', '\u0939', '\u0911', '\u0949', '\u094b', '\u094c', '\u093e', '\u0940', '\u0941',
  '\u0942', '\u0943', '\u0947', '\u0948', '\u0902', '\u0901', '\u0903', '\u0945', '\u093d', '\u094d ', '\u094d',
];

export const BASE_ARRAY_TWO = [
  '^', '*', '\u00de', '\u00df', '\u00bc', '\u00bd', '\u00bf', '\u00c0', '\u00be', 'A', '\\', '&',
  '&', '\u0152', ']', '-', '~ ', '\u00e5', '\u0192', '\u201e', '\u2026', '\u2020', '\u2021',
  '\u02c6', '\u2030', '\u0160', '\u2039', '\u00db', '\u00b6', 'd', '[k', 'x', 'T',
  't', 'M+', '<+', 'Q', ';', 'j', 'u', '\u00d9', '\u00d9k', 'Dr',
  '\u2013', '\u2014', '\u00e0', '\u00e1', '\u00e2', '\u00e3', '\u00baz', '\u00ba', '\u00ed', '{',
  '{k', '\u00ab', '=', 'K', 'N\u00ee', 'V\u00ee', 'B\u00ee', 'M\u00ee', '<\u00ee', '|', '}',
  'J', 'V\u00aa', 'M\u00aa', '<\u00aa\u00aa', 'N\u00aa', '\u00d8', '\u00dd', '\u00e6', '\u00e7', 'xz',
  '#', ':', 'z', 'vks', 'vkS', 'vk', 'v', 'bZ', 'b', 'm', '\u00c5',
  ',s', ',', '_', 'D', 'd', '\u00f4', '[', '[k', 'X', 'x',
  '?', '?k', '\u00b3', 'pkS', 'P', 'p', 'N', 'T', 't',
  '\u00f7', '>', '\u00a5', '\u00ea', '\u00eb', 'V', 'B', '\u00ec', '\u00ef', 'M',
  '<', '.', '.k', 'R', 'r', 'F', 'Fk', ')', 'n', '/', '/k',
  'U', 'u', 'I', 'i', '\u00b6', 'Q', 'C', 'c', 'H', 'Hk', 'E',
  'e', '\u00b8', ';', 'j', 'Y', 'y', 'G', 'O', 'o', "'", "'k",
  '"', '"k', 'L', 'l', 'g', 'v\u201a', '\u201a', 'ks', 'kS', 'k',
  'h', 'q', 'w', '`', 's', 'S', 'a', '\u00a1', '%', 'W',
  '\u00b7', '~ ', '~',
];

// Corrections verified against a real Kruti Dev 035 court document.
// Keys are the Unicode sequence; values overwrite (or add to) the base table.
export const OVERRIDES = new Map([
  ['\u0966', '0'], ['\u0967', '1'], ['\u0968', '2'], ['\u0969', '3'], ['\u096a', '4'],
  ['\u096b', '5'], ['\u096c', '6'], ['\u096d', '7'], ['\u096e', '8'], ['\u096f', '9'],
  ['\u0930\u0941', ':'],   // रु (short u) -> ':' glyph
  ['\u0930\u0942', ':'],   // रू (long u)  -> ':' glyph (same as short u in this font)
  ['\u0915\u094d\u0930', 'dz'],  // क्र -> क + z
  ['\u092a\u094d\u0930', 'iz'],  // प्र -> प + z
  ['\u0924\u094d\u0924', 'Rr'],  // त्त -> त्(half) + त
  ['\u0924\u094d\u0924\u094d', 'RR'],
  ['\u0911', 'vkW'],       // ऑ
  ['\u0949', 'kW'],        // ॉ matra
  ['\u0939\u094d\u092f', 'g;'],  // ह्य -> ह + य
  ['\u0926\u0943', 'n`'],  // दृ -> द + ृ
  ['\u0915\u0943', 'd`'],  // कृ -> क + ृ
  ['\u0926\u094d\u0930', 'nz'],  // द्र -> द + z
  // Reference-proven conjunct forms (the î ligature glyph is not used
  // anywhere in the reference court document; एकट्याचे is typed ',dV;kps')
  ['\u091f\u094d\u092f', 'V;'],  // ट्य -> ट + य
  ['\u0920\u094d\u092f', 'B;'],  // ठ्य -> ठ + य
  ['\u0921\u094d\u092f', 'M;'],  // ड्य -> ड + य
  ['\u0922\u094d\u092f', '<;'],  // ढ्य -> ढ + य
  ['\u091b\u094d\u092f', 'N;'],  // छ्य -> छ + य
  // झ् has no proven dedicated half-glyph; use the explicit-halant technique
  // the reference itself uses for द्द (typed n~n). e.g. माझ्या -> ek>~;k
  ['\u091d\u094d', '>~'],
]);

// Entries removed from the base table entirely (they either collide with
// literal ASCII the source text needs verbatim, or have no clean glyph in
// this font and should fall through to generic decomposition instead).
export const REMOVE_KEYS = new Set([
  '\u0926\u094d\u0926', // द्द -> falls through to द्(half) + द(bare)
  'x',                    // literal multiplication sign, e.g. "115 x 40"
  '=',                    // literal equals sign, e.g. "115 x 40 = 4600"
]);

// New entries not present in the base table at all.
export const EXTRA_ENTRIES = [
  ['\u0931\u094d', '&'],   // eyelash-RA + virama (half form), e.g. बऱ्याचदा
  ['\u0972', 'vW'],        // Candra A, e.g. ॲडव्होकेट "Advocate"
];

/**
 * Build the final (arrayOne, arrayTwo) pair used by the converter, applying
 * overrides/removals/additions to the base table exactly once.
 */
export function buildTables() {
  const arrayOne = [...BASE_ARRAY_ONE];
  const arrayTwo = [...BASE_ARRAY_TWO];

  for (const key of REMOVE_KEYS) {
    const idx = arrayOne.indexOf(key);
    if (idx !== -1) {
      arrayOne.splice(idx, 1);
      arrayTwo.splice(idx, 1);
    }
  }

  for (const [key, val] of EXTRA_ENTRIES) {
    // insert before the base vowel-sign block so multi-char keys are tried
    // before any shorter overlapping single-char entries
    arrayOne.unshift(key);
    arrayTwo.unshift(val);
  }

  for (const [key, val] of OVERRIDES) {
    const idx = arrayOne.indexOf(key);
    if (idx !== -1) {
      arrayTwo[idx] = val;
    } else {
      arrayOne.unshift(key);
      arrayTwo.unshift(val);
    }
  }

  return { arrayOne, arrayTwo };
}
