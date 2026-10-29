from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.users import service
from app.users.models import User
from app.users.schemas import LoginRequest, TokenRead, UserRead, UserRegister, UserUpdate
from app.users.security import create_access_token, decode_access_token

router = APIRouter(prefix="/api/v1/users", tags=["users"])
DatabaseSession = Annotated[Session, Depends(get_db)]
bearer_scheme = HTTPBearer(auto_error=False)


@router.post(
    "/register",
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


@router.post("/login", response_model=TokenRead)
def login(user_data: LoginRequest, database: DatabaseSession) -> TokenRead:
    user = service.authenticate_user(
        database, str(user_data.email), user_data.password
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenRead(
        access_token=create_access_token(user.id),
        expires_in=settings.access_token_expire_minutes * 60,
    )


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
    database: DatabaseSession,
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized

    try:
        user_id = decode_access_token(credentials.credentials)
    except jwt.InvalidTokenError as error:
        raise unauthorized from error

    user = database.get(User, user_id)
    if user is None or not user.is_active:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/me", response_model=UserRead)
def read_current_user(user: CurrentUser) -> User:
    return user


@router.patch("/me", response_model=UserRead)
def update_current_user(
    user_data: UserUpdate,
    user: CurrentUser,
    database: DatabaseSession,
) -> User:
    return service.update_user(database, user, user_data)
