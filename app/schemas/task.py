from pydantic import BaseModel, constr
from uuid import UUID
from datetime import date, datetime
from typing import Literal

TitleStr = constr(min_length=1, max_length=200)

TaskStatus = Literal["TODO", "DOING", "DONE"]
TaskPriority = Literal["LOW", "MEDIUM", "HIGH"]


class TaskCreate(BaseModel):
    title: TitleStr
    description: str | None = None
    due_date: date | None = None
    priority: TaskPriority = "MEDIUM"
    assigned_to_id: UUID | None = None


class TaskPublic(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: str | None
    due_date: date | None
    status: str
    priority: str
    created_by_id: UUID | None = None
    created_by_name: str | None = None
    assigned_to_id: UUID | None = None
    assigned_to_name: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskUpdate(BaseModel):
    title: TitleStr | None = None
    description: str | None = None
    due_date: date | None = None
    assigned_to_id: UUID | None = None


class TaskUpdateStatus(BaseModel):
    status: TaskStatus


class TaskUpdatePriority(BaseModel):
    priority: TaskPriority