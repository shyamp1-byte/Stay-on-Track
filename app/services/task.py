from sqlalchemy.orm import Session
from uuid import UUID

from app.repositories import task as task_repo
from app.repositories import project as project_repo
from app.repositories import member as member_repo

from datetime import date


def _require_participant(db: Session, project, user_id: UUID):
    if project.owner_id == user_id:
        return
    if not member_repo.get_member(db, project_id=project.id, user_id=user_id):
        raise ValueError("FORBIDDEN")


def create_task(db: Session, owner_id: UUID, project_id: UUID, title: str, description: str | None, due_date: date | None, priority: str, assigned_to_id: UUID | None = None):
    project = project_repo.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise ValueError("PROJECT_NOT_FOUND")
    _require_participant(db, project, owner_id)

    task = task_repo.create_task(db=db, project_id=project_id, title=title, description=description, due_date=due_date, priority=priority, created_by_id=owner_id, assigned_to_id=assigned_to_id)

    if assigned_to_id and assigned_to_id != owner_id:
        from app.repositories import user as user_repo
        from app.repositories.notification_prefs import get_or_create_prefs
        from app.services.email import send_task_assigned_email
        assignee = user_repo.get_user_by_id(db, assigned_to_id)
        if assignee:
            prefs = get_or_create_prefs(db, assigned_to_id)
            if prefs.task_assigned:
                send_task_assigned_email(
                    to=assignee.email,
                    assignee_name=assignee.full_name,
                    task_title=title,
                    project_name=project.name,
                )

    return task

def get_task(db: Session, owner_id: UUID, project_id: UUID, task_id: UUID):
    project = project_repo.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise ValueError("PROJECT_NOT_FOUND")
    _require_participant(db, project, owner_id)
    task = task_repo.get_task_by_id(db=db, task_id=task_id)
    if not task or task.project_id != project_id:
        raise ValueError("TASK_NOT_FOUND")
    return task

def list_tasks(db: Session, owner_id: UUID, project_id: UUID):
    project = project_repo.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise ValueError("PROJECT_NOT_FOUND")
    _require_participant(db, project, owner_id)

    return task_repo.list_tasks(db=db, project_id=project_id)

def update_task(db: Session, owner_id: UUID, project_id: UUID, task_id: UUID, title: str | None, description: str | None, due_date: date | None, assigned_to_id: UUID | None = None):
    project = project_repo.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise ValueError("PROJECT_NOT_FOUND")
    _require_participant(db, project, owner_id)

    task = task_repo.get_task_by_id(db=db, task_id=task_id)
    if not task or task.project_id != project_id:
        raise ValueError("TASK_NOT_FOUND")

    old_assignee_id = task.assigned_to_id
    updated = task_repo.update_task(db=db, task=task, title=title, description=description, due_date=due_date, assigned_to_id=assigned_to_id)

    new_assignee_id = assigned_to_id
    if (
        new_assignee_id
        and new_assignee_id != old_assignee_id
        and new_assignee_id != owner_id
    ):
        from app.repositories import user as user_repo
        from app.repositories.notification_prefs import get_or_create_prefs
        from app.services.email import send_task_assigned_email
        assignee = user_repo.get_user_by_id(db, new_assignee_id)
        if assignee:
            prefs = get_or_create_prefs(db, new_assignee_id)
            if prefs.task_assigned:
                send_task_assigned_email(
                    to=assignee.email,
                    assignee_name=assignee.full_name,
                    task_title=updated.title,
                    project_name=project.name,
                )

    return updated

def update_task_status(db: Session, owner_id: UUID, project_id: UUID, task_id: UUID, status: str):
    project = project_repo.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise ValueError("PROJECT_NOT_FOUND")
    _require_participant(db, project, owner_id)

    task = task_repo.get_task_by_id(db=db, task_id=task_id)
    if not task or task.project_id != project_id:
        raise ValueError("TASK_NOT_FOUND")

    return task_repo.update_task_status(db=db, task=task, status=status)

def set_task_status(db: Session, owner_id: UUID, task_id: UUID, status: str):
    task = task_repo.get_task_by_id(db=db, task_id=task_id)
    if not task:
        raise ValueError("TASK_NOT_FOUND")

    project = project_repo.get_project_by_id(db=db, project_id=task.project_id)
    if not project:
        raise ValueError("PROJECT_NOT_FOUND")
    _require_participant(db, project, owner_id)

    return task_repo.update_task_status(db=db, task=task, status=status)

def set_task_priority(db: Session, owner_id: UUID, task_id: UUID, priority: str):
    task = task_repo.get_task_by_id(db=db, task_id=task_id)
    if not task:
        raise ValueError("TASK_NOT_FOUND")

    project = project_repo.get_project_by_id(db=db, project_id=task.project_id)
    if not project:
        raise ValueError("PROJECT_NOT_FOUND")
    _require_participant(db, project, owner_id)

    return task_repo.update_task_priority(db=db, task=task, priority=priority)

def delete_task(db: Session, owner_id: UUID, project_id: UUID, task_id: UUID):
    project = project_repo.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise ValueError("PROJECT_NOT_FOUND")
    _require_participant(db, project, owner_id)

    task = task_repo.get_task_by_id(db=db, task_id=task_id)
    if not task or task.project_id != project_id:
        raise ValueError("TASK_NOT_FOUND")

    task_repo.delete_task(db=db, task=task)