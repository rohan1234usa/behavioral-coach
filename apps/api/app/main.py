from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
import tempfile

# FORCE LOCAL SQLITE only if DATABASE_URL is not set (i.e. running locally without docker-compose)
if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite:///./sql_app.db"
load_dotenv()  # Ensure other env vars are loaded

from app.api.endpoints import analysis, upload, sessions
from app.db.base import Base, engine, get_db
from app.db.models import Session as UserSession
from app.services.s3 import s3_service
from app.core.config import settings

# Create DB Tables on startup (Dev mode)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Behavioural Coach API")

frontend_origins = [origin.strip() for origin in settings.FRONTEND_ORIGINS.split(",") if origin.strip()]

# Allow Frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- STARTUP: Ensure S3 Bucket Exists ---
try:
    s3_service.s3_client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
except Exception:
    pass  # Bucket likely already exists

# --- Upload Proxy Route ---
# The frontend uploads to here. This function forwards it to MinIO.
@app.post("/api/sessions/{session_id}/upload")
def upload_video_proxy(session_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_session = db.query(UserSession).filter(UserSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    if file.content_type != "video/webm":
        raise HTTPException(status_code=400, detail="Only WebM video uploads are supported")

    bytes_written = 0
    temp_path = None
    try:
        file_key = f"{session_id}.webm"
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
        print(f"✅ Successfully proxied upload for session: {session_id}")
        return {"status": "success", "key": file_key}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Proxy Upload Error for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


# Existing Routes
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
from app.api.endpoints import questions
app.include_router(questions.router, prefix="/api/questions", tags=["Questions"])


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Coach API is running"}