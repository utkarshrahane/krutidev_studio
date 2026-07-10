/**
 * Session persistence via the launcher's on-disk recovery API.
 *
 * Writes a REAL FILE to disk through the local launcher server, so work
 * survives a reload, a crash, or a power loss. The recovery file lives in a
 * visible `recovery/` folder next to the app; one active document at a time
 * (newest replaces last), deleted once the user saves/exports a real file.
 *
 * IMPORTANT design detail: the original .docx bytes can be large (hundreds of
 * KB+). They are sent to the server ONCE per document (saveDocBytes), not on
 * every autosave. Frequent autosaves send only the small edits payload
 * (saveEdits), which keeps each autosave tiny and fast. We never use fetch
 * `keepalive` for large bodies — the browser caps keepalive requests at 64KB,
 * which was causing every save to hang.
 */

const BASE = '/api/recovery';

function arrayBufferToBase64(buffer) {
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64) {
  if (!b64) return null;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Full save: sends doc bytes + metadata + edits. Used when a document is
 * first loaded/restored (once), not on the frequent autosave tick.
 * @returns {Promise<boolean>}
 */
export async function saveSession(snapshot) {
  try {
    const payload = {
      fileBufferB64: arrayBufferToBase64(snapshot.fileBuffer),
      fileBaseName: snapshot.fileBaseName,
      mode: snapshot.mode,
      edits: snapshot.edits,
      savedAt: snapshot.savedAt,
    };
    const res = await fetch(`${BASE}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn('Recovery save failed:', err);
    return false;
  }
}

/**
 * Lightweight save: sends ONLY the edits (+ timestamp). The server merges
 * these into the existing recovery file, keeping the already-stored doc bytes.
 * This is what the frequent autosave uses, so each tick is tiny.
 * @param {Array<[string,string]>} edits
 * @param {boolean} onUnload  use keepalive (only safe because this body is small)
 * @returns {Promise<boolean>}
 */
export async function saveEdits(edits, onUnload = false) {
  try {
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edits, savedAt: Date.now() }),
    };
    if (onUnload) opts.keepalive = true; // small payload, safe under 64KB
    const res = await fetch(`${BASE}/save-edits`, opts);
    return res.ok;
  } catch (err) {
    console.warn('Recovery edits-save failed:', err);
    return false;
  }
}

/** @returns {Promise<object|null>} snapshot with fileBuffer rehydrated, or null. */
export async function loadSession() {
  try {
    const res = await fetch(`${BASE}/load`);
    if (res.status === 204) return null;
    if (!res.ok) return null;
    const payload = await res.json();
    return {
      fileBuffer: base64ToArrayBuffer(payload.fileBufferB64),
      fileBaseName: payload.fileBaseName,
      mode: payload.mode,
      edits: payload.edits || [],
      savedAt: payload.savedAt,
    };
  } catch (err) {
    console.warn('Recovery load failed:', err);
    return null;
  }
}

/** Delete the recovery file (Discard, and after a successful save/export). */
export async function clearSession() {
  try {
    const res = await fetch(`${BASE}/clear`, { method: 'POST' });
    return res.ok;
  } catch (err) {
    console.warn('Recovery clear failed:', err);
    return false;
  }
}
