import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from app.core.auth import get_current_user
from app.database.session import get_db
from app.database.models.user import User
from app.database.models.prompt import PromptTemplate

router = APIRouter()

DEFAULT_PROMPTS = [
    {
        "title": "Refactor Code Blocks",
        "content": "Refactor the following {{language}} code to make it more {{aspect}} (e.g. optimized, secure, readable):\n\n```{{language}}\n{{code}}\n```",
        "tags": "coding,opt"
    },
    {
        "title": "Concept Explainer",
        "content": "Explain the technical concept of {{concept}} to a {{audience_level}} (e.g. beginner, expert) using clear examples and analogies.",
        "tags": "learning,writing"
    },
    {
        "title": "Unit Test Generator",
        "content": "Write complete and thorough unit tests in {{framework}} (e.g. pytest, jest) covering positive, negative, and edge cases for this function:\n\n{{code}}",
        "tags": "coding,test"
    }
]

class PromptCreate(BaseModel):
    title: str
    content: str
    tags: Optional[str] = ""

class PromptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[str] = None

def extract_variables(text: str) -> str:
    # Find all occurrences of {{variable_name}}
    vars = re.findall(r'\{\{([a-zA-Z0-9_]+)\}\}', text)
    # Return unique comma-separated variable list
    return ",".join(list(set(vars)))

def seed_prompts_if_empty(db: Session, user_id: str):
    count = db.query(PromptTemplate).filter(PromptTemplate.user_id == user_id).count()
    if count == 0:
        for p in DEFAULT_PROMPTS:
            vars = extract_variables(p["content"])
            db_p = PromptTemplate(
                id=str(uuid.uuid4()),
                user_id=user_id,
                title=p["title"],
                content=p["content"],
                variables=vars,
                tags=p["tags"]
            )
            db.add(db_p)
        db.commit()

@router.get("")
async def get_prompts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all prompt templates owned by the user. Seeds defaults if empty.
    """
    seed_prompts_if_empty(db, str(current_user.id))
    prompts = db.query(PromptTemplate).filter(
        PromptTemplate.user_id == str(current_user.id)
    ).order_by(PromptTemplate.title.asc()).all()
    
    return {
        "status": "success",
        "prompts": [
            {
                "id": p.id,
                "title": p.title,
                "content": p.content,
                "variables": p.variables.split(",") if p.variables else [],
                "tags": p.tags.split(",") if p.tags else []
            } for p in prompts
        ]
    }

@router.post("")
async def create_prompt(
    payload: PromptCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new prompt template and extract variables automatically.
    """
    vars = extract_variables(payload.content)
    db_p = PromptTemplate(
        id=str(uuid.uuid4()),
        user_id=str(current_user.id),
        title=payload.title,
        content=payload.content,
        variables=vars,
        tags=payload.tags or ""
    )
    db.add(db_p)
    db.commit()
    db.refresh(db_p)
    return {"status": "success", "prompt": db_p}

@router.put("/{prompt_id}")
async def update_prompt(
    prompt_id: str,
    payload: PromptUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a prompt template. Recalculates variables list.
    """
    db_p = db.query(PromptTemplate).filter(
        PromptTemplate.id == prompt_id,
        PromptTemplate.user_id == str(current_user.id)
    ).first()
    
    if not db_p:
        raise HTTPException(status_code=404, detail="Prompt template not found.")
        
    if payload.title is not None:
        db_p.title = payload.title
    if payload.content is not None:
        db_p.content = payload.content
        db_p.variables = extract_variables(payload.content)
    if payload.tags is not None:
        db_p.tags = payload.tags
        
    db.commit()
    db.refresh(db_p)
    return {"status": "success", "prompt": db_p}

@router.delete("/{prompt_id}")
async def delete_prompt(
    prompt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a prompt template.
    """
    db_p = db.query(PromptTemplate).filter(
        PromptTemplate.id == prompt_id,
        PromptTemplate.user_id == str(current_user.id)
    ).first()
    
    if not db_p:
        raise HTTPException(status_code=404, detail="Prompt template not found.")
        
    db.delete(db_p)
    db.commit()
    return {"status": "success", "message": "Prompt template deleted."}
