from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
import os
import httpx

from app.core.db import get_db
from app.services.auth_dependency import get_current_user
from app.schemas.task import TaskCreate, TaskPublic, TaskUpdate, TaskUpdateStatus
from app.services import task as task_service


router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["tasks"])


@router.post("", response_model=TaskPublic, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: UUID,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        return task_service.create_task(
            db=db,
            owner_id=user.id,
            project_id=project_id,
            title=payload.title,
            description=payload.description,
            due_date=payload.due_date,
            priority=payload.priority,
            assigned_to_id=payload.assigned_to_id,
        )
    except ValueError as e:
        if str(e) == "PROJECT_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Project not found")
        if str(e) == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="Forbidden")
        raise


@router.get("", response_model=list[TaskPublic])
def list_tasks(
    project_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        return task_service.list_tasks(db=db, owner_id=user.id, project_id=project_id)
    except ValueError as e:
        if str(e) == "PROJECT_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Project not found")
        if str(e) == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="Forbidden")
        raise

@router.put("/{task_id}", response_model=TaskPublic)
def update_task(
    project_id: UUID,
    task_id: UUID,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        return task_service.update_task(
            db=db,
            owner_id=user.id,
            project_id=project_id,
            task_id=task_id,
            title=payload.title,
            description=payload.description,
            due_date=payload.due_date,
            assigned_to_id=payload.assigned_to_id,
        )
    except ValueError as e:
        if str(e) == "PROJECT_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Project not found")
        if str(e) == "TASK_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Task not found")
        if str(e) == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="Forbidden")
        raise


@router.patch("/{task_id}", response_model=TaskPublic)
def patch_task_status(
    project_id: UUID,
    task_id: UUID,
    payload: TaskUpdateStatus,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        return task_service.update_task_status(
            db=db,
            owner_id=user.id,
            project_id=project_id,
            task_id=task_id,
            status=payload.status,
        )
    except ValueError as e:
        if str(e) == "PROJECT_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Project not found")
        if str(e) == "TASK_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Task not found")
        if str(e) == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="Forbidden")
        raise

_HF_MODEL = "sshleifer/distilbart-cnn-6-6"
_HF_API_URL = f"https://router.huggingface.co/hf-inference/models/{_HF_MODEL}"


def _first_sentence(text: str) -> str:
    """Return only the first sentence, trimmed, with no space before punctuation."""
    import re
    text = re.sub(r"\s+([.!?])", r"\1", text.strip())
    for sep in (".", "!", "?"):
        idx = text.find(sep)
        if idx != -1:
            return text[: idx + 1].strip()
    return text


@router.post("/{task_id}/summarize")
def summarize_task(
    project_id: UUID,
    task_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        task = task_service.get_task(db=db, owner_id=user.id, project_id=project_id, task_id=task_id)
    except ValueError as e:
        code = str(e)
        if code == "PROJECT_NOT_FOUND": raise HTTPException(status_code=404, detail="Project not found")
        if code == "TASK_NOT_FOUND":    raise HTTPException(status_code=404, detail="Task not found")
        if code == "FORBIDDEN":         raise HTTPException(status_code=403, detail="Forbidden")
        raise
    if not task.description:
        return {"summary": None}

    hf_token = os.environ.get("HF_API_TOKEN")
    headers = {"Authorization": f"Bearer {hf_token}"} if hf_token else {}
    text = f"{task.title}. {task.description}"

    try:
        resp = httpx.post(
            _HF_API_URL,
            headers=headers,
            # max_length 28 ≈ 5–7 words: forces a genuinely short output
            json={"inputs": text, "parameters": {"max_length": 28, "min_length": 8}},
            timeout=30.0,
        )
        if resp.status_code == 503:
            raise HTTPException(status_code=503, detail="Model loading, retry in ~20s")
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"HF {resp.status_code}: {resp.text[:200]}")
        data = resp.json()
        raw = _first_sentence(data[0]["summary_text"])
        # If model still echoed the description, discard
        if raw.lower().strip(".") == task.description.lower().strip("."):
            return {"summary": None}
        return {"summary": raw}
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timed out")


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    project_id: UUID,
    task_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        task_service.delete_task(db=db, owner_id=user.id, project_id=project_id, task_id=task_id)
    except ValueError as e:
        if str(e) == "PROJECT_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Project not found")
        if str(e) == "TASK_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Task not found")
        if str(e) == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="Forbidden")
        raise