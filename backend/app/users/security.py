import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

password_hash = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hash.hash("unusable-dummy-password")
JWT_ALGORITHM = "HS256"
JWT_ISSUER = "bazaar-api"
JWT_AUDIENCE = "bazaar-api"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(user_id: int, session_id: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    return jwt.encode(
        {
            "sub": str(user_id),
            "sid": session_id,
            "exp": expires_at,
            "iat": datetime.now(timezone.utc),
            "iss": JWT_ISSUER,
            "aud": JWT_AUDIENCE,
        },
        settings.jwt_secret_key,
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> tuple[int, str]:
    payload = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[JWT_ALGORITHM],
        issuer=JWT_ISSUER,
        audience=JWT_AUDIENCE,
        options={"require": ["sub", "sid", "exp", "iat", "iss", "aud"]},
    )
    subject = payload.get("sub")
    session_id = payload.get("sid")
    if not isinstance(subject, str) or not subject.isdecimal():
        raise jwt.InvalidTokenError("Invalid token subject")
    if not isinstance(session_id, str) or not session_id:
        raise jwt.InvalidTokenError("Invalid token session")
    return int(subject), session_id
