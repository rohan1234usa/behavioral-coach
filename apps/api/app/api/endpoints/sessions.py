from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.db.models import Session as SessionModel
from app.services.s3 import s3_service

router = APIRouter()

# 1. GET ALL SESSIONS (For Dashboard)
@router.get("/")
def get_sessions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Fetch sessions sorted by newest first, with joined analysis
    sessions = db.query(SessionModel).order_by(SessionModel.created_at.desc()).offset(skip).limit(limit).all()
    
    # Get total count for stable indexing
    total_count = db.query(SessionModel).count()
    
    return [
        {
            "id": s.id,
            "display_id": total_count - (skip + i),
            "question_text": s.question_text,
            "status": s.status,
            "created_at": s.created_at,
            "video_s3_key": s.video_s3_key,
            # Include summary scores from analysis if available
            "confidence_score": s.analysis.confidence_score if s.analysis else None,
            "engagement_score": s.analysis.engagement_score if s.analysis else None,
            "clarity_score": s.analysis.clarity_score if s.analysis else None,
            "resilience_score": s.analysis.resilience_score if s.analysis else None,
            "dominant_emotion": s.analysis.dominant_emotion if s.analysis else None,
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