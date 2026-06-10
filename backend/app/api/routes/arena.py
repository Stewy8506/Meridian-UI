import asyncio
import json
from typing import AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from app.providers.registry import ProviderRegistry
from app.core.auth import get_current_user
from app.database.session import get_db
from app.database.models.user import User, UserApiKey
from app.database.models.arena import ArenaMatch, ModelRating
from sqlalchemy.orm import Session

router = APIRouter()

class ArenaBattleRequest(BaseModel):
    model_a: str
    provider_a: str
    model_b: str
    provider_b: str
    prompt: str

class ArenaVoteRequest(BaseModel):
    prompt: str
    model_a: str
    model_b: str
    winner: str # "model_a", "model_b", "tie"

@router.post("/battle")
async def arena_battle(
    request: ArenaBattleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute a prompt on two models concurrently and yield chunks
    via Server-Sent Events (SSE).
    """
    key_a = db.query(UserApiKey).filter(
        UserApiKey.user_id == current_user.id,
        UserApiKey.provider_name == request.provider_a
    ).first()
    api_key_a = key_a.decrypt_key() if key_a else None

    key_b = db.query(UserApiKey).filter(
        UserApiKey.user_id == current_user.id,
        UserApiKey.provider_name == request.provider_b
    ).first()
    api_key_b = key_b.decrypt_key() if key_b else None

    try:
        prov_a = ProviderRegistry.get_provider(request.provider_a, api_key=api_key_a)
        prov_b = ProviderRegistry.get_provider(request.provider_b, api_key=api_key_b)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not prov_a or not prov_b:
        raise HTTPException(status_code=400, detail="Provider not found")

    messages = [{"role": "user", "content": request.prompt}]

    async def event_generator():
        queue = asyncio.Queue()
        active_tasks = 2

        async def stream_provider(prov, model, label):
            nonlocal active_tasks
            try:
                async for chunk in prov.stream(
                    messages=messages,
                    model=model,
                    user_id=current_user.id if current_user else "default_user"
                ):
                    await queue.put({"model": label, "content": chunk})
            except Exception as e:
                await queue.put({"model": label, "error": str(e)})
            finally:
                active_tasks -= 1
                if active_tasks == 0:
                    await queue.put(None) # Sentinel

        # Start streaming tasks concurrently
        asyncio.create_task(stream_provider(prov_a, request.model_a, "model_a"))
        asyncio.create_task(stream_provider(prov_b, request.model_b, "model_b"))

        while True:
            item = await queue.get()
            if item is None:
                break
            yield {
                "event": "message",
                "data": json.dumps(item)
            }
        
        yield {
            "event": "done",
            "data": "[DONE]"
        }

    return EventSourceResponse(event_generator())

@router.post("/vote")
async def arena_vote(
    request: ArenaVoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Log user vote and update the Elo ratings for both models.
    """
    if request.winner not in ["model_a", "model_b", "tie"]:
        raise HTTPException(status_code=400, detail="Invalid winner choice")

    # Record the match logs
    match = ArenaMatch(
        user_id=str(current_user.id),
        prompt=request.prompt,
        model_a=request.model_a,
        model_b=request.model_b,
        winner=request.winner
    )
    db.add(match)

    # Get or create Elo rating records
    rating_a = db.query(ModelRating).filter(ModelRating.model_name == request.model_a).first()
    if not rating_a:
        rating_a = ModelRating(model_name=request.model_a, rating=1200.0, matches_played=0)
        db.add(rating_a)

    rating_b = db.query(ModelRating).filter(ModelRating.model_name == request.model_b).first()
    if not rating_b:
        rating_b = ModelRating(model_name=request.model_b, rating=1200.0, matches_played=0)
        db.add(rating_b)

    db.flush()

    r_a = rating_a.rating
    r_b = rating_b.rating

    # Expected Elo scores
    exp_a = 1.0 / (1.0 + 10.0 ** ((r_b - r_a) / 400.0))
    exp_b = 1.0 / (1.0 + 10.0 ** ((r_a - r_b) / 400.0))

    # Actual scores
    if request.winner == "model_a":
        score_a = 1.0
        score_b = 0.0
    elif request.winner == "model_b":
        score_a = 0.0
        score_b = 1.0
    else:
        score_a = 0.5
        score_b = 0.5

    # Update Elo rating stats (K = 32)
    k_factor = 32
    rating_a.rating = r_a + k_factor * (score_a - exp_a)
    rating_b.rating = r_b + k_factor * (score_b - exp_b)

    rating_a.matches_played += 1
    rating_b.matches_played += 1

    db.commit()
    db.refresh(rating_a)
    db.refresh(rating_b)

    return {
        "status": "success",
        "ratings": {
            request.model_a: round(rating_a.rating, 1),
            request.model_b: round(rating_b.rating, 1)
        }
    }

@router.get("/leaderboard")
async def get_arena_leaderboard(
    db: Session = Depends(get_db)
):
    """
    Retrieve Elo ratings leaderboard.
    """
    ratings = db.query(ModelRating).order_by(ModelRating.rating.desc()).all()
    return {
        "status": "success",
        "leaderboard": [
            {
                "model_name": r.model_name,
                "rating": round(r.rating, 1),
                "matches_played": r.matches_played
            } for r in ratings
        ]
    }
