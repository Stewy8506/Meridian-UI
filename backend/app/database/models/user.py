import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship, declarative_base
from cryptography.fernet import Fernet
from app.core.config import settings
from app.database.models.conversation import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("UserApiKey", back_populates="user", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="user", cascade="all, delete-orphan")

class UserApiKey(Base):
    __tablename__ = "user_api_keys"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    provider_name = Column(String, nullable=False) # e.g., 'openai', 'google'
    encrypted_api_key = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="api_keys")

    @classmethod
    def encrypt_key(cls, plain_key: str) -> str:
        f = cls._get_fernet()
        return f.encrypt(plain_key.encode()).decode()

    def decrypt_key(self) -> str:
        f = self._get_fernet()
        return f.decrypt(self.encrypted_api_key.encode()).decode()

    @staticmethod
    def _get_fernet() -> Fernet:
        key = getattr(settings, "ENCRYPTION_KEY", None)
        if not key:
            # Fallback 32-byte url-safe base64 key for safety
            key = b'yL3z6p2N4r7s9t1u2v3w4x5y6z7a8b9c1d2e3f4g5h6='
        else:
            if isinstance(key, str):
                key = key.encode()
        try:
            return Fernet(key)
        except Exception:
            return Fernet(b'yL3z6p2N4r7s9t1u2v3w4x5y6z7a8b9c1d2e3f4g5h6=')

class Memory(Base):
    __tablename__ = "memories"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True) # Nullable for guest/local modes
    fact_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="memories")
