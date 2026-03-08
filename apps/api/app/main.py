from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# FORCE LOCAL SQLITE only if DATABASE_URL is not set (i.e. running locally without docker-compose)
if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite:///./sql_app.db"
load_dotenv()  # Ensure other env vars are loaded

from app.api.endpoints import analysis, upload, sessions
from app.db.base import Base, engine
from app.services.s3 import s3_service
from app.core.config import settings

# Create DB Tables on startup (Dev mode)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Behavioural Coach API")

# Allow Frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://behavioral-interview-coach.vercel.app",
    ], 
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
async def upload_video_proxy(session_id: str, file: UploadFile = File(...)):
    try:
        file_key = f"{session_id}.webm"
        s3_service.s3_client.upload_fileobj(
            file.file, 
            settings.S3_BUCKET_NAME, 
            file_key,
            ExtraArgs={'ContentType': 'video/webm'}
        )
        
        print(f"✅ Successfully proxied upload for session: {session_id}")
        return {"status": "success", "key": file_key}
    except Exception as e:
        print(f"❌ Proxy Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Existing Routes
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
from app.api.endpoints import questions
app.include_router(questions.router, prefix="/api/questions", tags=["Questions"])


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Coach API is running"}