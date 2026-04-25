from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.db.models import Session as SessionModel, AnalysisResult
from app.services.s3 import s3_service

router = APIRouter()

# 1. GET ALL SESSIONS (For Dashboard)
@router.get("/")
def get_sessions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    skip = max(skip, 0)
    limit = max(1, min(limit, 100))

    # Fetch sessions sorted by newest first, joining analysis to avoid N+1,
    # and only loading the columns we need to prevent pulling large JSON/Text fields.
    sessions = (
        db.query(
            SessionModel.id,
            SessionModel.question_text,
            SessionModel.status,
            SessionModel.created_at,
            AnalysisResult.confidence_score,
            AnalysisResult.engagement_score,
            AnalysisResult.clarity_score,
            AnalysisResult.resilience_score,
            AnalysisResult.dominant_emotion,
        )
        .outerjoin(AnalysisResult, SessionModel.id == AnalysisResult.session_id)
        .order_by(SessionModel.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    # Get total count for stable indexing
    total_count = db.query(SessionModel).count()
    
    return [
        {
            "id": s.id,
            "display_id": total_count - (skip + i),
            "question_text": s.question_text,
            "status": s.status,
            "created_at": s.created_at,
            # Include summary scores from analysis if available
            "confidence_score": s.confidence_score,
            "engagement_score": s.engagement_score,
            "clarity_score": s.clarity_score,
            "resilience_score": s.resilience_score,
            "dominant_emotion": s.dominant_emotion,
        }
        for i, s in enumerate(sessions)
    ]

# 2. STREAM VIDEO (The "Proxy Player")
@router.get("/{session_id}/video")
def stream_video(session_id: str):
    try:
        file_key = f"{session_id}.webm"
        from app.services.s3 import s3_service
        
        url = s3_service.generate_presigned_download_url(file_key)
        if url:
            from fastapi.responses import RedirectResponse
            # Local Docker fix for browser redirects
            url = url.replace("http://minio:9000", "http://localhost:9000")
            url = url.replace("http://minio:9001", "http://localhost:9001")
            return RedirectResponse(url)
        else:
            raise HTTPException(status_code=404, detail="Video not found")
            
    except Exception as e:
        print(f"Video Stream Error: {e}")
        raise HTTPException(status_code=404, detail="Video not found")