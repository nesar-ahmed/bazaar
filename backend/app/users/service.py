from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.users.models import User
from app.users.schemas import UserRegister, UserUpdate
from app.users.security import DUMMY_PASSWORD_HASH, hash_password, verify_password


def register_user(database: Session, user_data: UserRegister) -> User:
    user = User(
        email=str(user_data.email).lower(),
        full_name=user_data.full_name,
        hashed_password=hash_password(user_data.password),
    )
    database.add(user)
    try:
        database.commit()
    except IntegrityError:
        database.rollback()
        raise ValueError("An account with this email already exists") from None
    database.refresh(user)
    return user


def authenticate_user(database: Session, email: str, password: str) -> User | None:
    user = database.scalar(select(User).where(User.email == email.lower()))
    if user is None:
        verify_password(password, DUMMY_PASSWORD_HASH)
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


def update_user(database: Session, user: User, user_data: UserUpdate) -> User:
    user.full_name = user_data.full_name
    database.commit()
    database.refresh(user)
    return user
