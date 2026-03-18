from pydantic import BaseModel, constr
from uuid import UUID
from datetime import date, datetime
from typing import Literal

TitleStr = constr(min_length=1, max_length=120)
ProjectStatus = Literal["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"]

class ProjectCreate(BaseModel):
    title: TitleStr
    target_due_date: date

class ProjectUpdate(BaseModel):
    title: TitleStr | None = None
    target_due_date: date | None = None

class ProjectPublic(BaseModel):
    id: UUID
    owner_id: UUID
    title: str
    target_due_date: date
    status: str
    created_at: datetime
    updated_at: datetime
    member_count: int = 0

    class Config:
        from_attributes = True

class ProjectUpdateStatus(BaseModel):
    status: ProjectStatus

