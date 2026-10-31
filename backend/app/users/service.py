import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.users.models import User
from app.users.schemas import ChangePassword, UserRegister, UserUpdate
from app.users.security import (
    DUMMY_PASSWORD_HASH,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.users.sessions import AuthSession, RefreshToken


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str
    expires_in: int
    refresh_expires_in: int


def register_user(database: Session, user_data: UserRegister) -> User:
    email = str(user_data.email).lower()
    admin_email = str(settings.admin_email).lower() if settings.admin_email else None
    user = User(
        email=email,
        full_name=user_data.full_name,
        hashed_password=hash_password(user_data.password),
        role="admin" if email == admin_email else "customer",
    )
    database.add(user)
    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise ValueError("An account with this email already exists") from error
    database.refresh(user)
    return user


def authenticate_user(database: Session, email: str, password: str) -> User | None:
    user = database.scalar(select(User).where(User.email == email.lower()))
    if user is None:
        verify_password(password, DUMMY_PASSWORD_HASH)
        return None
    if not verify_password(password, user.hashed_password) or not user.is_active:
        return None
    return user


def create_auth_session(database: Session, user: User) -> TokenPair:
    now = datetime.now(timezone.utc)
    session_expires_at = now + timedelta(days=settings.auth_session_expire_days)
    refresh_expires_at = min(
        now + timedelta(days=settings.refresh_token_expire_days),
        session_expires_at,
    )
    session_id = secrets.token_urlsafe(32)
    refresh_token = generate_refresh_token()
    auth_session = AuthSession(
        id=session_id,
        user_id=user.id,
        expires_at=session_expires_at,
    )
    database.add(auth_session)
    database.add(
        RefreshToken(
            session_id=session_id,
            token_hash=hash_refresh_token(refresh_token),
            expires_at=refresh_expires_at,
        )
    )
    database.commit()
    return _token_pair(user.id, session_id, refresh_token, refresh_expires_at)


def rotate_refresh_token(database: Session, refresh_token: str) -> TokenPair | None:
    token_hash = hash_refresh_token(refresh_token)
    token_record = database.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    if token_record is None:
        return None

    auth_session = database.get(AuthSession, token_record.session_id)
    if auth_session is None:
        return None

    now = datetime.now(timezone.utc)
    if token_record.consumed_at is not None:
        revoke_session(database, auth_session, now)
        database.commit()
        return None
    if token_record.revoked_at is not None:
        return None

    consumed = database.execute(
        update(RefreshToken)
        .where(
            RefreshToken.id == token_record.id,
            RefreshToken.consumed_at.is_(None),
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > now,
        )
        .values(consumed_at=now)
        .execution_options(synchronize_session=False)
    )
    if consumed.rowcount != 1:
        database.refresh(token_record)
        if token_record.consumed_at is not None:
            revoke_session(database, auth_session, now)
            database.commit()
        else:
            database.rollback()
        return None

    active_session = database.scalar(
        select(AuthSession).where(
            AuthSession.id == auth_session.id,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > now,
        )
    )
    if active_session is None:
        database.rollback()
        return None

    next_refresh_token = generate_refresh_token()
    next_expiry = min(
        now + timedelta(days=settings.refresh_token_expire_days),
        _as_utc(auth_session.expires_at),
    )
    database.add(
        RefreshToken(
            session_id=auth_session.id,
            token_hash=hash_refresh_token(next_refresh_token),
            expires_at=next_expiry,
        )
    )
    database.commit()
    return _token_pair(
        auth_session.user_id,
        auth_session.id,
        next_refresh_token,
        next_expiry,
    )


def revoke_session(database: Session, auth_session: AuthSession, now=None) -> None:
    revoked_at = now or datetime.now(timezone.utc)
    auth_session.revoked_at = revoked_at
    database.execute(
        update(RefreshToken)
        .where(
            RefreshToken.session_id == auth_session.id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=revoked_at)
    )


def revoke_all_sessions(database: Session, user_id: int) -> None:
    now = datetime.now(timezone.utc)
    database.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    database.execute(
        update(RefreshToken)
        .where(
            RefreshToken.session_id.in_(
                select(AuthSession.id).where(AuthSession.user_id == user_id)
            ),
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )


def change_password(
    database: Session, user: User, payload: ChangePassword
) -> None:
    if not verify_password(payload.current_password, user.hashed_password):
        raise ValueError("Current password is incorrect")
    if verify_password(payload.new_password, user.hashed_password):
        raise ValueError("New password must be different from the current password")
    user.hashed_password = hash_password(payload.new_password)
    revoke_all_sessions(database, user.id)
    database.commit()
    database.refresh(user)


def update_user(database: Session, user: User, user_data: UserUpdate) -> User:
    user.full_name = user_data.full_name
    database.commit()
    database.refresh(user)
    return user


def bootstrap_admin(database: Session) -> None:
    if not settings.admin_email:
        return
    admin_email = str(settings.admin_email).lower()
    user = database.scalar(select(User).where(User.email == admin_email))
    if user is not None and user.role != "admin":
        user.role = "admin"
        database.commit()


def _token_pair(
    user_id: int,
    session_id: str,
    refresh_token: str,
    refresh_expires_at: datetime,
) -> TokenPair:
    refresh_expires_in = max(
        0, int((refresh_expires_at - datetime.now(timezone.utc)).total_seconds())
    )
    from app.users.security import create_access_token

    return TokenPair(
        access_token=create_access_token(user_id, session_id),
        refresh_token=refresh_token,
        expires_in=settings.access_token_expire_minutes * 60,
        refresh_expires_in=refresh_expires_in,
    )


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
