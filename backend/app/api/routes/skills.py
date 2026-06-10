from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.skills.registry import skill_registry
from app.skills.executor import skill_executor
from app.skills.categories import SkillCategory
from app.core.auth import get_current_user
from app.database.models.user import User

router = APIRouter()

class TestSkillRequest(BaseModel):
    arguments: Dict[str, Any]

@router.get("")
async def list_skills(
    category: Optional[str] = None,
    enabled_only: bool = False,
    q: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """List all available skills with search and category filtering."""
    if not skill_registry._loaded:
        skill_registry.discover()
        
    cat_enum = None
    if category:
        try:
            cat_enum = SkillCategory(category)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: '{category}'")

    if q:
        # Search skills semantically
        search_results = skill_registry.search(q, category=cat_enum)
        skills = []
        for skill, score in search_results:
            if enabled_only and not skill_registry.is_enabled(skill.name):
                continue
            skills.append({**skill.to_metadata(), "score": score})
        return skills
    else:
        # List regular
        all_skills = skill_registry.list_all(category=cat_enum, enabled_only=enabled_only)
        return [skill.to_metadata() for skill in all_skills]

@router.get("/categories")
async def get_categories(current_user: User = Depends(get_current_user)):
    """Get summarized counts of total and enabled skills per category."""
    if not skill_registry._loaded:
        skill_registry.discover()
    return skill_registry.get_categories_summary()

@router.get("/{name}")
async def get_skill(name: str, current_user: User = Depends(get_current_user)):
    """Retrieve details and schema of a specific skill."""
    if not skill_registry._loaded:
        skill_registry.discover()
    skill = skill_registry.get(name)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found.")
    return skill.to_metadata()

@router.put("/{name}/enable")
async def enable_skill(name: str, current_user: User = Depends(get_current_user)):
    """Enable a skill."""
    if not skill_registry._loaded:
        skill_registry.discover()
    success = skill_registry.enable(name)
    if not success:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found.")
    return {"status": "success", "message": f"Skill '{name}' enabled.", "enabled": True}

@router.put("/{name}/disable")
async def disable_skill(name: str, current_user: User = Depends(get_current_user)):
    """Disable a skill."""
    if not skill_registry._loaded:
        skill_registry.discover()
    success = skill_registry.disable(name)
    if not success:
        raise HTTPException(status_code=404, detail=f"Skill '{name}' not found.")
    return {"status": "success", "message": f"Skill '{name}' disabled.", "enabled": False}

@router.post("/{name}/test")
async def test_skill(
    name: str,
    payload: TestSkillRequest,
    current_user: User = Depends(get_current_user)
):
    """Execute a skill directly for testing purposes."""
    result = await skill_executor.execute_skill(
        skill_name=name,
        arguments=payload.arguments,
        user_id=current_user.id if current_user else "default_user"
    )
    return {
        "success": result.success,
        "data": result.data,
        "skill_name": result.skill_name,
        "execution_time_ms": result.execution_time_ms,
        "error": result.error,
        "metadata": result.metadata
    }
