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
import boto3
import os

# Create DB Tables on startup (Dev mode)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Behavioural Coach API")

# Allow Frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- NEW: Internal S3 Proxy Client ---
# Use settings for endpoint and credentials to support both local and production S3
from app.core.config import settings

s3_internal = boto3.client('s3',
    endpoint_url=settings.S3_ENDPOINT_URL if settings.S3_ENDPOINT_URL else None,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)

# --- NEW: Proxy Route ---
# The frontend uploads to here. This function forwards it to MinIO.
@app.post("/api/sessions/{session_id}/upload")
async def upload_video_proxy(session_id: str, file: UploadFile = File(...)):
    try:
        # 1. Ensure bucket exists (Internal check)
        try:
            s3_internal.create_bucket(Bucket=settings.S3_BUCKET_NAME)
        except:
            pass # Bucket likely exists

        # 2. Upload the file directly to MinIO/S3
        file_key = f"{session_id}.webm"
        s3_internal.upload_fileobj(
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