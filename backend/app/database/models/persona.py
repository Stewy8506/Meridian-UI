import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Float, Text, Boolean, ForeignKey
from app.database.models.conversation import Base

class Persona(Base):
    __tablename__ = "personas"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True) # Null for built-in system presets
    name = Column(String, index=True)
    avatar = Column(String, nullable=True) # Icon name or URL
    system_prompt = Column(Text)
    default_model = Column(String, nullable=True)
    temperature = Column(Float, default=0.7)
    greeting = Column(Text, nullable=True) # Initial message displayed on session start
    is_system_preset = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
