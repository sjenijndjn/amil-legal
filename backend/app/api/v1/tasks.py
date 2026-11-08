"""Productivity Tasks & Reminders endpoints: /tasks."""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundError
from app.core.security import get_current_user, record_audit_event
from app.database.base import utcnow
from app.database.session import get_db
from app.models.task import Task
from app.models.user import User
from app.schemas.workspace import TaskCreateRequest, TaskResponse, TaskUpdateRequest

router = APIRouter(prefix="/tasks", tags=["Productivity — Tasks & Reminders"])


def _get_user_task_or_404(
    db: Session, task_id: uuid.UUID, user_id: uuid.UUID, request: Optional[Request] = None
) -> Task:
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == user_id)
        .first()
    )
    if task is None:
        record_audit_event(
            db,
            user_id=user_id,
            action="UNAUTHORIZED_OR_MISSING_TASK_ACCESS",
            resource_type="TASK",
            resource_id=str(task_id),
            request=request,
        )
        raise ResourceNotFoundError("Task not found")
    return task


@router.get("", response_model=List[TaskResponse])
def list_tasks(
    status: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    month: Optional[int] = Query(default=None, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[TaskResponse]:
    q = db.query(Task).filter(Task.user_id == current_user.id)
    if status and status.strip():
        q = q.filter(Task.status == status.strip().upper())
    if priority and priority.strip():
        q = q.filter(Task.priority == priority.strip().upper())

    tasks = q.order_by(Task.due_at.asc().nulls_last(), Task.created_at.desc()).all()
    if month is not None:
        tasks = [t for t in tasks if t.due_at and t.due_at.month == month]
    return [TaskResponse.model_validate(t) for t in tasks]


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskResponse:
    task = Task(
        user_id=current_user.id,
        title=payload.title.strip(),
        description=payload.description,
        task_type=payload.task_type,
        priority=payload.priority,
        status=payload.status,
        due_at=payload.due_at,
        reminder_at=payload.reminder_at,
        linked_entity_type=payload.linked_entity_type,
        linked_entity_id=payload.linked_entity_id,
        completed_at=utcnow() if payload.status == "COMPLETED" else None,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskResponse:
    task = _get_user_task_or_404(db, task_id, current_user.id, request=request)
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(task, k, v)
    if updates.get("status") == "COMPLETED" and task.completed_at is None:
        task.completed_at = utcnow()
    elif updates.get("status") in ("TODO", "IN_PROGRESS"):
        task.completed_at = None
    task.updated_at = utcnow()
    db.commit()
    db.refresh(task)
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    task = _get_user_task_or_404(db, task_id, current_user.id, request=request)
    db.delete(task)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
