from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta


SESSION_COOKIE_NAME = "safeed_session"
SESSION_DURATION = timedelta(days=14)
PASSWORD_ITERATIONS = 240_000


def hash_password(password: str, salt_hex: str | None = None) -> tuple[str, str]:
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return salt.hex(), digest.hex()


def verify_password(password: str, salt_hex: str, password_hash: str) -> bool:
    _, candidate_hash = hash_password(password, salt_hex)
    return secrets.compare_digest(candidate_hash, password_hash)


def create_session_token() -> str:
    return secrets.token_urlsafe(32)


def digest_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def default_session_expiry() -> datetime:
    return datetime.utcnow() + SESSION_DURATION
