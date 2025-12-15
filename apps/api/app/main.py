from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import analysis, upload
from app.db.base import Base, engine
import boto3
import os

# Create DB Tables on startup (Dev mode)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Behavioural Coach API")

# Allow Frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- NEW: Internal S3 Proxy Client ---
# This client lives inside Docker, so it can talk to MinIO perfectly.
s3_internal = boto3.client('s3',
    endpoint_url="http://minio:9000",
    aws_access_key_id="minioadmin",
    aws_secret_access_key="minioadmin"
)

# --- NEW: Proxy Route ---
# The frontend uploads to here. This function forwards it to MinIO.
@app.post("/api/sessions/{session_id}/upload")
async def upload_video_proxy(session_id: str, file: UploadFile = File(...)):
    try:
        # 1. Ensure bucket exists (Internal check)
        try:
            s3_internal.create_bucket(Bucket="videos")
        except:
            pass # Bucket likely exists

        # 2. Upload the file directly to MinIO
        file_key = f"{session_id}.webm"
        s3_internal.upload_fileobj(
            file.file, 
            "videos", 
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

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Coach API is running"}