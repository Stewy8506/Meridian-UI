import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from app.database.models.conversation import Base

class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    definition = Column(Text) # JSON string representation of list of steps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
