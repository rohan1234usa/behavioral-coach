from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.db.models import Session as SessionModel
import boto3
import io

router = APIRouter()

# Internal S3 Client (Docker-to-Docker)
s3_internal = boto3.client('s3',
    endpoint_url="http://minio:9000",
    aws_access_key_id="minioadmin",
    aws_secret_access_key="minioadmin"
)

# 1. GET ALL SESSIONS (For Dashboard)
@router.get("/")
def get_sessions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Fetch sessions sorted by newest first
    sessions = db.query(SessionModel).order_by(SessionModel.created_at.desc()).offset(skip).limit(limit).all()
    return sessions

# 2. STREAM VIDEO (The "Proxy Player")
@router.get("/{session_id}/video")
def stream_video(session_id: str):
    try:
        file_key = f"{session_id}.webm"
        
        # Get the file stream from MinIO
        response = s3_internal.get_object(Bucket="videos", Key=file_key)
        
        # Stream it back to the browser
        return StreamingResponse(
            response['Body'], 
            media_type="video/webm",
            headers={"Content-Disposition": f"inline; filename={file_key}"}
        )
    except Exception as e:
        print(f"Video Stream Error: {e}")
        raise HTTPException(status_code=404, detail="Video not found")