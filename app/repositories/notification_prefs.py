from uuid import UUID

from sqlalchemy.orm import Session

from app.models.notification_prefs import NotificationPrefs


def get_or_create_prefs(db: Session, user_id: UUID) -> NotificationPrefs:
    prefs = db.query(NotificationPrefs).filter_by(user_id=user_id).first()
    if not prefs:
        prefs = NotificationPrefs(user_id=user_id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


def update_prefs(db: Session, user_id: UUID, **kwargs) -> NotificationPrefs:
    prefs = get_or_create_prefs(db, user_id)
    for key, value in kwargs.items():
        if hasattr(prefs, key):
            setattr(prefs, key, value)
    db.commit()
    db.refresh(prefs)
    return prefs
