from fastapi import APIRouter, HTTPException, Request, Depends
from sse_starlette.sse import EventSourceResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.providers.registry import ProviderRegistry
from app.core.auth import get_current_user
from app.database.session import get_db
from app.database.models.user import User, UserApiKey
from app.database.models.knowledge import KnowledgeBase
from sqlalchemy.orm import Session
import time
from app.core.pricing import calculate_token_cost
from app.database.models.usage import UsageRecord

router = APIRouter()

class ChatRequest(BaseModel):
    provider: str
    model: str
    messages: List[Dict[str, Any]]
    temperature: Optional[float] = 0.7
    search_provider: Optional[str] = "tavily"
    tavily_api_key: Optional[str] = None
    exa_api_key: Optional[str] = None
    knowledge_base_ids: Optional[List[str]] = None
    conversation_id: Optional[str] = None

def estimate_tokens(text: str) -> int:
    # ~4 characters per token as a rough average heuristic
    return max(1, len(text) // 4)

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

    # RAG Context Retrieval
    context_str = ""
    if request.knowledge_base_ids:
        # Verify ownership of requested knowledge bases
        kbs = db.query(KnowledgeBase).filter(
            KnowledgeBase.id.in_(request.knowledge_base_ids),
            KnowledgeBase.user_id == current_user.id
        ).all()
        
        verified_kb_ids = [kb.id for kb in kbs]
        if verified_kb_ids:
            # Get latest user message to query with
            query = ""
            for msg in reversed(request.messages):
                if msg.get("role") == "user":
                    query = msg.get("content", "")
                    break
            
            if query:
                from app.rag.retriever import Retriever
                collection_names = [f"kb_{kb_id}" for kb_id in verified_kb_ids]
                
                # Fetch relevant chunks (run synchronous CPU bound work inside to_thread if needed,
                # but direct execution is fine for fast local vector stores or fallback)
                import asyncio
                results = await asyncio.to_thread(
                    Retriever.retrieve_context,
                    query,
                    collection_names,
                    5,
                    api_key,
                    request.provider
                )
                context_str = Retriever.format_context(results)

    # Inject context into latest user message if retrieved
    if context_str:
        messages_copy = [dict(msg) for msg in request.messages]
        for msg in reversed(messages_copy):
            if msg.get("role") == "user":
                msg["content"] = f"{context_str}\n\nUser Question:\n{msg.get('content', '')}"
                break
    else:
        messages_copy = request.messages

    try:
        provider_instance = ProviderRegistry.get_provider(request.provider, api_key=api_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    if not provider_instance:
        raise HTTPException(status_code=400, detail="Provider not found")
        
    # Calculate input text & tokens
    input_text = ""
    for m in messages_copy:
        input_text += m.get("content", "") or ""
    input_tokens = estimate_tokens(input_text)

    async def event_generator():
        start_time = time.time()
        output_text = ""
        try:
            async for chunk in provider_instance.stream(
                messages=messages_copy,
                model=request.model,
                temperature=request.temperature,
                search_provider=request.search_provider,
                tavily_api_key=tavily_api_key,
                exa_api_key=exa_api_key,
                user_id=current_user.id if current_user else "default_user",
                conversation_id=request.conversation_id
            ):
                if await req.is_disconnected():
                    break
                output_text += chunk
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
        finally:
            # Calculate metrics and record usage statistics
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000.0
            output_tokens = estimate_tokens(output_text)
            
            # Find if skills were called
            skill_names = [msg.get("name") for msg in messages_copy if msg.get("role") == "tool" and msg.get("name")]
            skill_name = ",".join(skill_names) if skill_names else None
            
            # Calculate cost estimate
            cost = calculate_token_cost(request.provider, request.model, input_tokens, output_tokens)
            
            try:
                usage = UsageRecord(
                    user_id=str(current_user.id),
                    provider=request.provider,
                    model=request.model,
                    prompt_tokens=input_tokens,
                    completion_tokens=output_tokens,
                    latency_ms=latency_ms,
                    cost_estimate=cost,
                    skill_name=skill_name
                )
                db.add(usage)
                db.commit()
            except Exception as db_err:
                import logging
                logging.getLogger("app.api.routes.chat").error(f"Failed to log usage record: {db_err}")

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
        import logging
        logging.getLogger("app.api.routes.chat").warning(f"Failed to fetch models for {provider}: {e}")
        return {"models": []}


