from fastapi import BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from app.db.models import Session as UserSession


TERMINAL_STATUS = "completed"
RUNNING_STATUS = "processing"
READY_STATUSES = {"uploaded", "failed"}


def enqueue_analysis_job(
    db: Session,
    db_session: UserSession,
    background_tasks: BackgroundTasks,
    runner,
) -> dict:
    if db_session.status == TERMINAL_STATUS:
        return {"status": "Analysis already completed", "session_id": db_session.id}
    if db_session.status == RUNNING_STATUS:
        return {"status": "Analysis already queued", "session_id": db_session.id}
    if db_session.status not in READY_STATUSES:
        raise HTTPException(status_code=409, detail="Upload must complete before analysis can start")

    db_session.status = RUNNING_STATUS
    db_session.error_message = None
    db.commit()
    background_tasks.add_task(runner, db_session.id)
    return {"status": "Analysis queued", "session_id": db_session.id}
