import io
from pypdf import PdfReader
from fastapi import UploadFile, HTTPException

class ResumeService:
    @staticmethod
    async def extract_text_from_pdf(file: UploadFile) -> str:
        """
        Extracts text from an uploaded PDF file.
        """
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        try:
            content = await file.read()
            pdf = PdfReader(io.BytesIO(content))
            text = ""
            for page in pdf.pages:
                text += page.extract_text()
            
            # Reset cursor just in case, though we consumed it.
            await file.seek(0)
            return text
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")
