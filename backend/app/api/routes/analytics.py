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

@router.get("/history")
async def get_analytics_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get 30-day token usage and cost history.
    """
    try:
        # SQLite compatible date string parsing
        # Grouping by day
        history = db.query(
            func.date(UsageRecord.created_at).label('date'),
            func.sum(UsageRecord.prompt_tokens + UsageRecord.completion_tokens).label('tokens'),
            func.sum(UsageRecord.cost_estimate).label('cost')
        ).filter(
            UsageRecord.user_id == str(current_user.id)
        ).group_by(
            func.date(UsageRecord.created_at)
        ).order_by(
            func.date(UsageRecord.created_at).asc()
        ).limit(30).all()
        
        history_data = [{"date": h[0], "tokens": h[1] or 0, "cost": h[2] or 0.0} for h in history]
        return {
            "status": "success",
            "history": history_data
        }
    except Exception as e:
        logger.error(f"Error fetching analytics history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/skills")
async def get_skill_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get invocation count and stats for skills/tools.
    """
    try:
        # Query usage records containing a non-null skill name
        records = db.query(
            UsageRecord.skill_name,
            func.count(UsageRecord.id).label('count'),
            func.avg(UsageRecord.latency_ms).label('avg_latency')
        ).filter(
            UsageRecord.user_id == str(current_user.id),
            UsageRecord.skill_name.isnot(None)
        ).group_by(
            UsageRecord.skill_name
        ).all()
        
        skills_map = {}
        for r in records:
            if not r[0]:
                continue
            names = r[0].split(",")
            count = r[1]
            avg_latency = r[2] or 0.0
            for name in names:
                name = name.strip()
                if not name:
                    continue
                if name not in skills_map:
                    skills_map[name] = {"count": 0, "avg_latency_sum": 0.0, "occurrences": 0}
                skills_map[name]["count"] += count
                skills_map[name]["avg_latency_sum"] += avg_latency * count
                skills_map[name]["occurrences"] += count
                
        skills_data = []
        for name, info in skills_map.items():
            avg_lat = info["avg_latency_sum"] / info["occurrences"] if info["occurrences"] > 0 else 0.0
            skills_data.append({
                "name": name,
                "count": info["count"],
                "avg_latency_ms": avg_lat
            })
            
        skills_data.sort(key=lambda x: x["count"], reverse=True)
        
        return {
            "status": "success",
            "skills": skills_data
        }
    except Exception as e:
        logger.error(f"Error fetching skill analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
