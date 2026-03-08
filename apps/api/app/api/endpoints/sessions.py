from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.db.models import Session as SessionModel
import boto3
import io

router = APIRouter()

# Internal S3 Client (Production-Ready)
from app.core.config import settings

s3_internal = boto3.client('s3',
    endpoint_url=settings.S3_ENDPOINT_URL if settings.S3_ENDPOINT_URL else None,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)

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
        
        # Get the file stream from MinIO / S3
        response = s3_internal.get_object(Bucket=settings.S3_BUCKET_NAME, Key=file_key)
        
        # Stream it back to the browser
        return StreamingResponse(
            response['Body'], 
            media_type="video/webm",
            headers={"Content-Disposition": f"inline; filename={file_key}"}
        )
    except Exception as e:
        print(f"Video Stream Error: {e}")
        raise HTTPException(status_code=404, detail="Video not found")