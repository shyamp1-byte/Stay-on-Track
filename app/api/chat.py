import json
import os
from datetime import date
from typing import AsyncGenerator
from uuid import UUID

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.repositories import member as member_repo
from app.repositories import project as project_repo
from app.repositories import task as task_repo
from app.services.auth_dependency import get_current_user

router = APIRouter(tags=["chat"])

SYSTEM_PROMPT = """You are an AI assistant built into "Stay on Track", a project management app.
You help users manage their tasks and project through natural language.

You have the following tools:
- list_tasks: see all tasks with their IDs, titles, statuses, priorities, due dates, assignees
- create_task: create a new task with title, description, priority, due date, assignee
- update_task: edit a task's title, description, priority, due date, or assignee
- update_task_status: move a task to TODO, DOING, or DONE
- delete_task: permanently delete a task
- list_members: see all project members and their IDs

Always call list_tasks first whenever you need task IDs before updating or deleting.
Be concise and action-oriented. Do exactly what the user asks using the tools.
When performing bulk actions (e.g. "delete all TODO tasks"), call list_tasks first, then act on each matching task.
Confirm briefly what you did after completing actions."""

TOOLS = [
    {
        "name": "list_tasks",
        "description": "List all tasks in the current project with their id, title, description, status, priority, due date, and assignee. Always call this first before doing anything that requires knowing task IDs.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "create_task",
        "description": "Create a new task in the current project",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Task title"},
                "description": {"type": "string", "description": "Task description (optional)"},
                "priority": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH"], "description": "Task priority, defaults to MEDIUM"},
                "due_date": {"type": "string", "description": "Due date in YYYY-MM-DD format (optional)"},
                "assigned_to_id": {"type": "string", "description": "UUID of the member to assign the task to (optional)"},
            },
            "required": ["title"],
        },
    },
    {
        "name": "update_task",
        "description": "Update a task's title, description, due date, priority, or assignee",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "The task UUID"},
                "title": {"type": "string", "description": "New title (optional)"},
                "description": {"type": "string", "description": "New description (optional)"},
                "priority": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH"], "description": "New priority (optional)"},
                "due_date": {"type": "string", "description": "New due date in YYYY-MM-DD format, or empty string to clear (optional)"},
                "assigned_to_id": {"type": "string", "description": "UUID of member to assign to, or empty string to unassign (optional)"},
            },
            "required": ["task_id"],
        },
    },
    {
        "name": "update_task_status",
        "description": "Update the status of a task",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "The task UUID"},
                "status": {"type": "string", "enum": ["TODO", "DOING", "DONE"], "description": "New status"},
            },
            "required": ["task_id", "status"],
        },
    },
    {
        "name": "delete_task",
        "description": "Permanently delete a task from the project",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "The task UUID to delete"},
            },
            "required": ["task_id"],
        },
    },
    {
        "name": "list_members",
        "description": "List all members of the current project (name, email, user_id)",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]

TOOL_STATUS = {
    "list_tasks": "Fetching tasks...",
    "create_task": "Creating task...",
    "update_task": "Updating task...",
    "update_task_status": "Updating task status...",
    "delete_task": "Deleting task...",
    "list_members": "Fetching members...",
}


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


