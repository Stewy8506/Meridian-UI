from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import datetime
from app.core.auth import get_current_user
from app.database.session import get_db
from app.database.models.user import User
from app.database.models.canvas import CanvasDocument, CanvasVersion

router = APIRouter()

class CanvasSaveRequest(BaseModel):
    filename: str
    content: str
    language: Optional[str] = "markdown"

@router.get("")
async def get_canvas_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all canvas documents owned by the user.
    """
    docs = db.query(CanvasDocument).filter(
        CanvasDocument.user_id == str(current_user.id)
    ).order_by(CanvasDocument.updated_at.desc()).all()
    
    return {
        "status": "success",
        "documents": [
            {
                "id": doc.id,
                "filename": doc.filename,
                "language": doc.language,
                "version": doc.version,
                "updated_at": doc.updated_at
            } for doc in docs
        ]
    }

@router.get("/{doc_id}")
async def get_canvas_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve details and version history of a specific document.
    """
    doc = db.query(CanvasDocument).filter(
        CanvasDocument.id == doc_id,
        CanvasDocument.user_id == str(current_user.id)
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    versions = db.query(CanvasVersion).filter(
        CanvasVersion.document_id == doc.id
    ).order_by(CanvasVersion.version_num.desc()).all()
    
    return {
        "status": "success",
        "document": {
            "id": doc.id,
            "filename": doc.filename,
            "content": doc.content,
            "language": doc.language,
            "version": doc.version,
            "updated_at": doc.updated_at
        },
        "versions": [
            {
                "id": v.id,
                "version_num": v.version_num,
                "created_at": v.created_at
            } for v in versions
        ]
    }

@router.post("")
async def save_canvas_document(
    payload: CanvasSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save or update a canvas document from the client UI.
    """
    filename = payload.filename.strip()
    if not filename:
        raise HTTPException(status_code=400, detail="Filename is required.")
        
    doc = db.query(CanvasDocument).filter(
        CanvasDocument.user_id == str(current_user.id),
        CanvasDocument.filename == filename
    ).first()
    
    if doc:
        doc.content = payload.content
        doc.language = payload.language or doc.language
        doc.version += 1
    else:
        doc = CanvasDocument(
            user_id=str(current_user.id),
            filename=filename,
            content=payload.content,
            language=payload.language or "markdown",
            version=1
        )
        db.add(doc)
        
    db.flush()
    
    # Save snapshot
    version_snap = CanvasVersion(
        document_id=doc.id,
        content=payload.content,
        version_num=doc.version
    )
    db.add(version_snap)
    db.commit()
    db.refresh(doc)
    
    return {"status": "success", "document": doc}

@router.get("/{doc_id}/versions/{version_num}")
async def get_canvas_version(
    doc_id: str,
    version_num: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve the snapshot content of a specific historical version.
    """
    doc = db.query(CanvasDocument).filter(
        CanvasDocument.id == doc_id,
        CanvasDocument.user_id == str(current_user.id)
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    v = db.query(CanvasVersion).filter(
        CanvasVersion.document_id == doc.id,
        CanvasVersion.version_num == version_num
    ).first()
    
    if not v:
        raise HTTPException(status_code=404, detail="Version snapshot not found.")
        
    return {
        "status": "success",
        "content": v.content,
        "version_num": v.version_num
    }
