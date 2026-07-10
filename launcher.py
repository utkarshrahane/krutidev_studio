"""
KrutiDev Studio launcher + recovery server.

Serves the static web app and adds a tiny recovery API so edits are written
to a REAL FILE ON DISK (not fragile browser storage). This is what makes work
survive an accidental reload, a crash, or a power loss.

Recovery files live in a visible `recovery/` folder next to this launcher
(or next to the .exe when frozen by PyInstaller). One active document at a
time: the newest autosave replaces the last, and the file is deleted once the
user saves/exports a real document.

Endpoints (all under /api/recovery):
  POST   /api/recovery/save     body: JSON snapshot -> writes recovery/session.json
  GET    /api/recovery/load     -> returns the snapshot JSON, or 204 if none
  POST   /api/recovery/clear    -> deletes the recovery file
"""
import http.server
import socketserver
import webbrowser
import threading
import json
import os
import sys

# ---- locate app files (works both as a script and as a PyInstaller exe) ----
if getattr(sys, "frozen", False):
    # PyInstaller extracts bundled files here at runtime.
    BUNDLE_DIR = sys._MEIPASS
    # Put recovery next to the actual executable, so it's visible to the user.
    APP_DIR = os.path.dirname(sys.executable)
else:
    BUNDLE_DIR = os.path.dirname(os.path.abspath(__file__))
    APP_DIR = BUNDLE_DIR

RECOVERY_DIR = os.path.join(APP_DIR, "recovery")
RECOVERY_FILE = os.path.join(RECOVERY_DIR, "session.json")
PORT = 8000
MAX_BODY = 64 * 1024 * 1024  # 64 MB cap for a recovery payload


def ensure_recovery_dir():
    try:
        os.makedirs(RECOVERY_DIR, exist_ok=True)
    except OSError as exc:
        print(f"Warning: could not create recovery folder: {exc}")


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    """Multi-threaded server so the app's background autosave POSTs are
    handled concurrently with page/asset requests. The single-threaded
    default blocks: while one request is in flight, all others queue and
    appear to hang ('pending' forever)."""
    daemon_threads = True     # don't let worker threads block shutdown
    allow_reuse_address = True # quick restarts without 'address in use'


class Handler(http.server.SimpleHTTPRequestHandler):
    # Use HTTP/1.0 semantics: every response closes its connection. This
    # avoids keep-alive stalls where the browser waits on a persistent
    # connection and the request appears to hang ('pending') forever.
    protocol_version = "HTTP/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BUNDLE_DIR, **kwargs)

    # Minimal logging: show API calls in the console so problems are visible.
    def log_message(self, fmt, *args):
        if "/api/" in self.path:
            sys.stderr.write("[recovery] %s %s\n" % (self.command, self.path))

    # ---------- recovery API ----------
    def do_POST(self):
        if self.path == "/api/recovery/save":
            self._handle_save()
        elif self.path == "/api/recovery/save-edits":
            self._handle_save_edits()
        elif self.path == "/api/recovery/clear":
            self._handle_clear()
        else:
            self._send_json(404, {"error": "not found"})

    def do_GET(self):
        if self.path == "/api/recovery/load":
            self._handle_load()
        else:
            # fall back to normal static file serving
            super().do_GET()

    def _handle_save(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            if length <= 0 or length > MAX_BODY:
                self._send_json(400, {"error": "bad length"})
                return
            body = self.rfile.read(length)
            # Validate it's JSON before writing, so we never persist garbage.
            snapshot = json.loads(body.decode("utf-8"))

            ensure_recovery_dir()
            # Atomic write: write to a temp file, then replace. Prevents a
            # half-written recovery file if power is lost mid-write.
            tmp = RECOVERY_FILE + ".tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(snapshot, fh, ensure_ascii=False)
                fh.flush()
                os.fsync(fh.fileno())
            os.replace(tmp, RECOVERY_FILE)

            self._send_json(200, {"ok": True})
        except Exception as exc:  # noqa: BLE001 - must always respond
            import traceback
            traceback.print_exc()
            try:
                self._send_json(500, {"error": str(exc)})
            except Exception:
                pass

    def _handle_save_edits(self):
        """Merge just the edits into the existing recovery file, keeping the
        already-stored doc bytes. Keeps each autosave tiny and fast."""
        try:
            length = int(self.headers.get("Content-Length", 0))
            if length <= 0 or length > MAX_BODY:
                self._send_json(400, {"error": "bad length"})
                return
            body = self.rfile.read(length)
            incoming = json.loads(body.decode("utf-8"))

            if not os.path.exists(RECOVERY_FILE):
                # No base snapshot yet (doc bytes never sent) - nothing to
                # merge into. Report gracefully so the client can full-save.
                self._send_json(409, {"error": "no base snapshot"})
                return

            with open(RECOVERY_FILE, "r", encoding="utf-8") as fh:
                snapshot = json.load(fh)
            snapshot["edits"] = incoming.get("edits", snapshot.get("edits", []))
            snapshot["savedAt"] = incoming.get("savedAt", snapshot.get("savedAt"))

            ensure_recovery_dir()
            tmp = RECOVERY_FILE + ".tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(snapshot, fh, ensure_ascii=False)
                fh.flush()
                os.fsync(fh.fileno())
            os.replace(tmp, RECOVERY_FILE)

            self._send_json(200, {"ok": True})
        except Exception as exc:  # noqa: BLE001
            import traceback
            traceback.print_exc()
            try:
                self._send_json(500, {"error": str(exc)})
            except Exception:
                pass

    def _handle_load(self):
        try:
            if not os.path.exists(RECOVERY_FILE):
                self.send_response(204)  # no content
                self.end_headers()
                return
            with open(RECOVERY_FILE, "r", encoding="utf-8") as fh:
                data = fh.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data.encode("utf-8"))))
            self.end_headers()
            self.wfile.write(data.encode("utf-8"))
        except OSError as exc:
            self._send_json(500, {"error": str(exc)})

    def _handle_clear(self):
        try:
            if os.path.exists(RECOVERY_FILE):
                os.remove(RECOVERY_FILE)
            self._send_json(200, {"ok": True})
        except OSError as exc:
            self._send_json(500, {"error": str(exc)})

    def _send_json(self, status, obj):
        payload = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def find_free_port(start):
    import socket
    port = start
    while port < start + 50:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
        port += 1
    return start


def main():
    ensure_recovery_dir()
    port = find_free_port(PORT)
    url = f"http://127.0.0.1:{port}/index.html"

    # Allow quick restarts without "address already in use".
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)

    threading.Timer(1.0, lambda: webbrowser.open(url)).start()

    print("KrutiDev Studio is running.")
    print(f"  App:      {url}")
    print(f"  Recovery: {RECOVERY_DIR}")
    print("Keep this window open while you use the app. Close it to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()


if __name__ == "__main__":
    main()
