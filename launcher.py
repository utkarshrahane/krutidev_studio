import http.server
import socketserver
import webbrowser
import threading
import os
import sys

# When frozen by PyInstaller, the static files get bundled next to the exe.
# sys._MEIPASS is the temp folder PyInstaller extracts into at runtime;
# fall back to the script's own folder when running normally.
if getattr(sys, "frozen", False):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    # Silence the per-request console logging so the window stays clean.
    def log_message(self, *args):
        pass

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
    port = find_free_port(PORT)
    url = f"http://127.0.0.1:{port}/index.html"

    httpd = socketserver.TCPServer(("127.0.0.1", port), Handler)

    # Open the browser shortly after the server starts listening.
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()

    print(f"KrutiDev Studio is running at {url}")
    print("Keep this window open while you use the app.")
    print("Close this window to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()

if __name__ == "__main__":
    main()
    