def _run_tool(name: str, tool_input: dict, db: Session, user, project_id: UUID) -> dict:
    if name == "list_tasks":
        tasks = task_repo.list_tasks(db=db, project_id=project_id)
        return {
            "tasks": [
                {
                    "id": str(t.id),
                    "title": t.title,
                    "description": t.description,
                    "status": t.status,
                    "priority": t.priority,
                    "due_date": str(t.due_date) if t.due_date else None,
                    "assigned_to_name": t.assigned_to_name,
                }
                for t in tasks
            ]
        }

    if name == "create_task":
        from app.services import task as task_service

        due_date = None
        if tool_input.get("due_date"):
            try:
                due_date = date.fromisoformat(tool_input["due_date"])
            except ValueError:
                pass
        task = task_service.create_task(
            db=db,
            owner_id=user.id,
            project_id=project_id,
            title=tool_input["title"],
            description=tool_input.get("description"),
            due_date=due_date,
            priority=tool_input.get("priority", "MEDIUM"),
        )
        db.commit()
        return {
            "created": True,
            "task": {
                "id": str(task.id),
                "title": task.title,
                "status": task.status,
                "priority": task.priority,
            },
        }

    if name == "update_task":
        from app.services import task as task_service

        task_id = UUID(tool_input["task_id"])
        existing = task_service.get_task(db=db, owner_id=user.id, project_id=project_id, task_id=task_id)

        due_date_raw = tool_input.get("due_date")
        if due_date_raw is None:
            due_date = existing.due_date  # unchanged
        elif due_date_raw == "":
            due_date = None
        else:
            try:
                due_date = date.fromisoformat(due_date_raw)
            except ValueError:
                due_date = existing.due_date

        assigned_raw = tool_input.get("assigned_to_id")
        if assigned_raw is None:
            assigned_to_id = existing.assigned_to_id
        elif assigned_raw == "":
            assigned_to_id = None
        else:
            assigned_to_id = UUID(assigned_raw)

        task = task_service.update_task(
            db=db,
            owner_id=user.id,
            project_id=project_id,
            task_id=task_id,
            title=tool_input.get("title") or existing.title,
            description=tool_input.get("description", existing.description),
            due_date=due_date,
            assigned_to_id=assigned_to_id,
        )
        if "priority" in tool_input:
            task = task_repo.update_task_priority(db=db, task=task, priority=tool_input["priority"])
        db.commit()
        return {"updated": True, "task": {"id": str(task.id), "title": task.title, "priority": task.priority, "due_date": str(task.due_date) if task.due_date else None}}

    if name == "update_task_status":
        from app.services import task as task_service

        task = task_service.update_task_status(
            db=db,
            owner_id=user.id,
            project_id=project_id,
            task_id=UUID(tool_input["task_id"]),
            status=tool_input["status"],
        )
        db.commit()
        return {"updated": True, "task": {"id": str(task.id), "title": task.title, "status": task.status}}

    if name == "delete_task":
        from app.services import task as task_service

        task_service.delete_task(
            db=db,
            owner_id=user.id,
            project_id=project_id,
            task_id=UUID(tool_input["task_id"]),
        )
        db.commit()
        return {"deleted": True, "task_id": tool_input["task_id"]}

    if name == "list_members":
        rows = member_repo.list_members_with_users(db=db, project_id=project_id)
        return {
            "members": [
                {"user_id": str(user_obj.id), "name": user_obj.full_name, "email": user_obj.email}
                for _, user_obj in rows
            ]
        }

    return {"error": f"Unknown tool: {name}"}


async def _stream(
    message: str,
    history: list[ChatMessage],
    db: Session,
    user,
    project_id: UUID,
) -> AsyncGenerator[str, None]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        yield f"data: {json.dumps({'type': 'error', 'text': 'ANTHROPIC_API_KEY is not configured on the server.'})}\n\n"
        return

    client = anthropic.AsyncAnthropic(api_key=api_key)
    messages = [{"role": m.role, "content": m.content} for m in history]
    messages.append({"role": "user", "content": message})

    while True:
        response = await client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    status = TOOL_STATUS.get(block.name, f"Running {block.name}...")
                    yield f"data: {json.dumps({'type': 'status', 'text': status})}\n\n"
                    try:
                        result = _run_tool(block.name, block.input, db, user, project_id)
                    except Exception as exc:
                        result = {"error": str(exc)}
                    tool_results.append(
                        {"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(result)}
                    )

            # Notify frontend that data may have changed so it can refresh
            mutating = {"create_task", "update_task", "update_task_status", "delete_task"}
            if any(b.type == "tool_use" and b.name in mutating for b in response.content):
                yield f"data: {json.dumps({'type': 'tasks_changed'})}\n\n"

            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
        else:
            for block in response.content:
                if block.type == "text":
                    yield f"data: {json.dumps({'type': 'delta', 'text': block.text})}\n\n"
            break

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


@router.post("/projects/{project_id}/chat")
async def chat(
    project_id: UUID,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    project = project_repo.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    is_owner = project.owner_id == user.id
    is_member = member_repo.get_member(db, project_id=project_id, user_id=user.id) is not None
    if not is_owner and not is_member:
        raise HTTPException(status_code=403, detail="Forbidden")

    return StreamingResponse(
        _stream(payload.message, payload.history, db, user, project_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# Global (home page) chat — no project context
# ---------------------------------------------------------------------------

GLOBAL_SYSTEM_PROMPT = """You are an AI assistant built into "Stay on Track", a project management app.
You help users manage their projects through natural language from the home page.

You have the following tools:
- list_projects: see all the user's projects with id, title, status, and due date
- create_project: create a brand new project, returns the new project's id
- create_task: add a task to any project using its project_id (use the id returned by create_project)
- list_project_members: list members of a project so you can get user_ids for assignment

When the user asks you to set up a project with tasks, do the FULL job autonomously:
1. Call create_project to create the project
2. Use the returned project_id to call create_task once per task — including title, description, priority, due_date, and assigned_to_id if mentioned
3. Confirm everything that was created in a clean summary

Never tell the user they need to do something manually if you have a tool for it. Do it yourself.
"""

GLOBAL_TOOLS = [
    {
        "name": "list_projects",
        "description": "List all the user's projects with id, title, status, and due date",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "create_project",
        "description": "Create a new project. Returns the project id which you must use when creating tasks for it.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "The project title"},
                "due_date": {"type": "string", "description": "Target due date in YYYY-MM-DD format"},
            },
            "required": ["title", "due_date"],
        },
    },
    {
        "name": "create_task",
        "description": "Add a task to a project. Use the project_id returned by create_project.",
        "input_schema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string", "description": "The project UUID to add this task to"},
                "title": {"type": "string", "description": "Task title"},
                "description": {"type": "string", "description": "Task description (optional)"},
                "priority": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH"], "description": "Task priority, defaults to MEDIUM"},
                "due_date": {"type": "string", "description": "Due date in YYYY-MM-DD format (optional)"},
                "assigned_to_id": {"type": "string", "description": "UUID of the member to assign this task to (optional)"},
            },
            "required": ["project_id", "title"],
        },
    },
    {
        "name": "list_project_members",
        "description": "List all members of a project so you can get their user_ids for task assignment",
        "input_schema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string", "description": "The project UUID"},
            },
            "required": ["project_id"],
        },
    },
]

