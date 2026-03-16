from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from typing import List, Optional
from app.services.resume import ResumeService
from app.services.genai import genai_service

router = APIRouter()

@router.post("/generate")
async def generate_questions(
    company: str = Form(...),
    role: str = Form(...),
    resume: Optional[UploadFile] = File(None)
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

    # Return a StreamingResponse generator directly
    return StreamingResponse(
        genai_service.generate_questions_stream(company, role, resume_text),
        media_type="text/plain"
    )
