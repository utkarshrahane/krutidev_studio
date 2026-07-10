/**
 * Session persistence — a safety net against losing work to an accidental
 * reload, back-button, or tab close.
 *
 * Design (per product decisions):
 *  - Saves only at "risk moments" (pagehide / visibility-hidden / before the
 *    warn-on-leave dialog), NOT on a continuous timer.
 *  - Stores exactly ONE session; the newest save replaces the last.
 *  - A snapshot holds the original uploaded .docx bytes plus the current
 *    left-pane edits, so a restore brings the editor back exactly as it was.
 *    (Edits alone can't be restored without the document they key into.)
 *
 * Uses IndexedDB (not localStorage) because the snapshot includes the raw
 * .docx bytes, which can exceed localStorage's ~5 MB string limit and are
 * naturally stored as a Blob/ArrayBuffer here.
 */

const DB_NAME = 'krutidev-studio';
const STORE = 'session';
const KEY = 'current'; // single-slot: newest replaces last
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Save (replace) the single session snapshot.
 * @param {object} snapshot
 * @param {ArrayBuffer|null} snapshot.fileBuffer  original .docx bytes (null in paste mode)
 * @param {string} snapshot.fileBaseName
 * @param {string} snapshot.mode  'docx' | 'text'
 * @param {Array<[string,string]>} snapshot.edits  [runId, currentText] pairs
 * @param {number} snapshot.savedAt  epoch ms
 */
export async function saveSession(snapshot) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(snapshot, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch (err) {
    console.warn('Session save failed:', err);
    return false;
  }
}

/** @returns {Promise<object|null>} the saved snapshot, or null if none. */
export async function loadSession() {
  try {
    const db = await openDb();
    const snapshot = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return snapshot;
  } catch (err) {
    console.warn('Session load failed:', err);
    return null;
  }
}

/** Delete the saved session (used by Discard, and after a successful restore). */
export async function clearSession() {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch (err) {
    console.warn('Session clear failed:', err);
    return false;
  }
}

/** Lightweight check for a saved session without pulling the whole blob. */
export async function hasSession() {
  const s = await loadSession();
  return s !== null;
}
