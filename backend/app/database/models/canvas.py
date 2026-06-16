import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database.models.conversation import Base

class CanvasDocument(Base):
    __tablename__ = "canvas_documents"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), index=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=True, index=True)
    knowledge_base_id = Column(String, ForeignKey("knowledge_bases.id"), nullable=True, index=True)
    filename = Column(String, index=True)
    content = Column(Text)
    language = Column(String, default="markdown")
    version = Column(Integer, default=1)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    versions = relationship("CanvasVersion", back_populates="document", cascade="all, delete-orphan")
    knowledge_base = relationship("KnowledgeBase", back_populates="notes")

class CanvasVersion(Base):
    __tablename__ = "canvas_versions"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("canvas_documents.id"), index=True)
    content = Column(Text)
    version_num = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("CanvasDocument", back_populates="versions")
