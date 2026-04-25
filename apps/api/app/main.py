from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# FORCE LOCAL SQLITE only if DATABASE_URL is not set (i.e. running locally without docker-compose)
if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite:///./sql_app.db"
load_dotenv()  # Ensure other env vars are loaded

from app.api.endpoints import analysis, questions, upload, sessions
from app.db.schema import init_database
from app.services.s3 import s3_service
from app.core.config import settings

init_database()

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

# Existing Routes
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(questions.router, prefix="/api/questions", tags=["Questions"])


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Coach API is running"}


@app.get("/health")
def read_health():
    return {"status": "ok"}