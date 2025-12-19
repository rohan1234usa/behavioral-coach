from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    target_role = Column(String, nullable=True) 

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    question_text = Column(String)
    video_s3_key = Column(String)
    
    # Status: 'created', 'uploading', 'processing', 'completed', 'failed'
    status = Column(String, default="created") 
    created_at = Column(DateTime, server_default=func.now())
    
    analysis = relationship("AnalysisResult", back_populates="session", uselist=False)

class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), unique=True)
    
    # Text-based insights
    transcript = Column(Text, nullable=True) 
    
    # Metrics
    confidence_score = Column(Float, default=0.0) 
    clarity_score = Column(Float, default=0.0)    
    resilience_score = Column(Float, default=0.0) 
    engagement_score = Column(Float, default=0.0) 
    
    # Full JSON blob for frontend charts
    metrics_data = Column(JSONB)
    
    session = relationship("Session", back_populates="analysis")