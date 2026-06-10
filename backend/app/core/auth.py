import datetime
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader
import jwt
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.session import get_db
from app.database.models.user import User

import bcrypt

# Use APIKeyHeader to avoid forcing redirect/credentials popup in browser if not authenticated, 
# and make it optional (auto_error=False) so guest requests work.
api_key_header = APIKeyHeader(name="Authorization", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=60) # 1 hour default
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.AUTH_SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def get_current_user(
    token: Optional[str] = Depends(api_key_header),
    db: Session = Depends(get_db)
) -> Optional[User]:
    # If auth is disabled, return a mock user so that db operations still work
    if not settings.AUTH_ENABLED:
        mock_user = db.query(User).filter(User.id == "default_user").first()
        if not mock_user:
            # Create a default guest user in DB if it doesn't exist
            mock_user = User(
                id="default_user",
                email="guest@workspace.local",
                username="Guest",
                hashed_password=get_password_hash("guest-no-password"),
                is_active=True
            )
            db.add(mock_user)
            db.commit()
            db.refresh(mock_user)
        return mock_user

    # If auth is enabled, validate JWT
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception

    # Extract Bearer prefix
    if token.startswith("Bearer "):
        token = token[7:]
    elif token.startswith("bearer "):
        token = token[7:]

    try:
        payload = jwt.decode(token, settings.AUTH_SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user
