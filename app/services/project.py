from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date

from app.repositories import project as project_repo
from app.repositories import task as task_repo

def create_project(db: Session, owner_id: UUID, title: str, target_due_date: date):
    return project_repo.create_project(db=db, owner_id=owner_id, title=title, target_due_date=target_due_date)

def update_project(db: Session, owner_id: UUID, project_id: UUID, title: str | None, target_due_date: date | None):
    project = project_repo.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise ValueError("PROJECT_NOT_FOUND")
    if project.owner_id != owner_id:
        raise ValueError("FORBIDDEN")

    return project_repo.update_project(db=db, project=project, title=title, target_due_date=target_due_date)

def list_projects(db: Session, owner_id: UUID):
    owned = project_repo.get_projects_for_user(db, owner_id=owner_id)
    from app.repositories import member as member_repo
    shared_ids = member_repo.get_member_project_ids(db, user_id=owner_id)
    shared = project_repo.get_projects_by_ids(db, project_ids=shared_ids)
    return owned + shared

def update_project_status(db: Session, owner_id: UUID, project_id: UUID, status: str):
    project = project_repo.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise ValueError("PROJECT_NOT_FOUND")
    if project.owner_id != owner_id:
        raise ValueError("FORBIDDEN")
    return project_repo.update_project_status(db=db, project=project, status=status)

def delete_project(db: Session, owner_id: UUID, project_id: UUID):
    project = project_repo.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise ValueError("PROJECT_NOT_FOUND")
    if project.owner_id != owner_id:
        raise ValueError("FORBIDDEN")

    task_repo.delete_tasks_for_project(db=db, project_id=project_id)
    project_repo.delete_project(db=db, project=project)

