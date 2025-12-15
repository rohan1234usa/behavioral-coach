from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Nullable for guest users in MVP
    
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
    
    # Metrics defined in PRD Section 6
    confidence_score = Column(Float) 
    clarity_score = Column(Float)    
    resilience_score = Column(Float) 
    engagement_score = Column(Float) 
    
    # Complex JSON data for graphs
    metrics_data = Column(JSONB)
    
    session = relationship("Session", back_populates="analysis")
