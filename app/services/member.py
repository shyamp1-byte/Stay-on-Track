from sqlalchemy.orm import Session
from uuid import UUID

from app.repositories import member as member_repo
from app.repositories import project as project_repo
from app.repositories import user as user_repo


def invite_member(db: Session, owner_id: UUID, project_id: UUID, email: str):
    project = project_repo.get_project_by_id(db, project_id)
    if not project:
        raise ValueError("PROJECT_NOT_FOUND")
    if project.owner_id != owner_id:
        raise ValueError("FORBIDDEN")

    user = user_repo.get_user_by_email(db, email)
    if not user:
        raise ValueError("USER_NOT_FOUND")
    if user.id == owner_id:
        raise ValueError("ALREADY_OWNER")
    if member_repo.get_member(db, project_id=project_id, user_id=user.id):
        raise ValueError("ALREADY_MEMBER")

    pm = member_repo.add_member(db, project_id=project_id, user_id=user.id, invited_by=owner_id)
    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": "member",
        "joined_at": pm.joined_at,
    }


def remove_member(db: Session, requester_id: UUID, project_id: UUID, user_id: UUID):
    project = project_repo.get_project_by_id(db, project_id)
    if not project:
        raise ValueError("PROJECT_NOT_FOUND")
    if project.owner_id != requester_id and requester_id != user_id:
        raise ValueError("FORBIDDEN")
    if project.owner_id == user_id:
        raise ValueError("CANNOT_REMOVE_OWNER")
    if not member_repo.get_member(db, project_id=project_id, user_id=user_id):
        raise ValueError("MEMBER_NOT_FOUND")

    member_repo.remove_member(db, project_id=project_id, user_id=user_id)


def list_members(db: Session, requester_id: UUID, project_id: UUID):
    project = project_repo.get_project_by_id(db, project_id)
    if not project:
        raise ValueError("PROJECT_NOT_FOUND")
    if project.owner_id != requester_id:
        if not member_repo.get_member(db, project_id=project_id, user_id=requester_id):
            raise ValueError("FORBIDDEN")

    owner = user_repo.get_user_by_id(db, project.owner_id)
    result = []
    if owner:
        result.append({
            "user_id": owner.id,
            "email": owner.email,
            "full_name": owner.full_name,
            "role": "owner",
            "joined_at": project.created_at,
        })

    for pm, user in member_repo.list_members_with_users(db, project_id=project_id):
        result.append({
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": "member",
            "joined_at": pm.joined_at,
        })

    return result
