from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.password_reset_token import PasswordResetToken


def create_token(
    db: Session, user_id: UUID, token_hash: str, expires_at: datetime
) -> PasswordResetToken:
    row = PasswordResetToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_by_hash(db: Session, token_hash: str) -> PasswordResetToken | None:
    return db.query(PasswordResetToken).filter_by(token_hash=token_hash).first()


def mark_used(db: Session, token: PasswordResetToken, used_at: datetime) -> None:
    token.used_at = used_at
    db.commit()
