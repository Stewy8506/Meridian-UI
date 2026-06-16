from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.database.session import get_db
from app.database.models.user import User
from app.database.models.knowledge import KnowledgeBase, Document
from app.rag.vector_store import vector_store
from pydantic import BaseModel
from typing import List, Optional, Any
import datetime
import asyncio
from app.database.models.canvas import CanvasDocument
from app.rag.retriever import Retriever
from app.providers.registry import ProviderRegistry
from app.database.models.user import UserApiKey

router = APIRouter()

class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None

class NotebookActionRequest(BaseModel):
    action_type: str
    provider: str = "openai"
    model: str = "gpt-4o-mini"

class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    chunk_count: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class NoteResponse(BaseModel):
    id: str
    filename: str
    content: str
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class KnowledgeBaseResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime.datetime
    document_count: int = 0

    class Config:
        from_attributes = True

class KnowledgeBaseDetailResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime.datetime
    documents: List[DocumentResponse] = []
    notes: List[NoteResponse] = []

    class Config:
        from_attributes = True

@router.get("", response_model=List[KnowledgeBaseResponse])
async def list_knowledge_bases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all knowledge bases owned by the authenticated user."""
    kbs = db.query(KnowledgeBase).filter(KnowledgeBase.user_id == current_user.id).all()
    
    response = []
    for kb in kbs:
        response.append(
            KnowledgeBaseResponse(
                id=kb.id,
                name=kb.name,
                description=kb.description,
                created_at=kb.created_at,
                document_count=len(kb.documents)
            )
        )
    return response

@router.post("", response_model=KnowledgeBaseResponse)
async def create_knowledge_base(
    payload: KnowledgeBaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new, isolated knowledge base collection."""
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
        
    kb = KnowledgeBase(
        user_id=current_user.id,
        name=name,
        description=payload.description
    )
    db.add(kb)
    db.commit()
    db.refresh(kb)
    
    return KnowledgeBaseResponse(
        id=kb.id,
        name=kb.name,
        description=kb.description,
        created_at=kb.created_at,
        document_count=0
    )

@router.get("/{kb_id}", response_model=KnowledgeBaseDetailResponse)
async def get_knowledge_base(
    kb_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full details and document list for a specific knowledge base."""
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == kb_id,
        KnowledgeBase.user_id == current_user.id
    ).first()
    
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found.")
        
    return kb

@router.delete("/{kb_id}")
async def delete_knowledge_base(
    kb_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a knowledge base, all document records, and its vector collection."""
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == kb_id,
        KnowledgeBase.user_id == current_user.id
    ).first()
    
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found.")
        
    # Delete from vector store
    collection_name = f"kb_{kb.id}"
    try:
        vector_store.delete_collection(collection_name)
    except Exception as e:
        # Log and continue even if vector deletion throws an error (e.g. collection didn't exist in backend)
        pass
        
    db.delete(kb)
    db.commit()
    
    return {"status": "success", "message": f"Knowledge base '{kb.name}' and its vector collection deleted."}

@router.post("/{kb_id}/generate-action", response_model=NoteResponse)
async def generate_notebook_action(
    kb_id: str,
    payload: NotebookActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a Notebook action like FAQ, Study Guide, or Timeline."""
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == kb_id, 
        KnowledgeBase.user_id == current_user.id
    ).first()
    
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found.")

    # Get API key
    db_key = db.query(UserApiKey).filter(
        UserApiKey.user_id == current_user.id,
        UserApiKey.provider_name == payload.provider
    ).first()
    api_key = db_key.decrypt_key() if db_key else None

    broad_queries = {
        "faq": "What are the most common questions, important definitions, and key concepts?",
        "study_guide": "Summarize the key themes, main arguments, and important facts to create a study guide.",
        "timeline": "What are the key events, dates, and historical sequence of events?"
    }
    
    query = broad_queries.get(payload.action_type, "Summarize all key information.")
    
    # Retrieve top 20 chunks to get a broad overview
    collection_names = [f"kb_{kb.id}"]
    chunks = await asyncio.to_thread(
        Retriever.retrieve_context,
        query,
        collection_names,
        20,
        api_key,
        payload.provider
    )
    
    context_str = Retriever.format_context(chunks)
    
    prompts = {
        "faq": f"Based on the following documents, generate a comprehensive FAQ (Frequently Asked Questions) section. Include the most important questions and clear answers.\n\n{context_str}",
        "study_guide": f"Based on the following documents, create a detailed Study Guide. Include key concepts, summaries of main themes, and important takeaways.\n\n{context_str}",
        "timeline": f"Based on the following documents, extract any chronological events and dates to create a Timeline.\n\n{context_str}"
    }
    
    system_prompt = "You are a helpful assistant that generates study materials from provided documents. Use markdown formatting. Include citations to the source documents if relevant."
    user_prompt = prompts.get(payload.action_type, prompts["study_guide"])
    
    try:
        provider_instance = ProviderRegistry.get_provider(payload.provider, api_key=api_key)
        if not provider_instance:
            raise ValueError(f"Provider {payload.provider} not found")
            
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        content = await provider_instance.generate(messages=messages, model=payload.model)
    except Exception as e:
        import logging
        logging.getLogger("app.api.routes.knowledge").error(f"Action generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {str(e)}")
        
    title_map = {
        "faq": "FAQ",
        "study_guide": "Study Guide",
        "timeline": "Timeline"
    }
    
    note = CanvasDocument(
        user_id=current_user.id,
        knowledge_base_id=kb.id,
        filename=f"{title_map.get(payload.action_type, 'Notes')} - {datetime.datetime.now().strftime('%b %d')}",
        content=content,
        language="markdown"
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    
    return note
