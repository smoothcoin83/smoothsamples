import hashlib
import json
import os
import secrets
import sqlite3
import threading
import time


BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, "store.db")
LEGACY_JSON_PATH = os.path.join(BASE_DIR, "store.json")
STORE_LOCK = threading.Lock()
PBKDF2_ITERATIONS = 600000
SESSION_TTL_SECONDS = 60 * 60 * 24 * 30


def _normalize_email(email):
    return str(email or "").strip().lower()


def _hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        str(password).encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    )
    return {"salt": salt, "hash": digest.hex()}


def _public_user(row):
    return {
        "fullName": row["full_name"],
        "email": row["email"],
        "createdAt": row["created_at"],
    }


def _connect():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def _init_db(connection):
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS orders (
            order_id TEXT PRIMARY KEY,
            customer_email TEXT NOT NULL,
            created_at TEXT NOT NULL,
            payload_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_orders_customer_email
        ON orders(customer_email);

        CREATE INDEX IF NOT EXISTS idx_sessions_email
        ON sessions(email);
        """
    )
    connection.commit()


def _read_legacy_store():
    if not os.path.exists(LEGACY_JSON_PATH):
        return {"users": [], "orders": []}

    try:
        with open(LEGACY_JSON_PATH, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {"users": [], "orders": []}

    return {
        "users": data.get("users", []),
        "orders": data.get("orders", []),
    }


def _migrate_legacy_store(connection):
    legacy = _read_legacy_store()
    if not legacy["users"] and not legacy["orders"]:
        return

    existing_users = connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
    existing_orders = connection.execute("SELECT COUNT(*) AS count FROM orders").fetchone()["count"]
    if existing_users or existing_orders:
        return

    for user in legacy["users"]:
        email = _normalize_email(user.get("email"))
        if not email:
            continue

        connection.execute(
            """
            INSERT OR IGNORE INTO users (email, full_name, created_at, password_hash, password_salt)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                email,
                user.get("fullName", "").strip() or email,
                user.get("createdAt") or "",
                user.get("passwordHash") or "",
                user.get("passwordSalt") or "",
            ),
        )

    for order in legacy["orders"]:
        order_id = str(order.get("id") or "").strip()
        customer_email = _normalize_email(order.get("customer", {}).get("email"))
        if not order_id or not customer_email:
            continue

        connection.execute(
            """
            INSERT OR REPLACE INTO orders (order_id, customer_email, created_at, payload_json)
            VALUES (?, ?, ?, ?)
            """,
            (
                order_id,
                customer_email,
                order.get("createdAt") or "",
                json.dumps(order, ensure_ascii=True),
            ),
        )

    connection.commit()


def _delete_expired_sessions(connection):
    connection.execute(
        "DELETE FROM sessions WHERE expires_at <= ?",
        (int(time.time()),),
    )
    connection.commit()


def _ensure_store():
    with STORE_LOCK:
        connection = _connect()
        try:
            _init_db(connection)
            _migrate_legacy_store(connection)
            _delete_expired_sessions(connection)
        finally:
            connection.close()


def create_user(full_name, email, password, created_at):
    _ensure_store()

    full_name = str(full_name or "").strip()
    email = _normalize_email(email)
    password = str(password or "")
    created_at = str(created_at or "")

    if not full_name or not email or not password:
        raise ValueError("Please complete all fields.")

    password_data = _hash_password(password)

    with STORE_LOCK:
        connection = _connect()
        try:
            existing = connection.execute(
                "SELECT email FROM users WHERE email = ?",
                (email,),
            ).fetchone()
            if existing:
                raise ValueError("An account with this email already exists.")

            connection.execute(
                """
                INSERT INTO users (email, full_name, created_at, password_hash, password_salt)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    email,
                    full_name,
                    created_at,
                    password_data["hash"],
                    password_data["salt"],
                ),
            )
            connection.commit()

            row = connection.execute(
                "SELECT email, full_name, created_at FROM users WHERE email = ?",
                (email,),
            ).fetchone()
            return _public_user(row)
        finally:
            connection.close()


def authenticate_user(email, password):
    _ensure_store()

    email = _normalize_email(email)
    password = str(password or "")

    with STORE_LOCK:
        connection = _connect()
        try:
            row = connection.execute(
                """
                SELECT email, full_name, created_at, password_hash, password_salt
                FROM users
                WHERE email = ?
                """,
                (email,),
            ).fetchone()
        finally:
            connection.close()

    if not row:
        raise ValueError("Incorrect email or password.")

    password_data = _hash_password(password, salt=row["password_salt"])
    if password_data["hash"] != row["password_hash"]:
        raise ValueError("Incorrect email or password.")

    return _public_user(row)


def create_session(email):
    _ensure_store()

    normalized = _normalize_email(email)
    if not normalized:
        raise ValueError("Invalid user session.")

    created_at = int(time.time())
    expires_at = created_at + SESSION_TTL_SECONDS
    session_id = secrets.token_urlsafe(32)

    with STORE_LOCK:
        connection = _connect()
        try:
            connection.execute(
                """
                INSERT INTO sessions (session_id, email, created_at, expires_at)
                VALUES (?, ?, ?, ?)
                """,
                (session_id, normalized, created_at, expires_at),
            )
            connection.commit()
        finally:
            connection.close()

    return {
        "id": session_id,
        "expiresAt": expires_at,
    }


def get_user_by_session(session_id):
    _ensure_store()

    session_id = str(session_id or "").strip()
    if not session_id:
        return None

    now = int(time.time())

    with STORE_LOCK:
        connection = _connect()
        try:
            row = connection.execute(
                """
                SELECT users.email, users.full_name, users.created_at, sessions.expires_at
                FROM sessions
                JOIN users ON users.email = sessions.email
                WHERE sessions.session_id = ?
                """,
                (session_id,),
            ).fetchone()

            if not row:
                return None

            if row["expires_at"] <= now:
                connection.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
                connection.commit()
                return None

            return _public_user(row)
        finally:
            connection.close()


def delete_session(session_id):
    _ensure_store()

    session_id = str(session_id or "").strip()
    if not session_id:
        return

    with STORE_LOCK:
        connection = _connect()
        try:
            connection.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
            connection.commit()
        finally:
            connection.close()


def save_order(order):
    _ensure_store()

    if not isinstance(order, dict) or not order.get("id"):
        return

    order_id = str(order.get("id")).strip()
    customer_email = _normalize_email(order.get("customer", {}).get("email"))
    created_at = str(order.get("createdAt") or "")
    if not order_id or not customer_email:
        return

    with STORE_LOCK:
        connection = _connect()
        try:
            connection.execute(
                """
                INSERT OR REPLACE INTO orders (order_id, customer_email, created_at, payload_json)
                VALUES (?, ?, ?, ?)
                """,
                (
                    order_id,
                    customer_email,
                    created_at,
                    json.dumps(order, ensure_ascii=True),
                ),
            )
            connection.commit()
        finally:
            connection.close()


def list_orders_by_email(email):
    _ensure_store()

    normalized = _normalize_email(email)
    if not normalized:
        return []

    with STORE_LOCK:
        connection = _connect()
        try:
            rows = connection.execute(
                """
                SELECT payload_json
                FROM orders
                WHERE customer_email = ?
                ORDER BY created_at DESC, order_id DESC
                """,
                (normalized,),
            ).fetchall()
        finally:
            connection.close()

    orders = []
    for row in rows:
        try:
            orders.append(json.loads(row["payload_json"]))
        except json.JSONDecodeError:
            continue
    return orders
