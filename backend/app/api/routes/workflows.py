from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse
import json
import uuid
from typing import List, Dict, Any, Optional
from app.core.auth import get_current_user
from app.database.session import get_db
from app.database.models.user import User, UserApiKey
from app.database.models.workflow import Workflow
from app.providers.registry import ProviderRegistry

router = APIRouter()

class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    definition: List[Dict[str, Any]] # Steps: [{id, prompt, provider, model}]

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    definition: Optional[List[Dict[str, Any]]] = None

class WorkflowRunRequest(BaseModel):
    input: str

@router.get("")
async def get_workflows(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all prompt chain workflows owned by the current user.
    """
    workflows = db.query(Workflow).filter(Workflow.user_id == str(current_user.id)).all()
    return {
        "status": "success",
        "workflows": [
            {
                "id": w.id,
                "name": w.name,
                "description": w.description,
                "definition": json.loads(w.definition),
                "created_at": w.created_at
            } for w in workflows
        ]
    }

@router.post("")
async def create_workflow(
    payload: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new prompt chain workflow.
    """
    db_w = Workflow(
        id=str(uuid.uuid4()),
        user_id=str(current_user.id),
        name=payload.name,
        description=payload.description,
        definition=json.dumps(payload.definition)
    )
    db.add(db_w)
    db.commit()
    db.refresh(db_w)
    return {
        "status": "success", 
        "workflow": {
            "id": db_w.id,
            "name": db_w.name,
            "description": db_w.description,
            "definition": payload.definition,
            "created_at": db_w.created_at
        }
    }

@router.put("/{workflow_id}")
async def update_workflow(
    workflow_id: str,
    payload: WorkflowUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a workflow definition or metadata.
    """
    db_w = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == str(current_user.id)
    ).first()
    if not db_w:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    if payload.name is not None:
        db_w.name = payload.name
    if payload.description is not None:
        db_w.description = payload.description
    if payload.definition is not None:
        db_w.definition = json.dumps(payload.definition)
        
    db.commit()
    db.refresh(db_w)
    return {
        "status": "success",
        "workflow": {
            "id": db_w.id,
            "name": db_w.name,
            "description": db_w.description,
            "definition": json.loads(db_w.definition),
            "created_at": db_w.created_at
        }
    }

@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a workflow.
    """
    db_w = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == str(current_user.id)
    ).first()
    if not db_w:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    db.delete(db_w)
    db.commit()
    return {"status": "success", "message": "Workflow deleted"}

@router.post("/{workflow_id}/run")
async def run_workflow(
    workflow_id: str,
    payload: WorkflowRunRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute a prompt chain workflow sequentially and stream step outputs via SSE.
    """
    db_w = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == str(current_user.id)
    ).first()
    if not db_w:
        raise HTTPException(status_code=404, detail="Workflow not found")

    steps = json.loads(db_w.definition)

    async def event_generator():
        variables = {"input": payload.input}
        
        for idx, step in enumerate(steps):
            step_id = step.get("id", f"step_{idx+1}")
            raw_prompt = step.get("prompt", "")
            provider = step.get("provider", "")
            model = step.get("model", "")
            
            # Substitute variables in prompt
            compiled_prompt = raw_prompt
            for var_name, var_val in variables.items():
                compiled_prompt = compiled_prompt.replace(f"{{{{{var_name}}}}}", var_val)
                
            yield {
                "event": "step_start",
                "data": json.dumps({
                    "step_index": idx,
                    "step_id": step_id,
                    "prompt": compiled_prompt,
                    "model": model
                })
            }
            
            # Retrieve provider credential keys
            db_key = db.query(UserApiKey).filter(
                UserApiKey.user_id == current_user.id,
                UserApiKey.provider_name == provider
            ).first()
            api_key = db_key.decrypt_key() if db_key else None
            
            try:
                provider_instance = ProviderRegistry.get_provider(provider, api_key=api_key)
                if not provider_instance:
                    raise ValueError(f"Provider {provider} not found")
                    
                step_output = ""
                messages = [{"role": "user", "content": compiled_prompt}]
                
                async for chunk in provider_instance.stream(
                    messages=messages,
                    model=model,
                    user_id=current_user.id if current_user else "default_user"
                ):
                    step_output += chunk
                    yield {
                        "event": "step_chunk",
                        "data": json.dumps({
                            "step_index": idx,
                            "content": chunk
                        })
                    }
                
                # Store output text for subsequent step interpolation references
                variables[f"{step_id}_output"] = step_output
                
                yield {
                    "event": "step_end",
                    "data": json.dumps({
                        "step_index": idx,
                        "output": step_output
                    })
                }
            except Exception as e:
                yield {
                    "event": "step_error",
                    "data": json.dumps({
                        "step_index": idx,
                        "error": str(e)
                    })
                }
                break
                
        yield {
            "event": "workflow_end",
            "data": json.dumps({
                "status": "success",
                "variables": variables
            })
        }

    return EventSourceResponse(event_generator())
