import hashlib, secrets
from datetime import datetime, timedelta, timezone
import jwt
from pwdlib import PasswordHash
from app.core.config import settings

password_hash = PasswordHash.recommended()

def hash_password(value: str) -> str: return password_hash.hash(value)
def verify_password(value: str, hashed: str) -> bool: return password_hash.verify(value, hashed)
def create_access_token(user_id: int) -> str:
    if not settings.secret_key or len(settings.secret_key) < 32:
        raise RuntimeError("Set SECRET_KEY to a random value of at least 32 characters")
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(user_id), "type": "access", "iat": now, "exp": now + timedelta(minutes=settings.access_token_minutes)}, settings.secret_key, algorithm="HS256")
def decode_access_token(token: str) -> int:
    data = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    if data.get("type") != "access": raise jwt.InvalidTokenError("Wrong token type")
    return int(data["sub"])
def new_refresh_token() -> tuple[str, str, datetime]:
    raw = secrets.token_urlsafe(48)
    return raw, hashlib.sha256(raw.encode()).hexdigest(), datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_days)
def hash_token(raw: str) -> str: return hashlib.sha256(raw.encode()).hexdigest()
