from sqlalchemy import Boolean, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.db import Base


class NotificationPrefs(Base):
    __tablename__ = "notification_prefs"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    task_assigned = Column(Boolean, nullable=False, default=True)
    due_date_reminder = Column(Boolean, nullable=False, default=True)
    project_updates = Column(Boolean, nullable=False, default=False)
    weekly_digest = Column(Boolean, nullable=False, default=False)
