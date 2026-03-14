from sqlalchemy.orm import Session
from uuid import UUID

from app.models.project_member import ProjectMember
from app.models.user import User


def add_member(db: Session, project_id: UUID, user_id: UUID, invited_by: UUID):
    member = ProjectMember(project_id=project_id, user_id=user_id, invited_by=invited_by)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def get_member(db: Session, project_id: UUID, user_id: UUID):
    return (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
        .first()
    )


def list_members_with_users(db: Session, project_id: UUID):
    return (
        db.query(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .filter(ProjectMember.project_id == project_id)
        .all()
    )


def remove_member(db: Session, project_id: UUID, user_id: UUID):
    member = get_member(db, project_id=project_id, user_id=user_id)
    if member:
        db.delete(member)
        db.commit()


def get_member_project_ids(db: Session, user_id: UUID) -> list:
    return [
        row.project_id
        for row in db.query(ProjectMember.project_id)
        .filter(ProjectMember.user_id == user_id)
        .all()
    ]
