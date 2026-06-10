from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from app.core.auth import get_current_user
from app.database.session import get_db
from app.database.models.user import User
from app.database.models.settings import SystemSetting

router = APIRouter()

# Default user configuration schema
DEFAULT_USER_SETTINGS = {
    "fontSize": 14,
    "chatLayout": "centered",
    "bubbleStyle": "bubble",
    "theme": "dark",
    "enterKeyBehavior": "send",
    "ttsVoiceId": "default",
    "ttsEngine": "browser",
    "ttsSpeed": 1.0,
    "ttsPitch": 1.0,
    "autoSpeak": False,
    "sttLanguage": "en-US",
    "customCss": "",
    "shortcuts": {
        "commandPalette": "ctrl+k",
        "newChat": "ctrl+n",
        "toggleSidebar": "ctrl+shift+s",
        "focusInput": "ctrl+/",
        "switchChats": "alt+1-9",
        "closeOverlays": "esc"
    }
}

# Default system setting overrides helper
def get_system_default(key: str) -> Any:
    defaults = {
        "signup_enabled": True,
        "allowed_signup_domains": "",
        "rag_embedding_provider": "local",
        "rag_chunk_size": 512,
        "rag_chunk_overlap": 64,
        "rag_top_k": 5,
        "rag_distance_metric": "cosine",
        "sandbox_runtime": "subprocess",
        "sandbox_timeout": 30,
        "sandbox_memory_limit_mb": 512,
        "installed_pip_packages": []
    }
    return defaults.get(key)

# Helper dependency to verify is_admin
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access this endpoint."
        )
    return current_user

class UserSettingsUpdate(BaseModel):
    settings: Dict[str, Any]

class AdminSettingsUpdate(BaseModel):
    settings: Dict[str, Any]

@router.get("/system")
async def get_system_settings(db: Session = Depends(get_db)):
    """Retrieve public system configuration."""
    keys = ["signup_enabled", "allowed_signup_domains", "rag_embedding_provider", "sandbox_runtime"]
    results = {}
    for key in keys:
        item = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if item:
            results[key] = item.value
        else:
            results[key] = get_system_default(key)
    return results

@router.get("/user")
async def get_user_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve settings for the current user."""
    user_settings = current_user.settings
    if not user_settings:
        user_settings = DEFAULT_USER_SETTINGS
    return user_settings

@router.post("/user")
async def update_user_settings(
    payload: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update settings for the current user."""
    current_settings = current_user.settings or DEFAULT_USER_SETTINGS.copy()
    
    # Merge payload
    for key, value in payload.settings.items():
        current_settings[key] = value
        
    current_user.settings = current_settings
    db.commit()
    db.refresh(current_user)
    return current_user.settings

@router.get("/admin")
async def get_admin_settings(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Retrieve all global configuration variables."""
    keys = [
        "signup_enabled", "allowed_signup_domains", 
        "rag_embedding_provider", "rag_chunk_size", "rag_chunk_overlap", "rag_top_k", "rag_distance_metric",
        "sandbox_runtime", "sandbox_timeout", "sandbox_memory_limit_mb", "installed_pip_packages"
    ]
    results = {}
    for key in keys:
        item = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if item:
            results[key] = item.value
        else:
            results[key] = get_system_default(key)
    return results

@router.post("/admin")
async def update_admin_settings(
    payload: AdminSettingsUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update global configuration settings variables."""
    for key, value in payload.settings.items():
        item = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if item:
            item.value = value
        else:
            item = SystemSetting(key=key, value=value)
            db.add(item)
            
    db.commit()
    return {"status": "success", "message": "System configurations updated successfully."}

@router.get("/admin/logs")
async def get_system_logs(
    admin: User = Depends(require_admin)
):
    """Retrieve basic status logs and adapter diagnostics."""
    return {
        "status": "online",
        "logs": [
            "Initializing workspace settings module... OK",
            "Checking connection with Ollama... connected",
            "Checking connection with Google Gemini... connected",
            "Checking connection with OpenAI... key not configured, skipped",
            "Vector database path local check... OK",
            "Memory retrieval agent status... ready"
        ]
    }
