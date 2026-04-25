from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import CurrentUser, get_accessible_session, get_current_user
from app.db.base import get_db, SessionLocal
from app.db.models import Session as UserSession, AnalysisResult, CoachingPlan
from app.clients.imentiv import get_imentiv_client
from app.services.s3 import s3_service
from app.services.genai import genai_service
from app.services.analysis_jobs import enqueue_analysis_job
from app.core.config import settings
import os
import time

router = APIRouter()


def fetch_transcript_segments(client, audio_id, max_retries=8, initial_delay=1.5):
    """
    Fetches timestamped transcript segments from Imentiv's audio endpoint.
    Includes retry logic to wait for delayed sub-task completion and handle 500 bugs.
    """
    if not audio_id:
        return []
        
    import time
    delay = initial_delay
    try:
        session = client._base_client.session
        base_url = client.config.base_url.rstrip("/")
    except AttributeError:
        return []

    url = f"{base_url}/v1/audios/{audio_id}"
    for attempt in range(1, max_retries + 1):
        try:
            resp = session.get(url)
            if resp.status_code == 200:
                data = resp.json()
                segments = data.get("segment_text_emotions")
                if segments is not None:
                    return segments
            
            print(f"⏳ Audio transcript processing (status {resp.status_code}) — retrying in {delay:.1f}s (attempt {attempt}/{max_retries})...", flush=True)
        except Exception as e:
            print(f"⚠️ Transcript fetch error: {e} — retrying...", flush=True)
        
        time.sleep(delay)
        delay = min(delay * 1.4, 8.0)
        
    print(f"❌ Exhausted {max_retries} retries for transcript segments.", flush=True)
    return []


