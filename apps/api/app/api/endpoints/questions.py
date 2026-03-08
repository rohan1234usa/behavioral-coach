from fastapi import APIRouter, UploadFile, File, Form, HTTPException
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
    Generates 3 tailored interview questions based on company, role, and optional resume.
    """
    resume_text = ""
    if resume:
        try:
            resume_text = await ResumeService.extract_text_from_pdf(resume)
        except Exception as e:
             # We don't want to fail the whole request just because resume parsing failed, 
             # but we should probably log it or let the user know. 
             # for now, we'll just log and proceed without resume context
             print(f"Resume parsing failed: {e}")

    questions = genai_service.generate_questions(company, role, resume_text)
    return questions
