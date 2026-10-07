"""Local dev server for Energy for AI: serves this folder with caching turned off,
so edits to the JS modules show up on a normal reload. Run: python3 scripts/serve.py [port]"""
import http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

os.chdir(os.path.join(os.path.dirname(__file__), ".."))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f"Energy for AI: http://localhost:{port}")
http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCache).serve_forever()
