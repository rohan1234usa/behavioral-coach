from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import analysis, upload
from app.db.base import Base, engine

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

app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Coach API is running"}
