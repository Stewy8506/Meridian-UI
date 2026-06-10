from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.database.session import get_db
from app.database.models.user import User
from app.database.models.knowledge import KnowledgeBase, Document
from app.rag.vector_store import vector_store
from pydantic import BaseModel
from typing import List, Optional
import datetime

router = APIRouter()

class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None

class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    chunk_count: int
    created_at: datetime.datetime

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
