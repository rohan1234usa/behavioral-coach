import os
import secrets
import tempfile
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_accessible_session, get_current_user
from app.core.config import settings
from app.services.s3 import s3_service
from app.db.base import get_db
from app.db.models import Session as UserSession

router = APIRouter()

class UploadRequest(BaseModel):
    file_type: str = "video/webm"
    question: str = Field(default="Tell me about yourself.", min_length=1, max_length=500)
    user_email: Optional[str] = Field(default=None, max_length=320, deprecated=True)
    user_name: Optional[str] = Field(default=None, max_length=120, deprecated=True)

@router.post("/upload/presigned-url")
def get_upload_url(
    payload: UploadRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.file_type != "video/webm":
        raise HTTPException(status_code=400, detail="Only WebM video uploads are supported")

    new_session = UserSession(
        question_text=payload.question,
        video_s3_key="temp", # Temporary
        status="created",
        user_id=current_user.id,
        access_token=secrets.token_urlsafe(32),
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    # 3. Generate correct file key and update DB
    file_key = f"{new_session.id}.webm"
    new_session.video_s3_key = file_key
    db.commit()
    
    # 4. Generate S3 URL
    url = s3_service.generate_presigned_upload_url(file_key)
    
    if not url:
        raise HTTPException(status_code=500, detail="Could not generate S3 URL")
        
    return {
        "upload_url": url, 
        "session_id": new_session.id,
        "session_token": new_session.access_token,
    }


@router.post("/sessions/{session_id}/upload")
def upload_video_proxy(
    file: UploadFile = File(...),
    db_session: UserSession = Depends(get_accessible_session),
    db: Session = Depends(get_db),
):
    if file.content_type != "video/webm":
        raise HTTPException(status_code=400, detail="Only WebM video uploads are supported")

    bytes_written = 0
    temp_path = None
    try:
        file_key = f"{db_session.id}.webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_path = temp_file.name
            while chunk := file.file.read(1024 * 1024):
                bytes_written += len(chunk)
                if bytes_written > settings.MAX_VIDEO_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Video upload is too large")
                temp_file.write(chunk)

        s3_service.s3_client.upload_file(
            temp_path,
            settings.S3_BUCKET_NAME,
            file_key,
            ExtraArgs={'ContentType': 'video/webm'}
        )

        db_session.status = "uploaded"
        db.commit()
        print(f"✅ Successfully proxied upload for session: {db_session.id}")
        return {"status": "success", "key": file_key}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Proxy Upload Error for session {db_session.id}: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)