import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from data import filter_packs, get_pack_by_slug, list_genres


HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))


class ApiHandler(BaseHTTPRequestHandler):
    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == "/api/health":
            return self._send_json(
                {
                    "ok": True,
                    "service": "smooth-samples-backend",
                    "version": 1,
                }
            )

        if path in ("/", "/api"):
            return self._send_json(
                {
                    "ok": True,
                    "service": "smooth-samples-backend",
                    "endpoints": [
                        "/api/health",
                        "/api/genres",
                        "/api/packs",
                        "/api/packs/<slug>",
                    ],
                }
            )

        if path == "/api/genres":
            return self._send_json({"items": list_genres()})

        if path == "/api/packs":
            genre = query.get("genre", [None])[0]
            q = query.get("q", [None])[0]
            featured_raw = query.get("featured", [None])[0]

            featured = None
            if featured_raw is not None:
                featured = featured_raw.lower() in ("1", "true", "yes")

            items = filter_packs(genre=genre, featured=featured, q=q)
            return self._send_json({"count": len(items), "items": items})

        if path.startswith("/api/packs/"):
            slug = path.removeprefix("/api/packs/")
            pack = get_pack_by_slug(slug)
            if pack is None:
                return self._send_json({"error": "Pack not found"}, status=404)
            return self._send_json(pack)

        return self._send_json({"error": "Not found"}, status=404)

    def log_message(self, format, *args):
        return


def run():
    server = ThreadingHTTPServer((HOST, PORT), ApiHandler)
    print(f"Smooth Samples API running on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run()
