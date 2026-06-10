from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.database.session import get_db
from app.database.models.user import User, UserApiKey
from app.providers.registry import ProviderRegistry
from typing import List

router = APIRouter()

class ApiKeySave(BaseModel):
    provider: str
    key: str

@router.get("")
async def list_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List the providers for which the user has configured API keys (does not return the keys themselves)."""
    keys = db.query(UserApiKey).filter(UserApiKey.user_id == current_user.id).all()
    return [{"provider": k.provider_name, "created_at": k.created_at} for k in keys]

@router.post("")
async def save_key(
    payload: ApiKeySave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save an API key for a provider, encrypted at rest."""
    provider = payload.provider.strip().lower()
    key = payload.key.strip()
    
    if not key:
        raise HTTPException(status_code=400, detail="API key cannot be empty.")
        
    # Check if this is a valid provider
    valid_providers = ["google", "openai"] # expand as more providers are added
    if provider not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider: '{provider}'")

    # Check for existing key
    db_key = db.query(UserApiKey).filter(
        UserApiKey.user_id == current_user.id,
        UserApiKey.provider_name == provider
    ).first()
    
    encrypted_val = UserApiKey.encrypt_key(key)
    
    if db_key:
        db_key.encrypted_api_key = encrypted_val
    else:
        db_key = UserApiKey(
            user_id=current_user.id,
            provider_name=provider,
            encrypted_api_key=encrypted_val
        )
        db.add(db_key)
        
    db.commit()
    return {"status": "success", "message": f"API key for {provider} saved successfully."}

@router.delete("/{provider}")
async def delete_key(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete the saved API key for a provider."""
    provider = provider.strip().lower()
    db_key = db.query(UserApiKey).filter(
        UserApiKey.user_id == current_user.id,
        UserApiKey.provider_name == provider
    ).first()
    
    if not db_key:
        raise HTTPException(status_code=404, detail=f"No API key found for provider '{provider}'.")
        
    db.delete(db_key)
    db.commit()
    return {"status": "success", "message": f"API key for {provider} deleted."}

@router.get("/{provider}/test")
async def test_key(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test the validity of a saved provider API key by fetching models list."""
    provider = provider.strip().lower()
    
    db_key = db.query(UserApiKey).filter(
        UserApiKey.user_id == current_user.id,
        UserApiKey.provider_name == provider
    ).first()
    
    # Try using saved key, or fall back to system environment variables
    api_key = db_key.decrypt_key() if db_key else None
    
    try:
        provider_instance = ProviderRegistry.get_provider(provider, api_key=api_key)
        if not provider_instance:
            return {"status": "error", "message": f"Could not initialize provider {provider}"}
            
        models = await provider_instance.get_models()
        return {"status": "success", "message": f"Connection verified. Found {len(models)} models."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
