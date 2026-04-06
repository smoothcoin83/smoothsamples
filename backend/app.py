import json
import os
import threading
import time
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from data import filter_packs, get_pack_by_slug, list_genres
from store import (
    authenticate_user,
    create_session,
    create_user,
    delete_session,
    get_user_by_session,
    list_orders_by_email,
    save_order,
)


HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
SESSION_COOKIE_NAME = "smoothsamples_session"
ALLOWED_ORIGINS = {
    "https://smoothsamples.com",
    "https://www.smoothsamples.com",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
}
RATE_LIMIT_RULES = {
    "/api/auth/register": {"limit": 6, "window": 15 * 60},
    "/api/auth/login": {"limit": 12, "window": 15 * 60},
    "/api/orders": {"limit": 20, "window": 5 * 60},
}
RATE_LIMITS = {}
RATE_LIMIT_LOCK = threading.Lock()


class ApiHandler(BaseHTTPRequestHandler):
    def _origin(self):
        return self.headers.get("Origin")

    def _allowed_origin(self):
        origin = self._origin()
        if origin in ALLOWED_ORIGINS:
            return origin
        return None

    def _apply_cors_headers(self):
        allowed_origin = self._allowed_origin()
        if allowed_origin:
            self.send_header("Access-Control-Allow-Origin", allowed_origin)
            self.send_header("Access-Control-Allow-Credentials", "true")
            self.send_header("Vary", "Origin")

    def _send_json(self, payload, status=200, extra_headers=None):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._apply_cors_headers()

        for name, value in (extra_headers or []):
            self.send_header(name, value)

        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}

        raw_body = self.rfile.read(length)
        try:
            return json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None

    def _parse_cookies(self):
        raw = self.headers.get("Cookie", "")
        jar = cookies.SimpleCookie()
        jar.load(raw)
        return {key: morsel.value for key, morsel in jar.items()}

    def _current_user(self):
        session_id = self._parse_cookies().get(SESSION_COOKIE_NAME)
        if not session_id:
            return None
        return get_user_by_session(session_id)

    def _require_user(self):
        user = self._current_user()
        if not user:
            self._send_json({"error": "Authentication required"}, status=401)
            return None
        return user

    def _client_identifier(self):
        forwarded_for = self.headers.get("X-Forwarded-For", "")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        return self.client_address[0]

    def _check_rate_limit(self, path):
        rule = RATE_LIMIT_RULES.get(path)
        if not rule:
            return True

        identifier = self._client_identifier()
        now = time.time()
        key = (path, identifier)

        with RATE_LIMIT_LOCK:
            attempts = [entry for entry in RATE_LIMITS.get(key, []) if now - entry < rule["window"]]
            if len(attempts) >= rule["limit"]:
                return False

            attempts.append(now)
            RATE_LIMITS[key] = attempts
            return True

    def _session_cookie_header(self, session_id):
        origin = self._origin() or ""
        secure = origin.startswith("https://")
        same_site = "None" if secure else "Lax"
        parts = [
            f"{SESSION_COOKIE_NAME}={session_id}",
            "Path=/",
            f"Max-Age={60 * 60 * 24 * 30}",
            "HttpOnly",
            f"SameSite={same_site}",
        ]
        if secure:
            parts.append("Secure")
        return "; ".join(parts)

    def _clear_session_cookie_header(self):
        origin = self._origin() or ""
        secure = origin.startswith("https://")
        same_site = "None" if secure else "Lax"
        parts = [
            f"{SESSION_COOKIE_NAME}=",
            "Path=/",
            "Max-Age=0",
            "HttpOnly",
            f"SameSite={same_site}",
        ]
        if secure:
            parts.append("Secure")
        return "; ".join(parts)

    def do_OPTIONS(self):
        self.send_response(204)
        self._apply_cors_headers()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
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
                        "/api/auth/register",
                        "/api/auth/login",
                        "/api/auth/me",
                        "/api/auth/logout",
                        "/api/orders",
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

        if path == "/api/auth/me":
            user = self._current_user()
            return self._send_json({"user": user})

        if path == "/api/orders":
            user = self._require_user()
            if not user:
                return
            return self._send_json({"items": list_orders_by_email(user["email"])})

        return self._send_json({"error": "Not found"}, status=404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if not self._check_rate_limit(path):
            return self._send_json({"error": "Too many requests. Please try again later."}, status=429)

        payload = self._read_json()
        if payload is None:
            return self._send_json({"error": "Invalid JSON payload"}, status=400)

        if path == "/api/auth/register":
            try:
                user = create_user(
                    payload.get("fullName"),
                    payload.get("email"),
                    payload.get("password"),
                    payload.get("createdAt"),
                )
                session = create_session(user["email"])
            except ValueError as error:
                return self._send_json({"error": str(error)}, status=400)

            return self._send_json(
                {"user": user},
                status=201,
                extra_headers=[("Set-Cookie", self._session_cookie_header(session["id"]))],
            )

        if path == "/api/auth/login":
            try:
                user = authenticate_user(payload.get("email"), payload.get("password"))
                session = create_session(user["email"])
            except ValueError as error:
                return self._send_json({"error": str(error)}, status=400)

            return self._send_json(
                {"user": user},
                extra_headers=[("Set-Cookie", self._session_cookie_header(session["id"]))],
            )

        if path == "/api/auth/logout":
            session_id = self._parse_cookies().get(SESSION_COOKIE_NAME)
            if session_id:
                delete_session(session_id)
            return self._send_json(
                {"ok": True},
                extra_headers=[("Set-Cookie", self._clear_session_cookie_header())],
            )

        if path == "/api/orders":
            user = self._require_user()
            if not user:
                return

            order = dict(payload or {})
            customer = dict(order.get("customer") or {})
            customer["email"] = user["email"]
            if not customer.get("fullName"):
                customer["fullName"] = user["fullName"]
            order["customer"] = customer
            save_order(order)
            return self._send_json({"ok": True}, status=201)

        return self._send_json({"error": "Not found"}, status=404)

    def log_message(self, format, *args):
        return


def run():
    server = ThreadingHTTPServer((HOST, PORT), ApiHandler)
    print(f"Smooth Samples API running on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run()
