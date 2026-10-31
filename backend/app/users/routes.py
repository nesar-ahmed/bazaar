from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.users import service
from app.users.models import User
from app.users.schemas import (
    ChangePassword,
    LoginRequest,
    RefreshRequest,
    TokenRead,
    UserRead,
    UserRegister,
    UserUpdate,
)
from app.users.security import create_access_token, decode_access_token
from app.users.sessions import AuthSession

router = APIRouter(prefix="/api/v1", tags=["users"])
DatabaseSession = Annotated[Session, Depends(get_db)]
bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedContext:
    user: User
    session: AuthSession


@router.post(
    "/users/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
def register(user_data: UserRegister, database: DatabaseSession) -> User:
    try:
        return service.register_user(database, user_data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error


@router.post("/users/login", response_model=TokenRead)
def login(
    user_data: LoginRequest,
    database: DatabaseSession,
    cart_token: Annotated[str | None, Header(alias="X-Cart-Token")] = None,
) -> TokenRead:
    user = service.authenticate_user(
        database, str(user_data.email), user_data.password
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_pair = service.create_auth_session(database, user)
    cart_merge_warnings: list[str] = []
    if cart_token:
        from app.cart.service import merge_guest_cart

        cart_merge_warnings = merge_guest_cart(database, user, cart_token)

    return TokenRead(
        access_token=token_pair.access_token,
        refresh_token=token_pair.refresh_token,
        expires_in=token_pair.expires_in,
        refresh_expires_in=token_pair.refresh_expires_in,
        cart_merge_warnings=cart_merge_warnings,
    )


@router.post("/users/refresh", response_model=TokenRead)
def refresh_tokens(
    payload: RefreshRequest,
    database: DatabaseSession,
) -> TokenRead:
    token_pair = service.rotate_refresh_token(database, payload.refresh_token)
    if token_pair is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenRead(
        access_token=token_pair.access_token,
        refresh_token=token_pair.refresh_token,
        expires_in=token_pair.expires_in,
        refresh_expires_in=token_pair.refresh_expires_in,
    )


def get_current_context(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
    database: DatabaseSession,
) -> AuthenticatedContext:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()
    return resolve_auth_context(credentials.credentials, database)


def get_optional_context(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
    database: DatabaseSession,
) -> AuthenticatedContext | None:
    if credentials is None:
        return None
    if credentials.scheme.lower() != "bearer":
        raise _unauthorized()
    return resolve_auth_context(credentials.credentials, database)


def resolve_auth_context(
    token: str,
    database: Session,
) -> AuthenticatedContext:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        user_id, session_id = decode_access_token(token)
    except jwt.InvalidTokenError as error:
        raise unauthorized from error

    now = datetime.now(timezone.utc)
    auth_session = database.scalar(
        select(AuthSession).where(
            AuthSession.id == session_id,
            AuthSession.user_id == user_id,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > now,
        )
    )
    user = database.get(User, user_id)
    if auth_session is None or user is None or not user.is_active:
        raise unauthorized
    return AuthenticatedContext(user=user, session=auth_session)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


CurrentContext = Annotated[AuthenticatedContext, Depends(get_current_context)]


def get_current_user(context: CurrentContext) -> User:
    return context.user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_admin_user(user: CurrentUser) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required",
        )
    return user


AdminUser = Annotated[User, Depends(get_admin_user)]


@router.post("/users/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(context: CurrentContext, database: DatabaseSession) -> Response:
    service.revoke_session(database, context.session)
    database.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/users/me", response_model=UserRead)
def read_current_user(user: CurrentUser) -> User:
    return user


@router.patch("/users/me", response_model=UserRead)
def update_current_user(
    user_data: UserUpdate,
    user: CurrentUser,
    database: DatabaseSession,
) -> User:
    return service.update_user(database, user, user_data)


@router.post("/users/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePassword,
    user: CurrentUser,
    database: DatabaseSession,
) -> Response:
    try:
        service.change_password(database, user, payload)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
