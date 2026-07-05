const FONT_NAME = 'Kruti Dev 035';
const PROBE_TEXT = 'ABCXYZdksVZ';
const FALLBACK_STACK = 'monospace';

/**
 * Canvas-based font detection: compare glyph widths rendered with
 * "<FONT_NAME>, monospace" vs "monospace" alone. If the browser has the
 * font installed, widths will differ; if not, the fallback is used and
 * widths match.
 */
export function isKrutiDevInstalled() {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const size = '72px';

  ctx.font = `${size} ${FALLBACK_STACK}`;
  const baselineWidth = ctx.measureText(PROBE_TEXT).width;

  ctx.font = `${size} "${FONT_NAME}", ${FALLBACK_STACK}`;
  const testWidth = ctx.measureText(PROBE_TEXT).width;

  return Math.abs(testWidth - baselineWidth) > 0.5;
}

export async function waitForFontsReady() {
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (_) {
      /* ignore */
    }
  }
}

export const KRUTI_DEV_FONT_NAME = FONT_NAME;
