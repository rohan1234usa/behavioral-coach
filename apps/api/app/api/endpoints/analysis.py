from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.db.models import Session as UserSession, AnalysisResult
from app.services.mock_analysis import run_mock_pipeline

router = APIRouter()

@router.post("/{session_id}/trigger")
async def trigger_analysis(
    session_id: int, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Verify session exists
    db_session = db.query(UserSession).filter(UserSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update status to processing
    db_session.status = "processing"
    db.commit()

    # Trigger background mock analysis
    background_tasks.add_task(run_mock_pipeline, session_id)
    
    return {"status": "Analysis queued", "session_id": session_id}

@router.get("/{session_id}/result")
def get_analysis_result(session_id: int, db: Session = Depends(get_db)):
    # Helper endpoint for Frontend to poll
    result = db.query(AnalysisResult).filter(AnalysisResult.session_id == session_id).first()
    session = db.query(UserSession).filter(UserSession.id == session_id).first()
    
    if not result:
        return {"status": session.status, "data": None}
        
    return {"status": session.status, "data": result}
