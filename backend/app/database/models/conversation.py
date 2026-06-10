from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Integer
from sqlalchemy.orm import declarative_base, relationship
import datetime

Base = declarative_base()

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True) # Nullable for guest/local modes
    title = Column(String, default="New Chat")
    system_prompt = Column(Text, nullable=True)
    model = Column(String, nullable=True)
    provider = Column(String, nullable=True)
    is_pinned = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    tags = Column(Text, nullable=True) # JSON array as string
    token_count = Column(Integer, default=0)
    parent_conversation_id = Column(String, nullable=True)
    branch_point_index = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    user = relationship("User", back_populates="conversations")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, index=True)
    conversation_id = Column(String, ForeignKey("conversations.id"))
    role = Column(String)  # 'user', 'assistant', 'system', 'tool'
    content = Column(Text)
    extra_metadata = Column(Text, nullable=True) # JSON object as string for token counts, latency, reactions, skill usage
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")
