from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.base import get_db, SessionLocal
from app.db.models import Session as UserSession, AnalysisResult
from app.clients.imentiv import get_imentiv_client
import os
import boto3
import json
import logging
import time

# Restore standard logging/print for Docker
router = APIRouter()

s3_internal = boto3.client('s3',
    endpoint_url="http://minio:9000",
    aws_access_key_id="minioadmin",
    aws_secret_access_key="minioadmin"
)


def run_real_pipeline(session_id: int):
    """
    Downloads video from MinIO → Uploads to Imentiv via official SDK →
    Polls for completion → Maps response to DB schema → Saves results.
    """
    db = SessionLocal()
    temp_file = f"/tmp/{session_id}.webm"
    
    try:
        print(f"🚀 [SESSION {session_id}] Starting Analysis Pipeline (Official SDK)", flush=True)
        
        # 1. Download video from MinIO
        s3_internal.download_file("videos", f"{session_id}.webm", temp_file)
        print(f"📥 Downloaded video from MinIO for session {session_id}", flush=True)

        # 2. Upload to Imentiv via official SDK
        client = get_imentiv_client()
        upload_result = client.video.upload(
            temp_file,
            title=f"Session {session_id}",
            description="Behavioral Coach Analysis Session"
        )
        video_id = upload_result.get("video_id") or upload_result.get("id")
        
        if not video_id:
            raise ValueError(f"No video_id in upload response: {upload_result}")
        
        print(f"📤 Uploaded to Imentiv. Video ID: {video_id}", flush=True)

        # 3. Wait slightly for backend to register file
        time.sleep(5)

        # 4. Wait for analysis to complete, then fetch full results
        #    SDK handles all polling internally with get_results(wait=True)
        print(f"⏳ Waiting for Imentiv analysis to complete...", flush=True)
        results = client.video.get_results(video_id, wait=True, poll_interval=3.0)
        
        # Debug: log the response structure on first runs
        print(f"✅ Raw SDK response keys: {list(results.keys())}", flush=True)
        print(f"📊 Full response (truncated): {json.dumps(results, default=str)[:2000]}", flush=True)

        # 4. MAP RESPONSE TO DB SCHEMA
        #    Extract metrics defensively — default to 0.0 if missing
        
        # -- Overall Scores --
        confidence = float(results.get("confidence_score", 0.0))
        clarity = float(results.get("clarity_score", 0.0))
        resilience = float(results.get("resilience_score", 0.0))
        engagement = float(results.get("engagement_score", 0.0))
        
        # -- Dominant Emotion --
        dominant_emotion = results.get("dominant_emotion", None)
        if isinstance(dominant_emotion, dict):
            dominant_emotion = dominant_emotion.get("name", "neutral")
        
        # -- Transcript / Summary --
        transcript = results.get("summary", "") or results.get("transcript", "")
        
        # -- Emotion Timeline --
        frames = (
            results.get("frames") or 
            results.get("video_emotions") or 
            results.get("face_emotions") or 
            []
        )
        
        fps = results.get("fps", 1) or 1
        real_timeline = []
        
        for i, frame in enumerate(frames):
            # Sample once per second (every fps-th frame)
            if i % max(int(fps), 1) == 0:
                va = frame.get("valence_arousal", {})
                if isinstance(va, dict):
                    valence = va.get("valence", 0.0)
                    arousal = va.get("arousal", 0.0)
                else:
                    valence = float(frame.get("valence", 0.0))
                    arousal = float(frame.get("arousal", 0.0))
                
                real_timeline.append({
                    "timestamp": round(i / max(int(fps), 1), 1),
                    "valence": round(float(valence), 3),
                    "arousal": round(float(arousal), 3),
                })
        
        # -- Aggregate emotion scores if top-level scores are 0 --
        if confidence == 0.0 and clarity == 0.0:
            # -- MULTIMODAL FUSION --
            overall = results.get("emotion_analysis", {}).get("overall", {})
            
            video_em = overall.get("video") or results.get("video_emotions") or results.get("emotions", {})
            audio_em = overall.get("audio") or {}
            text_em = overall.get("text") or {}
            
            # Helper to safely get float
            def get_em(source, key):
                return float(source.get(key) or source.get(key.replace("anger", "angry")) or 0.0)

            # List of emotions to merge
            emotion_keys = ["happy", "joy", "sad", "sadness", "anger", "angry", "fear", "disgust", "surprise", "neutral", "contempt"]
            
            merged_emotions = {}
            for key in emotion_keys:
                # Normalize key names
                norm_key = key
                if key == "happy": norm_key = "joy"
                if key == "sad": norm_key = "sadness"
                if key == "angry": norm_key = "anger"
                
                # Sum present values
                total = 0.0
                count = 0
                
                if video_em: 
                    val = get_em(video_em, key)
                    if val > 0: 
                        total += val
                        count += 1
                
                if audio_em:
                    val = get_em(audio_em, key)
                    if val > 0:
                        total += val
                        count += 1
                        
                if text_em:
                    val = get_em(text_em, key)
                    if val > 0:
                        total += val
                        count += 1
                
                # Average
                if count > 0:
                    merged_emotions[norm_key] = merged_emotions.get(norm_key, 0.0) + (total / count)
            
            # Use merged emotions for scoring
            emotions = merged_emotions if merged_emotions else (video_em if isinstance(video_em, dict) else {})
            
            if isinstance(emotions, dict):
                # Normalize raw values
                joy = float(emotions.get("happy") or emotions.get("joy") or 0.0)
                sadness = float(emotions.get("sad") or emotions.get("sadness") or 0.0)
                anger = float(emotions.get("anger") or emotions.get("angry") or 0.0)
                fear = float(emotions.get("fear") or 0.0)
                disgust = float(emotions.get("disgust") or 0.0)
                surprise = float(emotions.get("surprise") or 0.0)
                neutral = float(emotions.get("neutral") or 0.0)
                contempt = float(emotions.get("contempt") or 0.0)

                # --- SCIENTIFIC METRIC FORMULAS ---
                confidence = (neutral + joy) - (fear + sadness + anger)
                clarity = neutral - (surprise + anger + fear)
                engagement = (joy + surprise + 0.1 * anger) + (1.0 - neutral) * 0.5
                resilience = 1.0 - (fear + sadness + disgust + contempt)

                # Clamp all scores to 0.0 - 1.0 range
                confidence = max(0.0, min(confidence, 1.0)) * 100.0
                clarity = max(0.0, min(clarity, 1.0)) * 100.0
                engagement = max(0.0, min(engagement, 1.0)) * 100.0
                resilience = max(0.0, min(resilience, 1.0)) * 100.0

                # Derive dominant emotion if API skipped it
                if not dominant_emotion and emotions:
                    dominant_emotion = max(emotions, key=emotions.get)
                
                print(f"📐 Derived scores: conf={confidence:.1f} clar={clarity:.1f} eng={engagement:.1f} res={resilience:.1f} dom={dominant_emotion}", flush=True)

        # Normalize scores to 0-1 range
        if confidence > 1.0: confidence /= 100.0
        if clarity > 1.0: clarity /= 100.0
        if resilience > 1.0: resilience /= 100.0
        if engagement > 1.0: engagement /= 100.0
        
        confidence = max(0.0, min(confidence, 1.0))
        clarity = max(0.0, min(clarity, 1.0))
        resilience = max(0.0, min(resilience, 1.0))
        engagement = max(0.0, min(engagement, 1.0))

        # -- Generate Dynamic Feedback --
        feedback_tips = []
        if engagement > 0.8:
            feedback_tips.append({"type": "positive", "text": "Excellent energy and variation throughout the response."})
        if confidence > 0.8:
            feedback_tips.append({"type": "positive", "text": "Demonstrated strong composure and confidence."})
        if clarity < 0.5:
            feedback_tips.append({"type": "neutral", "text": "Consider slowing down to improve clarity and articulation."})
        if resilience < 0.6:
            feedback_tips.append({"type": "negative", "text": "Detected signs of stress or hesitation. Try to maintain composure under pressure."})
        if engagement < 0.4:
            feedback_tips.append({"type": "negative", "text": "Vocal delivery was somewhat monotone. Try adding more expression."})
        if not feedback_tips:
            feedback_tips.append({"type": "positive", "text": "Good overall performance. Keep practicing to refine your delivery."})

        # Build the metrics blob for frontend
        metrics = {
            "confidence": confidence,
            "clarity": clarity,
            "resilience": resilience,
            "engagement": engagement,
            "timeline": real_timeline,
            "dominant_emotion": dominant_emotion,
            "raw_emotions": emotions if isinstance(emotions, dict) else {},
            "feedback_tips": feedback_tips
        }

        # 5. Save to DB
        db.query(AnalysisResult).filter(AnalysisResult.session_id == session_id).delete()
        analysis_result = AnalysisResult(
            session_id=session_id,
            transcript=transcript if transcript else "Analysis complete.",
            confidence_score=confidence,
            clarity_score=clarity,
            resilience_score=resilience,
            engagement_score=engagement,
            dominant_emotion=dominant_emotion,
            metrics_data=metrics
        )
        db.add(analysis_result)
        
        db_session = db.query(UserSession).filter(UserSession.id == session_id).first()
        if db_session:
            db_session.status = "completed"
            
        db.commit()
        print(f"✅ Analysis for Session {session_id} saved. Scores: conf={confidence:.2f}, eng={engagement:.2f}, clar={clarity:.2f}, res={resilience:.2f}", flush=True)

    except Exception as e:
        print(f"❌ Analysis Pipeline Failed for Session {session_id}: {e}", flush=True)
        db.rollback()
        db_session = db.query(UserSession).filter(UserSession.id == session_id).first()
        if db_session:
            db_session.status = "failed"
            db.commit()
    finally:
        db.close()
        if os.path.exists(temp_file):
            os.remove(temp_file)


