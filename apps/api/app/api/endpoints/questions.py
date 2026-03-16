from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.db.models import CoachingPlan
from app.services.resume import ResumeService
from app.services.genai import genai_service

router = APIRouter()

@router.post("/generate")
async def generate_questions(
    company: str = Form(...),
    role: str = Form(...),
    resume: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Generates 3 tailored interview questions based on company, role, and optional resume (Streaming).
    """
    resume_text = ""
    if resume:
        try:
            resume_text = await ResumeService.extract_text_from_pdf(resume)
        except Exception as e:
             print(f"Resume parsing failed: {e}")

    # Fetch the latest CoachingPlan for the focus area
    focus_area = ""
    latest_plan = db.query(CoachingPlan).order_by(CoachingPlan.created_at.desc()).first()
    if latest_plan and latest_plan.core_weakness:
        focus_area = latest_plan.core_weakness

    # Return a StreamingResponse generator directly
    return StreamingResponse(
        genai_service.generate_questions_stream(company, role, resume_text, focus_area=focus_area),
        media_type="text/plain"
    )
