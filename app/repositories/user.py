from sqlalchemy.orm import Session
from uuid import UUID

from app.models.user import User


def get_user_by_id(db: Session, user_id: UUID):
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, email: str, full_name: str, hashed_password: str):
    user = User(full_name = full_name, email=email, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_user(db: Session, user: User, full_name: str | None = None, email: str | None = None, hashed_password: str | None = None):
    if full_name is not None:
        user.full_name = full_name
    if email is not None:
        user.email = email
    if hashed_password is not None:
        user.hashed_password = hashed_password
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user: User):
    db.delete(user)
    db.commit()