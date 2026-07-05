const ALIGN_CSS = { left: 'left', center: 'center', right: 'right', both: 'justify' };

/**
 * Render the paragraph/run model into an editable pane. Each run becomes a
 * <span data-run-id="..."> so edits can be read back per-run.
 */
export function renderEditor(container, paragraphs) {
  container.innerHTML = '';
  for (const para of paragraphs) {
    const p = document.createElement('p');
    p.className = 'doc-paragraph';
    p.style.textAlign = ALIGN_CSS[para.align] || 'left';
    if (para.runs.length === 0) {
      p.innerHTML = '<br>';
    }
    for (const run of para.runs) {
      const span = document.createElement('span');
      span.dataset.runId = run.id;
      span.contentEditable = 'true';
      span.className = 'doc-run';
      if (run.bold) span.style.fontWeight = 'bold';
      if (run.italic) span.style.fontStyle = 'italic';
      if (run.underline) span.style.textDecoration = 'underline';
      span.textContent = run.text;
      p.appendChild(span);
    }
    container.appendChild(p);
  }
}

/**
 * Read the current (possibly user-edited) text of every run currently in
 * the editor DOM.
 * @returns {Map<string,string>} run id -> current text
 */
export function readEditorText(container) {
  const result = new Map();
  container.querySelectorAll('[data-run-id]').forEach((el) => {
    result.set(el.dataset.runId, el.textContent);
  });
  return result;
}
