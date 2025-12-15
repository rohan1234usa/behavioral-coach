import asyncio
import random
from sqlalchemy.orm import Session
from app.db.base import SessionLocal
from app.db.models import AnalysisResult, Session as UserSession

async def run_mock_pipeline(session_id: int):
    """
    Simulates AI processing:
    1. Waits 3 seconds
    2. Generates dummy metrics
    3. Saves to DB
    """
    print(f"Starting MOCK analysis for Session {session_id}...")
    
    # Simulate processing delay
    await asyncio.sleep(3)
    
    # 1. Generate Mock Metrics (High-level)
    confidence = random.uniform(65, 95)
    clarity = random.uniform(70, 90)
    resilience = random.uniform(50, 85)
    engagement = random.uniform(60, 100)
    
    # 2. Generate Mock Timeline Data for "Emotion Graph"
    # Logic: Create data points every 0.5 seconds for a 30-second video
    timeline = []
    for t in range(0, 60): 
        timestamp = t * 0.5
        timeline.append({
            "timestamp": timestamp,
            "valence": random.uniform(-0.5, 0.8), # Happy vs Sad
            "arousal": random.uniform(0.1, 0.9),  # Energy level
            "is_stressed": random.choice([True, False]) if random.random() > 0.85 else False
        })
        
    mock_data = {
        "timeline": timeline,
        "feedback_tips": [
            "You maintained good eye contact in the first half.",
            "Try to slow down when explaining complex topics."
        ]
    }

    # 3. Save to Database
    # Note: We create a new DB session because this runs in the background
    db: Session = SessionLocal()
    try:
        new_result = AnalysisResult(
            session_id=session_id,
            confidence_score=confidence,
            clarity_score=clarity,
            resilience_score=resilience,
            engagement_score=engagement,
            metrics_data=mock_data
        )
        db.add(new_result)
        
        # Mark Session as Completed
        session_record = db.query(UserSession).filter(UserSession.id == session_id).first()
        if session_record:
            session_record.status = "completed"
            
        db.commit()
        print(f"Analysis for Session {session_id} COMPLETED.")
    except Exception as e:
        print(f"Error saving mock results: {e}")
        db.rollback()
    finally:
        db.close()