def run_real_pipeline(session_id: int):
    """
    Downloads video from MinIO → Uploads to Imentiv via official SDK →
    Polls for completion → Maps response to DB schema → Saves results.
    """
    db = SessionLocal()
    temp_file = f"/tmp/{session_id}.webm"
    
    try:
        print(f"🚀 [SESSION {session_id}] Starting Analysis Pipeline (Official SDK)", flush=True)
        
        # 1. Download video from MinIO / S3
        s3_service.s3_client.download_file(settings.S3_BUCKET_NAME, f"{session_id}.webm", temp_file)
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

        # 3. Brief pause for Imentiv backend to register the file
        time.sleep(1)

        # 4. Wait for analysis to complete, then fetch full results
        print(f"⏳ Waiting for Imentiv analysis to complete via SDK polling...", flush=True)
        
        try:
            results = client.video.get_results(video_id, wait=True, poll_interval=1.5)
            print(f"✅ Analysis completed natively via SDK!", flush=True)
        except Exception as e:
            raise RuntimeError(f"Analysis failed or timed out. Last err: {e}")
            
        print(f"📊 Collected response keys: {list(results.keys())}", flush=True)


        # 4. MAP RESPONSE TO DB SCHEMA
        #    Extract metrics defensively — default to 0.0 if missing
        
        # -- Overall Scores --
        confidence = float(results.get("confidence_score", 0.0))
        clarity = float(results.get("clarity_score", 0.0))
        resilience = float(results.get("resilience_score", 0.0))
        engagement = float(results.get("engagement_score", 0.0))
        emotions = {}
        
        # -- Dominant Emotion --
        dominant_emotion = results.get("dominant_emotion", None)
        if isinstance(dominant_emotion, dict):
            dominant_emotion = dominant_emotion.get("name", "neutral")
        
        # -- Transcript / Summary --
        summary = results.get("summary", "") 
        transcript = results.get("transcript", "")
        
        # Fetch Transcript Segments for UI
        audio_id = results.get("audio_id")
        raw_segments = fetch_transcript_segments(client, audio_id) or []
        transcript_segments = []
        for seg in raw_segments:
            transcript_segments.append({
                "start": seg.get("start_millis", 0) / 1000.0,
                "end": seg.get("end_millis", 0) / 1000.0,
                "text": seg.get("sentence", "").strip(),
                "emotion": seg.get("dominant_emotion", {}).get("label", "neutral"),
                "raw_emotions": seg.get("emotions", {})
            })
            
        # Reconstruct transcript from segments if not provided
        if not transcript and transcript_segments:
            transcript = " ".join([s["text"] for s in transcript_segments])
        elif not transcript:
            speaker_count = int(results.get("speaker_count", 0))
            if speaker_count == 0:
                transcript = "No speech detected in this recording."
        
        # -- Emotion Timeline --
        # V2 API drops the 'frames' array for video emotions. 
        # We synthesize the UI timeline using the text-sentiment array per-sentence instead.
        real_timeline = []
        for seg in transcript_segments:
            emotions = seg.get("raw_emotions", {})
            joy = float(emotions.get("joy") or emotions.get("happy") or 0.0)
            sadness = float(emotions.get("sadness") or emotions.get("sad") or 0.0)
            anger = float(emotions.get("anger") or emotions.get("angry") or 0.0)
            fear = float(emotions.get("fear") or 0.0)
            disgust = float(emotions.get("disgust") or 0.0)
            surprise = float(emotions.get("surprise") or 0.0)
            
            # Map text emotions to valence/arousal approximation
            valence = joy - (sadness + anger + fear + disgust)
            arousal = joy + anger + fear + surprise
            
            # Amplify signals to make chart distinct
            valence_amplified = valence * 1.5
            arousal_amplified = arousal * 1.5
            
            # Convert to UI scores [0, 100]
            valence_score = max(0, min(100, int((valence_amplified + 1.0) * 50.0))) 
            arousal_score = max(0, min(100, int(arousal_amplified * 100.0)))
            
            real_timeline.append({
                "timestamp": round(seg.get("start", 0), 1),
                "tone": valence_score,
                "energy": arousal_score,
            })
            
        # Pad timeline for very short videos (1 data point) to draw a line graph
        if len(real_timeline) == 1:
            pt = real_timeline[0]
            # Duplicate the point at 0s and an arbitrary end time (e.g. 5s later)
            real_timeline = [
                {"timestamp": 0.0, "tone": pt["tone"], "energy": pt["energy"]},
                {"timestamp": max(1.0, pt["timestamp"]), "tone": pt["tone"], "energy": pt["energy"]},
                {"timestamp": pt["timestamp"] + 3.0, "tone": pt["tone"], "energy": pt["energy"]}
            ]
        
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

        elif isinstance(results.get("emotions"), dict):
            emotions = results.get("emotions", {})
        elif isinstance(results.get("video_emotions"), dict):
            emotions = results.get("video_emotions", {})

        # Final safety clamp (scores are already in 0-1 range)
        
        confidence = max(0.0, min(confidence, 1.0))
        clarity = max(0.0, min(clarity, 1.0))
        resilience = max(0.0, min(resilience, 1.0))
        engagement = max(0.0, min(engagement, 1.0))

        # -- Generate Dynamic Feedback --
        feedback_tips = []

        # 1. Pacing & Pauses (Clarity + Transcript)
        avg_segment_duration = 0.0
        if transcript_segments:
            durations = [max(0, seg.get("end", 0) - seg.get("start", 0)) for seg in transcript_segments]
            avg_segment_duration = sum(durations) / len(durations)

        if clarity < 0.6 and avg_segment_duration > 6.0:
            feedback_tips.append({"type": "neutral", "text": "Your delivery is slow. Make sure you aren't pausing too long between thoughts to maintain conversational momentum."})
        elif clarity < 0.5:
            feedback_tips.append({"type": "neutral", "text": "Consider slowing down or enunciating more clearly to improve articulation."})

        # 2. Energy & Dominant Emotion (Engagement + Emotion)
        low_energy_emotions = ["neutral", "sadness", "sad", "fear"]
        if engagement < 0.5 and dominant_emotion in low_energy_emotions:
            feedback_tips.append({"type": "negative", "text": "Your expression is very flat or nervous. In behavioral interviews, conveying passion for your work is critical—try smiling more or varying your pitch."})
        elif engagement > 0.8:
            feedback_tips.append({"type": "positive", "text": "Excellent energy and variation throughout the response."})

        # 3. Composure (Resilience + Timeline Spikes)
        has_negative_spike = any(pt["tone"] < 35 for pt in real_timeline)
        ends_positive = False
        if real_timeline:
            ends_positive = real_timeline[-1]["tone"] >= 50
            
        if has_negative_spike and ends_positive:
            feedback_tips.append({"type": "positive", "text": "Great job recovering! You showed a moment of stress mid-answer but managed to finish strong and composed."})
        elif resilience < 0.6 and (dominant_emotion in ["fear", "sadness", "anger", "disgust"]):
            feedback_tips.append({"type": "negative", "text": "You appeared visibly stressed. Take a deep breath before answering; silence is better than rushing nervously."})

        # 4. Confidence & Positive Reinforcement
        if confidence > 0.8 and dominant_emotion in ["joy", "happy"]:
            feedback_tips.append({"type": "positive", "text": "Excellent confident delivery! Your positive demeanor makes your answer highly persuasive and engaging."})
        elif confidence > 0.7:
            feedback_tips.append({"type": "positive", "text": "Demonstrated strong composure and confidence."})

        if not feedback_tips:
            feedback_tips.append({"type": "positive", "text": "Good overall performance. Keep practicing to refine your delivery."})

        # -- Calculate Emotional Spikes from timeline --
        emotional_spikes = []
        if real_timeline:
            # Find max arousal (energy) moment
            max_arousal_pt = max(real_timeline, key=lambda x: x["energy"])
            if max_arousal_pt["energy"] > 75:
                emotional_spikes.append({"timestamp": max_arousal_pt["timestamp"], "type": "High Energy/Arousal", "value": max_arousal_pt["energy"]})
            
            # Find lowest valence (tone - most negative)
            min_valence_pt = min(real_timeline, key=lambda x: x["tone"])
            if min_valence_pt["tone"] < 35:
                emotional_spikes.append({"timestamp": min_valence_pt["timestamp"], "type": "Negative Shift", "value": min_valence_pt["tone"]})
                
            # Find highest valence (tone - most positive)
            max_valence_pt = max(real_timeline, key=lambda x: x["tone"])
            if max_valence_pt["tone"] > 75:
                emotional_spikes.append({"timestamp": max_valence_pt["timestamp"], "type": "Positive Spike", "value": max_valence_pt["tone"]})

        # Build the metrics blob for frontend
        metrics = {
            "confidence": confidence,
            "clarity": clarity,
            "resilience": resilience,
            "engagement": engagement,
            "timeline": real_timeline,
            "dominant_emotion": dominant_emotion,
            "raw_emotions": emotions if isinstance(emotions, dict) else {},
            "feedback_tips": feedback_tips,
            "transcript_segments": transcript_segments,
            "emotional_spikes": emotional_spikes
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
        import traceback
        err_trace = traceback.format_exc()
        print(f"❌ Analysis Pipeline Failed for Session {session_id}: {e}\n{err_trace}", flush=True)
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
def get_confidence_score(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns the user's current 'Confidence & Momentum' score.
    """
    return StatsService.calculate_confidence_score(db, user_id=current_user.id)


@router.post("/{session_id}/trigger")
def trigger_analysis(
    background_tasks: BackgroundTasks,
    db_session: UserSession = Depends(get_accessible_session),
    db: Session = Depends(get_db),
):
    return enqueue_analysis_job(db, db_session, background_tasks, run_real_pipeline)

@router.get("/{session_id}/result")
def get_analysis_result(db_session: UserSession = Depends(get_accessible_session), db: Session = Depends(get_db)):
    # Fetch result and session
    result = db.query(AnalysisResult).filter(AnalysisResult.session_id == db_session.id).first()
        
    # Fetch User if available
    candidate_name = "Candidate"
    if db_session.user_id:
        from app.db.models import User
        user = db.query(User).filter(User.id == db_session.user_id).first()
        if user and user.full_name:
            candidate_name = user.full_name

    # Check process status
    if not result:
        return {
            "status": db_session.status,
            "data": None,
            "created_at": db_session.created_at,
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
        "created_at": db_session.created_at,
        "candidate_name": candidate_name,
    }
    
    return {"status": db_session.status, "data": response_data}

@router.get("/coaching")
def get_coaching_plan(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns the user's most recent CoachingPlan to populate the dashboard.
    """
    plan = db.query(CoachingPlan).filter(CoachingPlan.user_id == current_user.id).order_by(CoachingPlan.created_at.desc()).first()
    if not plan:
        return {"status": "none", "data": None}
    
    return {
        "status": "success",
        "data": {
            "id": plan.id,
            "target_role": plan.target_role,
            "industry_benchmark_notes": plan.industry_benchmark_notes,
            "core_weakness": plan.core_weakness,
            "action_plan": plan.action_plan,
            "created_at": plan.created_at
        }
    }

from pydantic import BaseModel

class CoachingPlanRequest(BaseModel):
    target_role: str = ""
    company: str = ""

@router.post("/coaching/generate")
def generate_coaching_plan(req: CoachingPlanRequest, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Analyzes the last 3-5 sessions, calls GenAI to benchmark and build an action plan.
    """
    # 1. Fetch recent completed sessions with analysis results using a JOIN to prevent N+1 queries
    session_data = db.query(UserSession, AnalysisResult).join(
        AnalysisResult, UserSession.id == AnalysisResult.session_id
    ).filter(
        UserSession.status == "completed",
        UserSession.user_id == current_user.id,
    ).order_by(UserSession.created_at.desc()).limit(5).all()
    
    if not session_data:
        raise HTTPException(status_code=400, detail="Not enough completed sessions to analyze. Please complete at least one session.")
    
    # Try to grab the user's target role, default to Software Engineer if none
    # Use request inputs if provided, else fall back to user profile / defaults
    target_role = req.target_role.strip() or "Software Engineer"
    target_company = req.company.strip() or "FAANG"
    
    # 2. Build the session_data context String
    context_lines = []
    for s, res in session_data:
        metrics = res.metrics_data or {}
        feedback = metrics.get("feedback_tips", [])
        feedback_str = ", ".join([f["text"] for f in feedback])
        
        context_lines.append(f"--- Session ID: {s.id} ---")
        context_lines.append(f"Date: {s.created_at}")
        context_lines.append(f"Question Asked: {s.question_text}")
        context_lines.append(f"Transcript Snippet: {res.transcript[:200]}...")
        context_lines.append(f"Scores -> Confidence: {res.confidence_score:.2f}, Clarity: {res.clarity_score:.2f}, Resilience: {res.resilience_score:.2f}, Engagement: {res.engagement_score:.2f}")
        context_lines.append(f"Dominant Emotion: {res.dominant_emotion}")
        context_lines.append(f"AI Feedback Received: {feedback_str}")
        context_lines.append("")
        
    session_context_str = "\n".join(context_lines)
    if not session_context_str.strip():
        raise HTTPException(status_code=400, detail="Could not compile session data for analysis.")

    # 3. Call GenAI
    ai_response = genai_service.generate_coaching_plan(role=target_role, company=target_company, session_data=session_context_str)
    
    # 4. Save to DB
    new_plan = CoachingPlan(
        user_id=current_user.id,
        target_role=target_role,
        industry_benchmark_notes=ai_response.get("industry_benchmark_notes", "Benchmark unavailable."),
        core_weakness=ai_response.get("core_weakness", "Unknown weakness"),
        action_plan=ai_response.get("action_plan", "Practice more.")
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    
    return {"status": "success", "plan_id": new_plan.id}