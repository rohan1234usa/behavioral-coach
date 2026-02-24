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


def fetch_transcript_with_retry(client, results, max_retries=10, initial_delay=3.0):
    """
    Fetches transcript from Imentiv text/audio endpoints with retry logic.
    The v1/texts and v1/audios endpoints return 500 initially but eventually
    return 200 — this is a known Imentiv bug. Per their recommendation,
    we treat 500/422/404 the same and keep retrying.
    """
    text_id = results.get("text_id")
    audio_id = results.get("audio_id")

    if not text_id and not audio_id:
        print("⚠️ No text_id or audio_id in results — skipping transcript fetch", flush=True)
        return ""

    # Access the SDK's internal session for authenticated requests
    try:
        session = client._base_client.session
        base_url = client.config.base_url.rstrip("/")
    except AttributeError:
        print("⚠️ Could not access SDK internal session — skipping transcript fetch", flush=True)
        return ""

    # Build ordered list of endpoints to try
    endpoints = []
    if text_id:
        endpoints.append((f"{base_url}/v1/texts/{text_id}", "text", text_id))
    if audio_id:
        endpoints.append((f"{base_url}/v1/audios/{audio_id}", "audio", audio_id))

    for url, source_type, source_id in endpoints:
        delay = initial_delay
        for attempt in range(1, max_retries + 1):
            try:
                print(f"🔄 Transcript fetch attempt {attempt}/{max_retries} "
                      f"from {source_type} ({source_id[:8]}...) ...", flush=True)
                resp = session.get(url)

                if resp.status_code == 200:
                    data = resp.json()
                    # Extract transcript — try common field names
                    transcript = (
                        data.get("transcript") or
                        data.get("text") or
                        data.get("summary") or
                        data.get("content") or
                        ""
                    )
                    if transcript:
                        print(f"✅ Transcript retrieved on attempt {attempt} "
                              f"from {source_type} ({len(transcript)} chars)", flush=True)
                        return transcript
                    else:
                        print(f"⚠️ Got 200 but no transcript content in response keys: "
                              f"{list(data.keys())}", flush=True)

                # Treat 500, 422, 404 the same — retry (per Imentiv dev recommendation)
                print(f"⏳ Got {resp.status_code} — retrying in {delay:.1f}s ...", flush=True)

            except Exception as e:
                print(f"⚠️ Transcript fetch error: {e} — retrying in {delay:.1f}s ...", flush=True)

            time.sleep(delay)
            delay = min(delay * 1.5, 30.0)  # Exponential backoff, cap at 30s

        print(f"❌ Exhausted {max_retries} retries for {source_type} endpoint", flush=True)

    print("❌ All transcript endpoints exhausted — using fallback", flush=True)
    return ""


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
        try:
            results = client.video.get_results(video_id, wait=True, poll_interval=3.0)
        except Exception as sdk_err:
            # The SDK sometimes fails to parse the response (e.g. 'audio'
            # field is not a dict). Fall back to raw JSON via the internal
            # HTTP session, bypassing Pydantic validation.
            print(f"⚠️ SDK get_results() failed ({sdk_err}), falling back to raw HTTP...", flush=True)
            try:
                session_http = client._base_client.session
                base_url = client.config.base_url.rstrip("/")
                # Corrected endpoint suffix
                fallback_url = f"{base_url}/v2/videos/{video_id}/multimodal-analytics"
                print(f"🔄 Fetching raw results from: {fallback_url}", flush=True)
                raw_resp = session_http.get(fallback_url)
                
                if raw_resp.status_code == 422:
                    print(f"❌ Server returned 422: {raw_resp.text}", flush=True)
                
                raw_resp.raise_for_status()
                results = raw_resp.json()
                print(f"✅ Raw fallback succeeded, keys: {list(results.keys())}", flush=True)
            except Exception as fallback_err:
                # Capture the response text if available to help debug 422s
                err_context = ""
                if 'raw_resp' in locals() and raw_resp is not None:
                    err_context = f" | Status: {raw_resp.status_code} | Body: {raw_resp.text[:500]}"
                
                raise RuntimeError(
                    f"Both SDK and raw fallback failed. SDK: {sdk_err} | Raw: {fallback_err}{err_context}"
                )
        
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
        # First check if SDK response already has it, otherwise retry the raw endpoints
        transcript = results.get("summary", "") or results.get("transcript", "")
        speaker_count = int(results.get("speaker_count", 0))
        if not transcript and speaker_count > 0:
            print("📝 No transcript in SDK response — fetching with retry...", flush=True)
            transcript = fetch_transcript_with_retry(client, results)
        elif not transcript and speaker_count == 0:
            print("🔇 No speakers detected (speaker_count=0) — skipping transcript retry", flush=True)
            transcript = "No speech detected in this recording."
        
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

                # --- IMPROVED METRIC FORMULAS ---
                # Each formula uses a weighted ratio approach so that
                # small amounts of negative emotion don't collapse the
                # score to 0, and scores differentiate meaningfully.

                # Confidence: high when calm/happy, low when fearful/sad/angry
                pos_conf = neutral * 0.5 + joy * 0.5
                neg_conf = fear * 0.4 + sadness * 0.3 + anger * 0.3
                confidence = pos_conf / max(pos_conf + neg_conf, 0.01)

                # Clarity: high when composed (neutral/joy), low when agitated
                pos_clar = neutral * 0.6 + joy * 0.2
                neg_clar = surprise * 0.3 + anger * 0.35 + fear * 0.35
                clarity = pos_clar / max(pos_clar + neg_clar, 0.01)

                # Engagement: high when expressive, low when flat/neutral
                expressive = joy * 0.5 + surprise * 0.25 + anger * 0.1 + fear * 0.05 + sadness * 0.1
                flat = neutral * 1.0
                engagement = expressive / max(expressive + flat * 0.5, 0.01)

                # Resilience: high when composed under pressure (inverse of distress)
                distress = fear * 0.35 + sadness * 0.30 + disgust * 0.20 + contempt * 0.15
                composure = 1.0 - min(distress * 2.5, 1.0)
                resilience = composure

                # Clamp all scores to 0.0 - 1.0 range
                confidence = max(0.0, min(confidence, 1.0))
                clarity = max(0.0, min(clarity, 1.0))
                engagement = max(0.0, min(engagement, 1.0))
                resilience = max(0.0, min(resilience, 1.0))

                # Derive dominant emotion if API skipped it
                if not dominant_emotion and emotions:
                    dominant_emotion = max(emotions, key=emotions.get)
                
                print(f"📐 Derived scores: conf={confidence:.1f} clar={clarity:.1f} eng={engagement:.1f} res={resilience:.1f} dom={dominant_emotion}", flush=True)

        # Final safety clamp (scores are already in 0-1 range)
        
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
            transcript=transcript if transcript else "No transcript available.",
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
    # Generate a concise AI summary from the metrics
    metrics = result.metrics_data or {}
    dom = result.dominant_emotion or "neutral"
    conf_pct = round((result.confidence_score or 0) * 100)
    eng_pct = round((result.engagement_score or 0) * 100)
    clar_pct = round((result.clarity_score or 0) * 100)
    res_pct = round((result.resilience_score or 0) * 100)
    
    summary_parts = []
    summary_parts.append(f"Dominant emotion detected: {dom.capitalize()}.")
    if conf_pct >= 70:
        summary_parts.append(f"Strong confidence at {conf_pct}%.")
    elif conf_pct >= 40:
        summary_parts.append(f"Moderate confidence at {conf_pct}%.")
    else:
        summary_parts.append(f"Low confidence at {conf_pct}% — consider practicing composure.")
    if eng_pct >= 80:
        summary_parts.append(f"Excellent engagement ({eng_pct}%).")
    if clar_pct < 40:
        summary_parts.append(f"Clarity needs improvement ({clar_pct}%).")
    if res_pct >= 70:
        summary_parts.append(f"Good resilience under pressure ({res_pct}%).")
    
    ai_summary = " ".join(summary_parts)
    
    response_data = {
        "transcript": result.transcript,
        "summary": ai_summary,
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