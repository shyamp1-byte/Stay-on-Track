from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.repositories.user import get_user_by_email, create_user, update_user, delete_user

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)


def register_user(db: Session, first_name: str, last_name: str, email: str, password: str):
    existing = get_user_by_email(db, email)
    if existing:
        raise ValueError("EMAIL_TAKEN")

    full_name = f"{first_name.strip().title()} {last_name.strip().title()}"
    hashed_password = hash_password(password)
    return create_user(db, full_name=full_name, email=email, hashed_password=hashed_password)


def login_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        raise ValueError("INVALID_CREDENTIALS")

    if not verify_password(password, user.hashed_password):
        raise ValueError("INVALID_CREDENTIALS")

    return user


def update_profile(db, user, full_name: str | None = None, email: str | None = None):
    from app.repositories.user import get_user_by_email
    if email and email != user.email:
        existing = get_user_by_email(db, email)
        if existing:
            raise ValueError("EMAIL_TAKEN")
    return update_user(db, user, full_name=full_name, email=email)


def change_password(db, user, current_password: str, new_password: str):
    if not verify_password(current_password, user.hashed_password):
        raise ValueError("WRONG_PASSWORD")
    return update_user(db, user, hashed_password=hash_password(new_password))


def delete_account(db, user):
    delete_user(db, user)