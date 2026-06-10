from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from app.core.auth import get_current_user
from app.database.session import get_db
from app.database.models.user import User
from app.database.models.persona import Persona

router = APIRouter()

# Default built-in presets
BUILTIN_PRESETS = [
    {
        "name": "Default Assistant",
        "avatar": "sparkles",
        "system_prompt": "You are a helpful, precise, and sophisticated AI assistant. Format your answers beautifully in Markdown.",
        "default_model": "",
        "temperature": 0.7,
        "greeting": "Hello! How can I help you today?"
    },
    {
        "name": "Code Reviewer",
        "avatar": "code",
        "system_prompt": "You are a senior staff software engineer and code reviewer. Analyze the code provided for security issues, runtime complexity, code cleanliness, and architectural soundness. Provide constructive, actionable feedback and suggest optimized refactored blocks.",
        "default_model": "",
        "temperature": 0.3,
        "greeting": "I am your Senior Code Reviewer. Share a code snippet or request architectural feedback, and I'll analyze it for you."
    },
    {
        "name": "Research Assistant",
        "avatar": "book-open",
        "system_prompt": "You are an elite scientific research assistant. Summarize literature, analyze mathematical equations, verify claims using empirical logic, and draft structured academic content. Cite hypotheses and preserve rigorous analytical clarity.",
        "default_model": "",
        "temperature": 0.5,
        "greeting": "I am your Research Assistant. Let's draft technical reports, analyze research papers, or summarize scientific concepts."
    },
    {
        "name": "Creative Writer",
        "avatar": "pen-tool",
        "system_prompt": "You are a highly creative novelist and ghostwriter. Craft rich narratives, descriptive character profiles, and engaging dialogues. Focus on tone modulation, metaphor creation, and dramatic pacing.",
        "default_model": "",
        "temperature": 0.9,
        "greeting": "I am your Creative Writer. What characters, outlines, or fictional plots are we bringing to life today?"
    },
    {
        "name": "Technical Interviewer",
        "avatar": "user-check",
        "system_prompt": "You are a tech lead conducting a whiteboard coding interview. State a software design or algorithmic problem, and guide the candidate step-by-step. Do not provide the solution all at once; ask clarifying questions, assess code correctness, and review edge cases.",
        "default_model": "",
        "temperature": 0.6,
        "greeting": "Let's begin your technical interview. Are you ready for an algorithmic problem or a system design challenge?"
    },
    {
        "name": "Socratic Tutor",
        "avatar": "help-circle",
        "system_prompt": "You are a Socratic educator. Instead of giving answers directly, guide students to discover the truth themselves by asking thought-provoking questions, highlighting logic gaps, and breaking down complex problems incrementally.",
        "default_model": "",
        "temperature": 0.7,
        "greeting": "Welcome! Tell me what topic or homework problem you are stuck on, and let's explore it together."
    },
    {
        "name": "Data Analyst",
        "avatar": "bar-chart-2",
        "system_prompt": "You are a staff data scientist and SQL expert. Write efficient databases queries, design clean data schemas, and draft python code using pandas/numpy for statistical data transformations.",
        "default_model": "",
        "temperature": 0.4,
        "greeting": "Data Analyst ready. Provide a CSV structure, SQL schema, or python task, and let's run statistics."
    }
]

class PersonaCreate(BaseModel):
    name: str
    avatar: Optional[str] = "user"
    system_prompt: str
    default_model: Optional[str] = ""
    temperature: Optional[float] = 0.7
    greeting: Optional[str] = None

class PersonaUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    system_prompt: Optional[str] = None
    default_model: Optional[str] = None
    temperature: Optional[float] = None
    greeting: Optional[str] = None

def seed_presets_if_empty(db: Session):
    for p in BUILTIN_PRESETS:
        existing = db.query(Persona).filter(
            Persona.is_system_preset == True,
            Persona.name == p["name"]
        ).first()
        if not existing:
            db_p = Persona(
                id=str(uuid.uuid4()),
                name=p["name"],
                avatar=p["avatar"],
                system_prompt=p["system_prompt"],
                default_model=p["default_model"],
                temperature=p["temperature"],
                greeting=p["greeting"],
                is_system_preset=True
            )
            db.add(db_p)
    db.commit()

@router.get("")
async def get_personas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all available personas (built-in + user-created).
    """
    seed_presets_if_empty(db)
    
    # Query user-defined personas + system presets
    personas = db.query(Persona).filter(
        (Persona.is_system_preset == True) | (Persona.user_id == str(current_user.id))
    ).order_by(Persona.is_system_preset.desc(), Persona.name.asc()).all()
    
    return {
        "status": "success",
        "personas": [
            {
                "id": p.id,
                "name": p.name,
                "avatar": p.avatar,
                "system_prompt": p.system_prompt,
                "default_model": p.default_model,
                "temperature": p.temperature,
                "greeting": p.greeting,
                "is_system_preset": p.is_system_preset
            } for p in personas
        ]
    }

@router.post("")
async def create_persona(
    payload: PersonaCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new custom user persona.
    """
    db_p = Persona(
        id=str(uuid.uuid4()),
        user_id=str(current_user.id),
        name=payload.name,
        avatar=payload.avatar or "user",
        system_prompt=payload.system_prompt,
        default_model=payload.default_model or "",
        temperature=payload.temperature if payload.temperature is not None else 0.7,
        greeting=payload.greeting,
        is_system_preset=False
    )
    db.add(db_p)
    db.commit()
    db.refresh(db_p)
    return {"status": "success", "persona": db_p}

@router.put("/{persona_id}")
async def update_persona(
    persona_id: str,
    payload: PersonaUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a user persona.
    """
    db_p = db.query(Persona).filter(
        Persona.id == persona_id,
        Persona.user_id == str(current_user.id)
    ).first()
    
    if not db_p:
        raise HTTPException(status_code=404, detail="Persona not found or permission denied.")
        
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(db_p, k, v)
        
    db.commit()
    db.refresh(db_p)
    return {"status": "success", "persona": db_p}

@router.delete("/{persona_id}")
async def delete_persona(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a user persona.
    """
    db_p = db.query(Persona).filter(
        Persona.id == persona_id,
        Persona.user_id == str(current_user.id)
    ).first()
    
    if not db_p:
        raise HTTPException(status_code=404, detail="Persona not found or permission denied.")
        
    db.delete(db_p)
    db.commit()
    return {"status": "success", "message": "Persona deleted successfully."}
