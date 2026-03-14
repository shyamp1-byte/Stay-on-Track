from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date

from app.models.project import Project


def create_project(db: Session, owner_id: UUID, title: str, target_due_date: date):
    project = Project(owner_id=owner_id, title=title, target_due_date=target_due_date)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def update_project(db: Session, project: Project, title: str | None = None, target_due_date=None):
    if title is not None:
        project.title = title
    if target_due_date is not None:
        project.target_due_date = target_due_date
    db.commit()
    db.refresh(project)
    return project


def get_projects_for_user(db: Session, owner_id: UUID):
    return db.query(Project).filter(Project.owner_id == owner_id).all()


def get_project_by_id(db: Session, project_id: UUID):
    return db.query(Project).filter(Project.id == project_id).first()

def update_project_status(db: Session, project: Project, status: str):
    project.status = status
    db.commit()
    db.refresh(project)
    return project

def delete_project(db: Session, project: Project):
    db.delete(project)
    db.commit()

def get_projects_by_ids(db: Session, project_ids: list):
    if not project_ids:
        return []
    return db.query(Project).filter(Project.id.in_(project_ids)).all()
