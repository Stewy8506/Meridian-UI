from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)
from app.database.session import get_db
from app.database.models.user import User

router = APIRouter()

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserUpdate(BaseModel):
    username: Optional[str] = None
    avatar_url: Optional[str] = None

from typing import Optional

@router.get("/status")
async def get_auth_status():
    """Check if authentication is enabled on the server."""
    return {"auth_enabled": settings.AUTH_ENABLED}

@router.post("/signup", response_model=TokenResponse)
async def signup(payload: UserRegister, db: Session = Depends(get_db)):
    """Create a new user account."""
    if not settings.AUTH_ENABLED:
        # Auth disabled, return a mock session
        return {
            "access_token": "not-needed",
            "token_type": "bearer",
            "user": {"id": "default_user", "email": "guest@workspace.local", "username": "Guest", "is_admin": True}
        }

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Create new user
    is_first = db.query(User).count() == 0
    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=get_password_hash(payload.password),
        is_active=True,
        is_admin=is_first
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate token
    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "username": user.username, "is_admin": user.is_admin}
    }

@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and return a token."""
    if not settings.AUTH_ENABLED:
        # Auth disabled, return a mock session
        return {
            "access_token": "not-needed",
            "token_type": "bearer",
            "user": {"id": "default_user", "email": "guest@workspace.local", "username": "Guest", "is_admin": True}
        }

    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "username": user.username, "avatar_url": user.avatar_url, "is_admin": user.is_admin}
    }

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get profile of current authenticated user."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "avatar_url": current_user.avatar_url,
        "is_guest": not settings.AUTH_ENABLED,
        "is_admin": current_user.is_admin
    }

@router.put("/me")
async def update_me(payload: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update profile details of current user."""
    if not settings.AUTH_ENABLED:
        # In guest mode, update the default guest user
        guest_user = db.query(User).filter(User.id == "default_user").first()
        if guest_user:
            if payload.username:
                guest_user.username = payload.username
            if payload.avatar_url:
                guest_user.avatar_url = payload.avatar_url
            db.commit()
            db.refresh(guest_user)
            return {"id": guest_user.id, "email": guest_user.email, "username": guest_user.username, "avatar_url": guest_user.avatar_url, "is_admin": True}
        raise HTTPException(status_code=404, detail="Guest user not initialized")

    if payload.username:
        current_user.username = payload.username
    if payload.avatar_url:
        current_user.avatar_url = payload.avatar_url
        
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "avatar_url": current_user.avatar_url,
        "is_admin": current_user.is_admin
    }
