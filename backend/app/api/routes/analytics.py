import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.auth import get_current_user
from app.database.session import get_db
from app.database.models.user import User
from app.database.models.usage import UsageRecord

logger = logging.getLogger("app.api.routes.analytics")
router = APIRouter()

@router.get("/summary")
async def get_analytics_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get summary metrics for the analytics dashboard.
    """
    try:
        # For sqlite, we can do some simple aggregations
        total_tokens = db.query(
            func.sum(UsageRecord.prompt_tokens + UsageRecord.completion_tokens)
        ).filter(UsageRecord.user_id == str(current_user.id)).scalar() or 0
        
        total_cost = db.query(
            func.sum(UsageRecord.cost_estimate)
        ).filter(UsageRecord.user_id == str(current_user.id)).scalar() or 0.0
        
        avg_latency = db.query(
            func.avg(UsageRecord.latency_ms)
        ).filter(UsageRecord.user_id == str(current_user.id)).scalar() or 0.0

        # Popular models
        model_counts = db.query(
            UsageRecord.model, func.count(UsageRecord.id).label('count')
        ).filter(UsageRecord.user_id == str(current_user.id))\
         .group_by(UsageRecord.model)\
         .order_by(func.count(UsageRecord.id).desc())\
         .limit(5).all()
         
        models_data = [{"name": m[0], "count": m[1]} for m in model_counts]

        # Cost by provider
        provider_costs = db.query(
            UsageRecord.provider, func.sum(UsageRecord.cost_estimate).label('cost')
        ).filter(UsageRecord.user_id == str(current_user.id))\
         .group_by(UsageRecord.provider).all()
         
        providers_data = [{"name": p[0], "value": p[1] or 0} for p in provider_costs]

        return {
            "status": "success",
            "summary": {
                "total_tokens": total_tokens,
                "total_cost": total_cost,
                "avg_latency_ms": avg_latency
            },
            "models": models_data,
            "providers": providers_data
        }
    except Exception as e:
        logger.error(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
