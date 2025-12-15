import asyncio
import random
import traceback # Import traceback to see errors in Docker logs
from sqlalchemy.orm import Session
from app.db.base import SessionLocal
from app.db.models import AnalysisResult, Session as UserSession

async def run_mock_pipeline(session_id: int):
    """
    Robust mock analysis that catches errors and manages its own DB session.
    """
    print(f"--- [Background Task] Starting Analysis for Session {session_id} ---")
    
    # Create a fresh DB session for this background thread
    db: Session = SessionLocal()
    
    try:
        # 1. Simulate Processing Delay
        await asyncio.sleep(3)
        
        # 2. Generate Mock Metrics
        confidence = random.uniform(65, 95)
        clarity = random.uniform(70, 90)
        resilience = random.uniform(50, 85)
        engagement = random.uniform(60, 100)
        
        # 3. Generate Timeline
        timeline = []
        for t in range(0, 30): # 30 data points
            timeline.append({
                "timestamp": t * 1.0,
                "valence": random.uniform(-0.5, 0.8),
                "arousal": random.uniform(0.1, 0.9),
                "is_stressed": random.choice([True, False]) if random.random() > 0.85 else False
            })
            
        mock_data = {
            "timeline": timeline,
            "feedback_tips": [
                "Good eye contact during the introduction.",
                "You spoke a bit fast around the 15-second mark.",
                "Excellent recovery after the hesitation."
            ]
        }

        # 4. Save to Database
        # Check if result already exists to avoid Unique Constraint errors
        existing_result = db.query(AnalysisResult).filter(AnalysisResult.session_id == session_id).first()
        if not existing_result:
            new_result = AnalysisResult(
                session_id=session_id,
                confidence_score=confidence,
                clarity_score=clarity,
                resilience_score=resilience,
                engagement_score=engagement,
                metrics_data=mock_data
            )
            db.add(new_result)

        # 5. Mark Session as Completed
        session_record = db.query(UserSession).filter(UserSession.id == session_id).first()
        if session_record:
            session_record.status = "completed"
            
        db.commit()
        print(f"--- [Background Task] Session {session_id} COMPLETED successfully ---")

    except Exception as e:
        print(f"!!! [Background Task] FAILED: {str(e)}")
        traceback.print_exc() # Print full error to Docker logs
        
        # IMPORTANT: Mark status as failed so Frontend stops loading
        db.rollback()
        session_record = db.query(UserSession).filter(UserSession.id == session_id).first()
        if session_record:
            session_record.status = "failed"
            db.commit()
            
    finally:
        db.close()