from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date

from app.models.task import Task

def create_task(db: Session, project_id: UUID, title: str, description: str | None, due_date: date | None, priority: str, created_by_id: UUID | None = None, assigned_to_id: UUID | None = None):
    task = Task(
        project_id=project_id,
        title=title,
        description=description,
        due_date=due_date,
        priority=priority,
        created_by_id=created_by_id,
        assigned_to_id=assigned_to_id,
    )
    db.add(task)
    db.commit()
    return db.query(Task).filter(Task.id == task.id).first()

def list_tasks(db: Session, project_id: UUID):
    return db.query(Task).filter(Task.project_id == project_id).all()

def get_task_by_id(db: Session, task_id: UUID):
    return db.query(Task).filter(Task.id == task_id).first()

_UNSET = object()

def update_task(db: Session, task: Task, title=_UNSET, description=_UNSET, due_date=_UNSET, assigned_to_id=_UNSET):
    if title is not _UNSET:
        task.title = title
    if description is not _UNSET:
        task.description = description
    if due_date is not _UNSET:
        task.due_date = due_date
    if assigned_to_id is not _UNSET:
        task.assigned_to_id = assigned_to_id
    db.commit()
    # Re-query so eager-loaded relationships (created_by_user, assigned_to_user) are fresh
    return db.query(Task).filter(Task.id == task.id).first()

def update_task_status(db: Session, task: Task, status: str):
    task.status = status
    db.commit()
    return db.query(Task).filter(Task.id == task.id).first()

def update_task_priority(db: Session, task: Task, priority: str):
    task.priority = priority
    db.commit()
    return db.query(Task).filter(Task.id == task.id).first()

def delete_task(db: Session, task: Task):
    db.delete(task)
    db.commit()

def delete_tasks_for_project(db: Session, project_id: UUID):
    db.query(Task).filter(Task.project_id == project_id).delete()
    db.commit()