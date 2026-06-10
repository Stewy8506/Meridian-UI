import datetime
from sqlalchemy import Column, String, DateTime, JSON
from app.database.models.conversation import Base

class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    key = Column(String, primary_key=True, index=True)
    value = Column(JSON, nullable=True) # Serialized config setting payload
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
