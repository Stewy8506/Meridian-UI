from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database.models.conversation import Base

class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    provider = Column(String, index=True)
    model = Column(String, index=True)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    latency_ms = Column(Float, default=0.0)
    cost_estimate = Column(Float, default=0.0)
    skill_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
