import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database.models.conversation import Base

class ArenaMatch(Base):
    __tablename__ = "arena_matches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True)
    prompt = Column(Text)
    model_a = Column(String)
    model_b = Column(String)
    winner = Column(String, nullable=True) # "model_a", "model_b", "tie"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ModelRating(Base):
    __tablename__ = "model_ratings"

    model_name = Column(String, primary_key=True, index=True)
    rating = Column(Float, default=1200.0)
    matches_played = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
