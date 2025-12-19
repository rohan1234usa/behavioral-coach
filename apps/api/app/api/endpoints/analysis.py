from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.base import get_db, SessionLocal
from app.db.models import Session as UserSession, AnalysisResult
from app.services.mock_analysis import run_mock_pipeline
from app.clients.imentiv import ImentivClient 
import os
import boto3
import json
import logging
import time

# Setup Logger
logger = logging.getLogger("AnalysisPipeline")
router = APIRouter()

s3_internal = boto3.client('s3',
    endpoint_url="http://minio:9000",
    aws_access_key_id="minioadmin",
    aws_secret_access_key="minioadmin"
)

API_KEY = os.getenv("IMENTIV_API_KEY")
client = ImentivClient(api_key=API_KEY) if API_KEY else None

def run_real_pipeline(session_id: int):
    """
    Downloads video -> Sends to Imentiv -> Polls for frames -> Saves unique data
    If data is missing from the API, values default to 0.0 for debugging.
    """
    db = SessionLocal()
    temp_file = f"/tmp/{session_id}.webm"
    
    try:
        logger.info(f"🚀 [SESSION {session_id}] Starting Analysis Pipeline")
        s3_internal.download_file("videos", f"{session_id}.webm", temp_file)

        # 1. Trigger Imentiv Upload
        summary_results = client.analyze_video(temp_file)
        video_id = summary_results.get("id")

        # 2. Poll for Detailed Insights
        detailed_data = {}
        frames = []
        retry_count = 0
        
        while retry_count < 10:
            detailed_data = client._request("GET", f"videos/{video_id}", params={"annotated_video_mp4": "false"})
            # Look for frame data in every potential key
            frames = detailed_data.get("frames") or detailed_data.get("video_emotions") or []
            
            if frames and len(frames) > 0:
                logger.info(f"✅ REAL DATA FOUND: {len(frames)} frames detected.")
                break
            
            logger.info(f"⏳ Metadata received but frames/emotions are still empty. Retry {retry_count + 1}/10...")
            time.sleep(5)
            retry_count += 1

        # 3. STRICT DATA MAPPING
        # No more random seeds or hardcoded fallbacks. 
        # If the key is missing from Imentiv's payload, it becomes 0.0.
        fps = detailed_data.get("fps", 1)
        
        real_timeline = []
        for i, f in enumerate(frames):
            if i % fps == 0:
                # Flattens nested Imentiv structure
                va = f.get("valence_arousal", {})
                real_timeline.append({
                    "timestamp": i / fps,
                    "valence": va.get("valence", 0.0), 
                    "arousal": va.get("arousal", 0.0)  
                })

        metrics = {
            "confidence": float(detailed_data.get("confidence_score", 0.0)),
            "clarity": float(detailed_data.get("clarity_score", 0.0)),
            "resilience": float(detailed_data.get("resilience_score", 0.0)),
            "engagement": float(detailed_data.get("engagement_score", 0.0)),
            "timeline": real_timeline
        }

        # 4. Save to DB
        db.query(AnalysisResult).filter(AnalysisResult.session_id == session_id).delete()
        analysis_result = AnalysisResult(
            session_id=session_id,
            transcript=detailed_data.get("summary", "Analysis complete."),
            confidence_score=metrics["confidence"],
            clarity_score=metrics["clarity"],
            resilience_score=metrics["resilience"],
            engagement_score=metrics["engagement"],
            metrics_data=metrics
        )
        db.add(analysis_result)
        
        db_session = db.query(UserSession).filter(UserSession.id == session_id).first()
        if db_session:
            db_session.status = "completed"
            
        db.commit()
        logger.info(f"✅ Analysis for Session {session_id} saved. Scores: {metrics['confidence']}, {metrics['engagement']}")

    except Exception as e:
        logger.error(f"❌ Analysis Pipeline Failed: {e}")
        db.rollback()
        db_session = db.query(UserSession).filter(UserSession.id == session_id).first()
        if db_session:
            db_session.status = "failed"
            db.commit()
    finally:
        db.close()
        if os.path.exists(temp_file):
            os.remove(temp_file)

# --- ENDPOINTS ---

@router.post("/{session_id}/trigger")
async def trigger_analysis(session_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_session = db.query(UserSession).filter(UserSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    db_session.status = "processing"
    db.commit()
    background_tasks.add_task(run_real_pipeline, session_id)
    return {"status": "Analysis queued", "session_id": session_id}

@router.get("/{session_id}/result")
def get_analysis_result(session_id: int, db: Session = Depends(get_db)):
    result = db.query(AnalysisResult).filter(AnalysisResult.session_id == session_id).first()
    session = db.query(UserSession).filter(UserSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not result:
        return {"status": session.status, "data": None}
    return {"status": session.status, "data": result}