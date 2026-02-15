from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.services.s3 import s3_service
from app.db.base import get_db
from app.db.models import Session as UserSession
import uuid

router = APIRouter()

class UploadRequest(BaseModel):
    file_type: str = "video/webm"
    question: str = "Tell me about yourself."
    user_email: str = None
    user_name: str = None

@router.post("/presigned-url")
def get_upload_url(payload: UploadRequest, db: Session = Depends(get_db)):
    from app.db.models import User # Import here to avoid circular deps if any
    
    # 1. Handle User Association
    user_id = None
    if payload.user_email:
        # Check if user exists
        user = db.query(User).filter(User.email == payload.user_email).first()
        if not user:
            # Create new user
            user = User(
                email=payload.user_email, 
                full_name=payload.user_name or "Candidate",
                target_role="General"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        user_id = user.id

    # 2. Generate unique file key
    file_key = f"uploads/{uuid.uuid4()}.webm"
    
    # 3. Create Session Record in DB (Status: 'created')
    new_session = UserSession(
        question_text=payload.question,
        video_s3_key=file_key,
        status="created",
        user_id=user_id
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    # 3. Generate S3 URL
    url = s3_service.generate_presigned_upload_url(file_key)
    
    if not url:
        raise HTTPException(status_code=500, detail="Could not generate S3 URL")
        
    return {
        "upload_url": url, 
        "video_key": file_key,
        "session_id": new_session.id
    }
