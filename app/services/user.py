import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.repositories.user import get_user_by_email, get_user_by_id, create_user, update_user, delete_user

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


def forgot_password(db: Session, email: str) -> None:
    user = get_user_by_email(db, email)
    if not user:
        return  # Silently succeed — never reveal whether an email exists

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    from app.repositories.password_reset_token import create_token
    create_token(db, user_id=user.id, token_hash=token_hash, expires_at=expires_at)

    from app.services.email import send_password_reset_email
    send_password_reset_email(to=user.email, full_name=user.full_name, reset_token=raw_token)


def reset_password(db: Session, token: str, new_password: str) -> None:
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    from app.repositories.password_reset_token import get_by_hash, mark_used
    row = get_by_hash(db, token_hash)

    if not row:
        raise ValueError("INVALID_TOKEN")
    if row.used_at is not None:
        raise ValueError("TOKEN_USED")

    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise ValueError("TOKEN_EXPIRED")

    user = get_user_by_id(db, row.user_id)
    if not user:
        raise ValueError("INVALID_TOKEN")

    update_user(db, user, hashed_password=hash_password(new_password))
    mark_used(db, row, used_at=datetime.now(timezone.utc))


def get_or_create_google_user(db: Session, email: str, full_name: str):
    user = get_user_by_email(db, email)
    if user:
        return user
    # New Google-authenticated user: assign a random unguessable placeholder password.
    # They can set a real password via forgot-password if needed.
    placeholder = hash_password(secrets.token_hex(32))
    return create_user(db, full_name=full_name, email=email, hashed_password=placeholder)
