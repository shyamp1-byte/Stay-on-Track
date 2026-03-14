from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.db import get_db
from app.services.auth_dependency import get_current_user
from app.schemas.member import MemberInvite, MemberPublic
from app.services import member as member_service

router = APIRouter(prefix="/projects/{project_id}/members", tags=["members"])


@router.get("", response_model=list[MemberPublic])
def list_members(
    project_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        return member_service.list_members(db=db, requester_id=user.id, project_id=project_id)
    except ValueError as e:
        if str(e) == "PROJECT_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Project not found")
        if str(e) == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="Forbidden")
        raise


@router.post("", response_model=MemberPublic, status_code=status.HTTP_201_CREATED)
def invite_member(
    project_id: UUID,
    payload: MemberInvite,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        return member_service.invite_member(
            db=db, owner_id=user.id, project_id=project_id, email=payload.email
        )
    except ValueError as e:
        if str(e) == "PROJECT_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Project not found")
        if str(e) == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="Forbidden")
        if str(e) == "USER_NOT_FOUND":
            raise HTTPException(status_code=404, detail="No account with that email")
        if str(e) == "ALREADY_OWNER":
            raise HTTPException(status_code=400, detail="That user is the project owner")
        if str(e) == "ALREADY_MEMBER":
            raise HTTPException(status_code=409, detail="User is already a member")
        raise


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    project_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        member_service.remove_member(
            db=db, requester_id=user.id, project_id=project_id, user_id=user_id
        )
    except ValueError as e:
        if str(e) == "PROJECT_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Project not found")
        if str(e) == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="Forbidden")
        if str(e) == "CANNOT_REMOVE_OWNER":
            raise HTTPException(status_code=400, detail="Cannot remove project owner")
        if str(e) == "MEMBER_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Member not found")
        raise
