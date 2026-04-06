import hashlib
import json
import os
import secrets
import threading


STORE_PATH = os.path.join(os.path.dirname(__file__), "store.json")
STORE_LOCK = threading.Lock()


def _default_store():
    return {"users": [], "orders": []}


def _read_store():
    if not os.path.exists(STORE_PATH):
        return _default_store()

    try:
        with open(STORE_PATH, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return _default_store()

    return {
        "users": data.get("users", []),
        "orders": data.get("orders", []),
    }


def _write_store(data):
    with open(STORE_PATH, "w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=True, indent=2)


def _normalize_email(email):
    return str(email or "").strip().lower()


def _hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        str(password).encode("utf-8"),
        salt.encode("utf-8"),
        120000,
    )
    return {"salt": salt, "hash": digest.hex()}


def _public_user(user):
    return {
        "fullName": user["fullName"],
        "email": user["email"],
        "createdAt": user["createdAt"],
    }


def create_user(full_name, email, password, created_at):
    full_name = str(full_name or "").strip()
    email = _normalize_email(email)
    password = str(password or "")

    if not full_name or not email or not password:
        raise ValueError("Please complete all fields.")

    with STORE_LOCK:
        data = _read_store()
        if any(_normalize_email(user.get("email")) == email for user in data["users"]):
            raise ValueError("An account with this email already exists.")

        password_data = _hash_password(password)
        user = {
            "fullName": full_name,
            "email": email,
            "createdAt": created_at,
            "passwordHash": password_data["hash"],
            "passwordSalt": password_data["salt"],
        }
        data["users"].append(user)
        _write_store(data)
        return _public_user(user)


def authenticate_user(email, password):
    email = _normalize_email(email)
    password = str(password or "")

    with STORE_LOCK:
        data = _read_store()
        user = next(
            (entry for entry in data["users"] if _normalize_email(entry.get("email")) == email),
            None,
        )

    if not user:
        raise ValueError("Incorrect email or password.")

    password_data = _hash_password(password, salt=user["passwordSalt"])
    if password_data["hash"] != user["passwordHash"]:
        raise ValueError("Incorrect email or password.")

    return _public_user(user)


def save_order(order):
    if not isinstance(order, dict) or not order.get("id"):
        return

    with STORE_LOCK:
        data = _read_store()
        orders = [entry for entry in data["orders"] if entry.get("id") != order["id"]]
        orders.insert(0, order)
        data["orders"] = orders[:100]
        _write_store(data)


def list_orders_by_email(email):
    normalized = _normalize_email(email)
    if not normalized:
        return []

    with STORE_LOCK:
        data = _read_store()
        return [
            order
            for order in data["orders"]
            if _normalize_email(order.get("customer", {}).get("email")) == normalized
        ]
