from sqlalchemy import Column, Date, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.db import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    due_date = Column(Date, nullable=True)

    status = Column(String, nullable=False, default="TODO")
    priority = Column(String, nullable=False, default="MEDIUM")

    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    created_by_user = relationship("User", foreign_keys=[created_by_id], lazy="joined")
    assigned_to_user = relationship("User", foreign_keys=[assigned_to_id], lazy="joined")

    @property
    def created_by_name(self) -> str | None:
        return self.created_by_user.full_name if self.created_by_user else None

    @property
    def assigned_to_name(self) -> str | None:
        return self.assigned_to_user.full_name if self.assigned_to_user else None