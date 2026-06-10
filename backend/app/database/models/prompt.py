import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from app.database.models.conversation import Base

class PromptTemplate(Base):
    __tablename__ = "prompt_templates"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), index=True)
    title = Column(String, index=True)
    content = Column(Text)
    variables = Column(Text, nullable=True) # JSON list or comma-separated list of placeholder tags
    tags = Column(Text, nullable=True) # Comma-separated categories
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
