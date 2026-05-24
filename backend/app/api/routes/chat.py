from fastapi import APIRouter, HTTPException, Request
from sse_starlette.sse import EventSourceResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.providers.registry import ProviderRegistry

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
async def chat_completions(request: ChatRequest, req: Request):
    auth_header = req.headers.get("Authorization")
    api_key = None
    if auth_header and auth_header.startswith("Bearer "):
        parts = auth_header.split(" ")
        if len(parts) > 1:
            api_key = parts[1]
    if api_key == "not-needed" or not api_key:
        api_key = None

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
                tavily_api_key=request.tavily_api_key,
                exa_api_key=request.exa_api_key
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
async def get_models(provider: str, req: Request):
    auth_header = req.headers.get("Authorization")
    api_key = None
    if auth_header and auth_header.startswith("Bearer "):
        parts = auth_header.split(" ")
        if len(parts) > 1:
            api_key = parts[1]
    if api_key == "not-needed" or not api_key:
        api_key = None

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

