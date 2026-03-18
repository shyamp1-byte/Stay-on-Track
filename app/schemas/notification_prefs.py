from pydantic import BaseModel


class NotificationPrefsPublic(BaseModel):
    task_assigned: bool
    due_date_reminder: bool
    project_updates: bool
    weekly_digest: bool

    model_config = {"from_attributes": True}


class NotificationPrefsUpdate(BaseModel):
    task_assigned: bool | None = None
    due_date_reminder: bool | None = None
    project_updates: bool | None = None
    weekly_digest: bool | None = None