GLOBAL_TOOL_STATUS = {
    "list_projects": "Fetching your projects...",
    "create_project": "Creating project...",
    "create_task": "Adding task...",
    "list_project_members": "Fetching members...",
}


def _run_global_tool(name: str, tool_input: dict, db: Session, user) -> dict:
    if name == "list_projects":
        from app.services import project as project_service
        projects = project_service.list_projects(db=db, owner_id=user.id)
        return {
            "projects": [
                {
                    "id": str(p["id"]),
                    "title": p["title"],
                    "status": p["status"],
                    "due_date": str(p["target_due_date"]) if p.get("target_due_date") else None,
                }
                for p in projects
            ]
        }

    if name == "create_project":
        from app.services import project as project_service
        due_date = date.fromisoformat(tool_input["due_date"])
        project = project_service.create_project(
            db=db,
            owner_id=user.id,
            title=tool_input["title"],
            target_due_date=due_date,
        )
        db.commit()
        return {
            "created": True,
            "project": {"id": str(project.id), "title": project.title, "due_date": str(project.target_due_date)},
        }

    if name == "create_task":
        from app.services import task as task_service
        project_id = UUID(tool_input["project_id"])
        due_date = None
        if tool_input.get("due_date"):
            try:
                due_date = date.fromisoformat(tool_input["due_date"])
            except ValueError:
                pass
        assigned_to_id = None
        if tool_input.get("assigned_to_id"):
            try:
                assigned_to_id = UUID(tool_input["assigned_to_id"])
            except ValueError:
                pass
        task = task_service.create_task(
            db=db,
            owner_id=user.id,
            project_id=project_id,
            title=tool_input["title"],
            description=tool_input.get("description"),
            due_date=due_date,
            priority=tool_input.get("priority", "MEDIUM"),
            assigned_to_id=assigned_to_id,
        )
        db.commit()
        return {"created": True, "task": {"id": str(task.id), "title": task.title, "priority": task.priority}}

    if name == "list_project_members":
        project_id = UUID(tool_input["project_id"])
        rows = member_repo.list_members_with_users(db=db, project_id=project_id)
        return {
            "members": [
                {"user_id": str(u.id), "name": u.full_name, "email": u.email}
                for _, u in rows
            ]
        }

    return {"error": f"Unknown tool: {name}"}


async def _stream_global(
    message: str,
    history: list[ChatMessage],
    db: Session,
    user,
) -> AsyncGenerator[str, None]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        yield f"data: {json.dumps({'type': 'error', 'text': 'ANTHROPIC_API_KEY is not configured on the server.'})}\n\n"
        return

    client = anthropic.AsyncAnthropic(api_key=api_key)
    messages = [{"role": m.role, "content": m.content} for m in history]
    messages.append({"role": "user", "content": message})

    while True:
        response = await client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=4096,
            system=GLOBAL_SYSTEM_PROMPT,
            tools=GLOBAL_TOOLS,
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    status = GLOBAL_TOOL_STATUS.get(block.name, f"Running {block.name}...")
                    yield f"data: {json.dumps({'type': 'status', 'text': status})}\n\n"
                    try:
                        result = _run_global_tool(block.name, block.input, db, user)
                    except Exception as exc:
                        result = {"error": str(exc)}
                    tool_results.append(
                        {"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(result)}
                    )

            if any(b.type == "tool_use" and b.name in {"create_project", "create_task"} for b in response.content):
                yield f"data: {json.dumps({'type': 'projects_changed'})}\n\n"

            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
        else:
            for block in response.content:
                if block.type == "text":
                    yield f"data: {json.dumps({'type': 'delta', 'text': block.text})}\n\n"
            break

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


@router.post("/chat")
async def global_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return StreamingResponse(
        _stream_global(payload.message, payload.history, db, user),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
