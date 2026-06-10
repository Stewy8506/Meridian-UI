from fastapi import APIRouter, HTTPException, Request, Depends
from sse_starlette.sse import EventSourceResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.providers.registry import ProviderRegistry
from app.core.auth import get_current_user
from app.database.session import get_db
from app.database.models.user import User, UserApiKey
from sqlalchemy.orm import Session

router = APIRouter()

class ChatRequest(BaseModel):
    provider: str
    model: str
    messages: List[Dict[str, Any]]
    temperature: Optional[float] = 0.7
    search_provider: Optional[str] = "tavily"
    tavily_api_key: Optional[str] = None
    exa_api_key: Optional[str] = None

@router.post("/completions")
async def chat_completions(
    request: ChatRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch provider API key from database if stored
    db_key = db.query(UserApiKey).filter(
        UserApiKey.user_id == current_user.id,
        UserApiKey.provider_name == request.provider
    ).first()
    api_key = db_key.decrypt_key() if db_key else None

    # Fetch search API keys from database if stored
    tavily_db_key = db.query(UserApiKey).filter(
        UserApiKey.user_id == current_user.id,
        UserApiKey.provider_name == "tavily"
    ).first()
    exa_db_key = db.query(UserApiKey).filter(
        UserApiKey.user_id == current_user.id,
        UserApiKey.provider_name == "exa"
    ).first()

    tavily_api_key = tavily_db_key.decrypt_key() if tavily_db_key else request.tavily_api_key
    exa_api_key = exa_db_key.decrypt_key() if exa_db_key else request.exa_api_key

    try:
        provider_instance = ProviderRegistry.get_provider(request.provider, api_key=api_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    if not provider_instance:
        raise HTTPException(status_code=400, detail="Provider not found")
        
    async def event_generator():
        try:
            async for chunk in provider_instance.stream(
                messages=request.messages,
                model=request.model,
                temperature=request.temperature,
                search_provider=request.search_provider,
                tavily_api_key=tavily_api_key,
                exa_api_key=exa_api_key,
                user_id=current_user.id if current_user else "default_user"
            ):
                if await req.is_disconnected():
                    break
                yield {
                    "event": "message",
                    "data": chunk
                }
            yield {
                "event": "done",
                "data": "[DONE]"
            }
        except Exception as e:
            yield {
                "event": "error",
                "data": str(e)
            }

    return EventSourceResponse(event_generator())

@router.get("/models")
async def get_models(
    provider: str,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch provider API key from database if stored
    db_key = db.query(UserApiKey).filter(
        UserApiKey.user_id == current_user.id,
        UserApiKey.provider_name == provider
    ).first()
    api_key = db_key.decrypt_key() if db_key else None

    try:
        provider_instance = ProviderRegistry.get_provider(provider, api_key=api_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    if not provider_instance:
        raise HTTPException(status_code=400, detail="Provider not found")
        
    try:
        models = await provider_instance.get_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

