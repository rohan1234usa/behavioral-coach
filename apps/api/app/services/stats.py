from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.db.models import AnalysisResult, Session as UserSession
from datetime import datetime, timedelta

class StatsService:
    @staticmethod
    def calculate_confidence_score(db: Session, user_id: int = None):
        """
        Calculates the 'Confidence & Momentum' Score.
        Formula: (Potential * 0.7) + (Momentum * 0.3)
        """
        
        # 1. POTENTIAL (70%): Average of Top 3 Best Confidence Scores
        # We query all analysis results (optionally filtered by user_id if we had auth)
        # Since we don't have real auth yet, we'll calculate global stats or assume single user for MVP.
        
        top_scores = db.query(AnalysisResult.confidence_score)\
            .join(UserSession)\
            .filter(UserSession.status == 'completed')\
            .order_by(desc(AnalysisResult.confidence_score))\
            .limit(3)\
            .all()
            
        potential_score = 0.0
        if top_scores:
            scores = [s[0] for s in top_scores]
            potential_score = sum(scores) / len(scores)
        
        # 2. MOMENTUM (30%): Activity in the last 7 days
        # 1 session = 10pts, 2 = 20pts, 3+ = 30pts
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_sessions_count = db.query(UserSession)\
            .filter(UserSession.created_at >= seven_days_ago)\
            .filter(UserSession.status == 'completed')\
            .count()
            
        momentum_score = min(recent_sessions_count * 10, 30)
        
        # 3. Final Calculation
        # Potential (0-100) * 0.7 -> Max 70
        # Momentum (0-30) * 1.0 -> Max 30
        final_score = (potential_score * 0.7) + momentum_score
        
        # 4. Message Generation
        message = "Start practicing to build your score!"
        if final_score >= 90:
            message = "You are Interview Ready! Maintenance mode."
        elif final_score >= 75:
            if momentum_score < 30:
                message = "Great potential! Warm up to unlock your full score."
            else:
                message = "Looking strong. Keep polishing those answers."
        elif final_score > 0:
            message = "Good start. Focus on quality to raise your potential."
            
        return {
            "score": round(final_score),
            "breakdown": {
                "potential": round(potential_score),
                "momentum": momentum_score,
                "recent_sessions": recent_sessions_count
            },
            "message": message
        }
