/**
 * Unicode Devanagari -> Kruti Dev 035 conversion.
 *
 * Faithful JS port of the validated Python implementation. Pure functions,
 * no DOM/Node dependencies, so this module can be reused in the browser
 * app, a CLI, or unit tests unchanged.
 */
import { buildTables } from './mappingTable.js';

const { arrayOne, arrayTwo } = buildTables();

function replaceAll(source, find, replace) {
  if (find === '') return source;
  return source.split(find).join(replace);
}

/**
 * Convert a single plain-text string (already extracted from any document
 * structure) from Unicode Devanagari to Kruti Dev 035 encoding.
 */
export function convertText(unicodeText) {
  if (!unicodeText) return unicodeText;

  let s = unicodeText.replace(/\//g, '@').replace(/:/g, '%');

  // Ellipsis: Kruti Dev has no '…' glyph (that codepoint renders as the
  // digit ३). The reference document types it as three periods, which the
  // table below turns into '---' (rendering as "...").
  s = s.replace(/\u2026/g, '...');

  // Neutralize literal straight quotes from the source text so they don't
  // collide with the quote codes used internally for श/ष.
  s = neutralizeQuotes(s, "'", '^', '*');
  s = neutralizeQuotes(s, '"', '\u00df', '\u00de');

  s = reorderShortIMatra(s);
  s = repositionReph(s);

  for (let i = 0; i < arrayOne.length; i++) {
    s = replaceAll(s, arrayOne[i], arrayTwo[i]);
  }

  s = applySmartQuotes(s);
  return s;
}

function neutralizeQuotes(s, quoteChar, evenReplacement, oddReplacement) {
  let out = '';
  let count = 0;
  for (const ch of s) {
    if (ch === quoteChar) {
      out += count % 2 === 0 ? evenReplacement : oddReplacement;
      count++;
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Reorder the short "i" matra (\u093F) to appear before the consonant it
 * modifies, as Kruti Dev expects ("f" + consonant instead of consonant + i-matra).
 */
function reorderShortIMatra(input) {
  let s = input;
  let pos = s.indexOf('\u093f');
  while (pos !== -1) {
    if (pos === 0) {
      // No preceding character in this fragment (can happen at chunk
      // boundaries) -- just drop the matra marker in place.
      s = 'f' + s.slice(1);
      pos = s.indexOf('\u093f', 1);
      continue;
    }
    const leftChar = s[pos - 1];
    s = replaceAll(s, leftChar + '\u093f', 'f' + leftChar);
    pos = pos - 1;

    while (pos !== 0 && pos - 1 >= 0 && s[pos - 1] === '\u094d') {
      const toReplace = s[pos - 2] + '\u094d';
      s = replaceAll(s, toReplace + 'f', 'f' + toReplace);
      pos = pos - 2;
    }
    pos = s.indexOf('\u093f', pos + 1);
  }
  return s;
}

/**
 * Reposition reph (half-र, "\u0930\u094d") to render after the syllable it
 * belongs to, as the glyph "Z", skipping over any dependent vowel matras
 * that belong to the same syllable (but stopping before anusvara/visarga).
 */
function repositionReph(input) {
  const matras = '\u093e\u093f\u0940\u0941\u0942\u0943\u0947\u0948\u094b\u094c';
  let s = input + '  '; // padding to avoid index errors
  let pos = s.indexOf('\u0930\u094d');
  let guard = 0;
  while (pos > 0 && guard < 5000) {
    guard++;
    let zPos = pos + 2;
    let rightChar = zPos + 1 < s.length ? s[zPos + 1] : ' ';
    let innerGuard = 0;
    while (matras.includes(rightChar) && innerGuard < 100) {
      zPos++;
      rightChar = zPos + 1 < s.length ? s[zPos + 1] : ' ';
      innerGuard++;
    }
    const segment = s.slice(pos + 2, zPos + 1);
    s = s.replace('\u0930\u094d' + segment, segment + 'Z');
    pos = s.indexOf('\u0930\u094d');
  }
  return s.slice(0, s.length - 2);
}

function applySmartQuotes(input) {
  const openingContext = new Set([' ', '\t', '\n', '(', '[', '{']);
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const prev = i > 0 ? input[i - 1] : ' ';
    if (ch === "'") {
      out += openingContext.has(prev) ? '\u2018' : '\u2019';
    } else if (ch === '"') {
      out += openingContext.has(prev) ? '\u201c' : '\u201d';
    } else {
      out += ch;
    }
  }
  return out;
}