# --- STATS SERVICE ---
from app.services.stats import StatsService

# --- ENDPOINTS ---

@router.get("/confidence")
def get_confidence_score(db: Session = Depends(get_db)):
    """
    Returns the user's current 'Confidence & Momentum' score.
    """
    return StatsService.calculate_confidence_score(db)


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
    # Fetch result and session
    result = db.query(AnalysisResult).filter(AnalysisResult.session_id == session_id).first()
    session = db.query(UserSession).filter(UserSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Fetch User if available
    candidate_name = "Candidate"
    if session.user_id:
        from app.db.models import User
        user = db.query(User).filter(User.id == session.user_id).first()
        if user and user.full_name:
            candidate_name = user.full_name

    # Check process status
    if not result:
        return {
            "status": session.status, 
            "data": None,
            "created_at": session.created_at,
            "candidate_name": candidate_name
        }
        
    # Merge existing result data with extra session info
    response_data = {
        "transcript": result.transcript,
        "confidence_score": result.confidence_score,
        "clarity_score": result.clarity_score,
        "resilience_score": result.resilience_score,
        "engagement_score": result.engagement_score,
        "dominant_emotion": result.dominant_emotion,
        "metrics_data": result.metrics_data,
        "created_at": session.created_at,
        "candidate_name": candidate_name,
        "video_key": session.video_s3_key # Useful if frontend needs it direct
    }
    
    return {"status": session.status, "data": response_data}