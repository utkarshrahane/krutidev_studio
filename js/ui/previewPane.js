const ALIGN_CSS = { left: 'left', center: 'center', right: 'right', both: 'justify' };

/**
 * @param {HTMLElement} container
 * @param {Array} paragraphs - same shape as editorPane's model
 * @param {Map<string, Array<{kind: 'kd'|'latin', text: string}>>} segmentsById
 *   Converted segments per run id. 'latin' segments (x, ×, =, % …) are shown
 *   in a Latin font, exactly as they will appear in the exported docx.
 */
export function renderPreview(container, paragraphs, segmentsById) {
  container.innerHTML = '';
  for (const para of paragraphs) {
    const p = document.createElement('p');
    p.className = 'doc-paragraph';
    p.style.textAlign = ALIGN_CSS[para.align] || 'left';
    if (para.runs.length === 0) {
      p.innerHTML = '<br>';
    }
    for (const run of para.runs) {
      const segments = segmentsById.get(run.id) ?? [];
      for (const seg of segments) {
        const span = document.createElement('span');
        span.className = seg.kind === 'latin' ? 'latin-font' : 'kruti-font';
        if (run.bold) span.style.fontWeight = 'bold';
        if (run.italic) span.style.fontStyle = 'italic';
        if (run.underline) span.style.textDecoration = 'underline';
        span.textContent = seg.text;
        p.appendChild(span);
      }
    }
    container.appendChild(p);
  }
}
