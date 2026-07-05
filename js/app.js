import { convertToSegments } from './converter/segmenter.js';
import { loadDocxModel } from './docx/docxModel.js';
import { exportDocx } from './docx/docxExporter.js';
import { renderEditor, readEditorText } from './ui/editorPane.js';
import { renderPreview } from './ui/previewPane.js';
import { isKrutiDevInstalled, waitForFontsReady } from './ui/fontCheck.js';

const state = {
  zip: null,
  templateXml: null,
  paragraphs: [],
  sourceFontNames: [],
  mode: null, // 'docx' | 'text'
};

const els = {};

function cacheElements() {
  els.fileInput = document.getElementById('file-input');
  els.uploadBtn = document.getElementById('upload-btn');
  els.pasteBtn = document.getElementById('paste-btn');
  els.refreshBtn = document.getElementById('refresh-btn');
  els.exportBtn = document.getElementById('export-btn');
  els.editor = document.getElementById('editor-pane');
  els.preview = document.getElementById('preview-pane');
  els.fontBanner = document.getElementById('font-banner');
  els.status = document.getElementById('status-bar');
  els.pasteArea = document.getElementById('paste-area');
  els.pasteOverlay = document.getElementById('paste-overlay');
  els.pasteConfirm = document.getElementById('paste-confirm');
  els.pasteCancel = document.getElementById('paste-cancel');
}

function setStatus(text, isError = false) {
  els.status.textContent = text;
  els.status.classList.toggle('status-error', isError);
}

async function handleFileUpload(file) {
  setStatus(`Reading ${file.name}…`);
  try {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    if (!zip.file('word/document.xml')) {
      setStatus('That file does not look like a .docx (missing word/document.xml).', true);
      return;
    }
    const { templateXml, runIndex, paragraphs, sourceFontNames } = await loadDocxModel(zip);

    state.zip = zip;
    state.templateXml = templateXml;
    state.paragraphs = paragraphs;
    state.sourceFontNames = sourceFontNames;
    state.mode = 'docx';

    renderEditor(els.editor, paragraphs);
    els.preview.innerHTML = '<p class="hint">Click “Refresh” to render this in Kruti Dev 035.</p>';
    els.exportBtn.disabled = true;
    setStatus(`Loaded ${file.name} — ${paragraphs.length} paragraphs.`);
  } catch (err) {
    console.error(err);
    setStatus(`Could not read that file: ${err.message}`, true);
  }
}

function loadPlainText(text) {
  const lines = text.split(/\r?\n/);
  const paragraphs = lines.map((line, i) => ({
    align: 'left',
    runs: line.length ? [{ id: `RUN${i}`, text: line, bold: false, italic: false, underline: false }] : [],
  }));
  state.zip = null;
  state.templateXml = null;
  state.paragraphs = paragraphs;
  state.sourceFontNames = [];
  state.mode = 'text';

  renderEditor(els.editor, paragraphs);
  els.preview.innerHTML = '<p class="hint">Click “Refresh” to render this in Kruti Dev 035.</p>';
  els.exportBtn.disabled = true;
  setStatus(`Loaded pasted text — ${paragraphs.length} lines.`);
}

function doRefresh() {
  if (!state.paragraphs.length) {
    setStatus('Nothing to convert yet — upload a .docx or paste text first.', true);
    return;
  }
  const currentTextById = readEditorText(els.editor);
  // keep the model's own text in sync with any edits made in the editor
  for (const para of state.paragraphs) {
    for (const run of para.runs) {
      if (currentTextById.has(run.id)) run.text = currentTextById.get(run.id);
    }
  }

  const segmentsById = new Map();
  for (const [id, text] of currentTextById) {
    segmentsById.set(id, convertToSegments(text));
  }

  renderPreview(els.preview, state.paragraphs, segmentsById);
  state.lastSegmentsById = segmentsById;
  els.exportBtn.disabled = false;
  setStatus('Preview refreshed.');
}

async function doExport() {
  if (!state.lastSegmentsById) {
    setStatus('Click “Refresh” before exporting.', true);
    return;
  }
  setStatus('Building .docx…');
  try {
    if (state.mode === 'docx' && state.zip) {
      const blob = await exportDocx(
        state.zip,
        state.templateXml,
        state.lastSegmentsById,
        state.sourceFontNames.length ? state.sourceFontNames : ['Nirmala UI', 'Noto Sans Devanagari']
      );
      downloadBlob(blob, 'krutidev-035-converted.docx');
    } else {
      const text = state.paragraphs
        .map((p) =>
          p.runs
            .map((r) => (state.lastSegmentsById.get(r.id) ?? []).map((s) => s.text).join(''))
            .join('')
        )
        .join('\n');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      downloadBlob(blob, 'krutidev-035-converted.txt');
    }
    setStatus('Download ready.');
  } catch (err) {
    console.error(err);
    setStatus(`Export failed: ${err.message}`, true);
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function checkFont() {
  await waitForFontsReady();
  const installed = isKrutiDevInstalled();
  els.fontBanner.hidden = installed;
  return installed;
}

function wireEvents() {
  els.uploadBtn.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  });

  els.pasteBtn.addEventListener('click', () => {
    els.pasteOverlay.hidden = false;
    els.pasteArea.focus();
  });
  els.pasteCancel.addEventListener('click', () => {
    els.pasteOverlay.hidden = true;
  });
  // Escape key and clicking the dark backdrop also dismiss the modal.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.pasteOverlay.hidden) {
      els.pasteOverlay.hidden = true;
    }
  });
  els.pasteOverlay.addEventListener('click', (e) => {
    if (e.target === els.pasteOverlay) els.pasteOverlay.hidden = true;
  });
  els.pasteConfirm.addEventListener('click', () => {
    const text = els.pasteArea.value;
    els.pasteOverlay.hidden = true;
    if (text.trim()) loadPlainText(text);
  });

  els.refreshBtn.addEventListener('click', doRefresh);
  els.exportBtn.addEventListener('click', doExport);

  // drag & drop onto the editor pane
  els.editor.addEventListener('dragover', (e) => e.preventDefault());
  els.editor.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  });
}

function init() {
  cacheElements();
  wireEvents();
  checkFont();
  setStatus('Upload a .docx or paste Marathi text to begin.');
}

document.addEventListener('DOMContentLoaded', init);
