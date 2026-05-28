from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship
import datetime

Base = declarative_base()

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, default="New Chat")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, index=True)
    conversation_id = Column(String, ForeignKey("conversations.id"))
    role = Column(String)  # 'user', 'assistant', 'system', 'tool'
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")
