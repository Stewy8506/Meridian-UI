from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.database.session import get_db
from app.database.models.user import User
from app.database.models.conversation import Conversation, Message
from typing import List, Optional, Dict, Any
import datetime
import uuid
import json

router = APIRouter()

# Schema definitions
class MessageSchema(BaseModel):
    role: str
    content: str
    metadata: Optional[str] = None

class ConversationCreate(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = "New Chat"
    system_prompt: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    system_prompt: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None
    tags: Optional[List[str]] = None

class ForkRequest(BaseModel):
    message_index: int
    new_title: Optional[str] = None

class OpenWebUiMessage(BaseModel):
    role: str
    content: str

class OpenWebUiConversation(BaseModel):
    title: str
    messages: List[OpenWebUiMessage]

class ImportRequest(BaseModel):
    conversations: List[OpenWebUiConversation]


@router.get("")
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all active (non-archived) conversations for the user, ordered by update time."""
    chats = db.query(Conversation).filter(
        Conversation.user_id == current_user.id,
        Conversation.is_archived == False
    ).order_by(Conversation.is_pinned.desc(), Conversation.updated_at.desc()).all()
    
    return [
        {
            "id": c.id,
            "title": c.title,
            "system_prompt": c.system_prompt,
            "model": c.model,
            "provider": c.provider,
            "is_pinned": c.is_pinned,
            "is_archived": c.is_archived,
            "tags": json.loads(c.tags) if c.tags else [],
            "token_count": c.token_count,
            "created_at": c.created_at,
            "updated_at": c.updated_at
        } for c in chats
    ]

@router.post("")
async def create_conversation(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new conversation."""
    chat_id = payload.id or str(uuid.uuid4())
    chat = Conversation(
        id=chat_id,
        user_id=current_user.id,
        title=payload.title,
        system_prompt=payload.system_prompt,
        model=payload.model,
        provider=payload.provider,
        is_pinned=False,
        is_archived=False,
        tags=json.dumps([]),
        token_count=0
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return {"status": "success", "id": chat.id, "title": chat.title}

@router.get("/{id}")
async def get_conversation(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get conversation details along with all messages."""
    chat = db.query(Conversation).filter(
        Conversation.id == id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Conversation not found.")
        
    messages = db.query(Message).filter(Message.conversation_id == id).order_by(Message.created_at.asc()).all()
    
    return {
        "id": chat.id,
        "title": chat.title,
        "system_prompt": chat.system_prompt,
        "model": chat.model,
        "provider": chat.provider,
        "is_pinned": chat.is_pinned,
        "is_archived": chat.is_archived,
        "tags": json.loads(chat.tags) if chat.tags else [],
        "token_count": chat.token_count,
        "created_at": chat.created_at,
        "updated_at": chat.updated_at,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "metadata": json.loads(m.extra_metadata) if m.extra_metadata else {},
                "created_at": m.created_at
            } for m in messages
        ]
    }

@router.put("/{id}")
async def update_conversation(
    id: str,
    payload: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update conversation metadata."""
    chat = db.query(Conversation).filter(
        Conversation.id == id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Conversation not found.")
        
    if payload.title is not None:
        chat.title = payload.title
    if payload.system_prompt is not None:
        chat.system_prompt = payload.system_prompt
    if payload.model is not None:
        chat.model = payload.model
    if payload.provider is not None:
        chat.provider = payload.provider
    if payload.is_pinned is not None:
        chat.is_pinned = payload.is_pinned
    if payload.is_archived is not None:
        chat.is_archived = payload.is_archived
    if payload.tags is not None:
        chat.tags = json.dumps(payload.tags)
        
    chat.updated_at = datetime.datetime.utcnow()
    db.commit()
    return {"status": "success", "message": "Conversation updated."}

@router.delete("/{id}")
async def delete_conversation(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Hard delete a conversation and its messages."""
    chat = db.query(Conversation).filter(
        Conversation.id == id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Conversation not found.")
        
    db.delete(chat)
    db.commit()
    return {"status": "success", "message": "Conversation deleted."}

@router.post("/{id}/messages")
async def append_message(
    id: str,
    payload: MessageSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Append a new message to the conversation."""
    chat = db.query(Conversation).filter(
        Conversation.id == id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Conversation not found.")
        
    msg_id = str(uuid.uuid4())
    message = Message(
        id=msg_id,
        conversation_id=id,
        role=payload.role,
        content=payload.content,
        extra_metadata=payload.metadata
    )
    db.add(message)
    chat.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(message)
    return {"status": "success", "message_id": message.id}

@router.post("/{id}/fork")
async def fork_conversation(
    id: str,
    payload: ForkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Branch a conversation from a specific message index."""
    source_chat = db.query(Conversation).filter(
        Conversation.id == id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not source_chat:
        raise HTTPException(status_code=404, detail="Source conversation not found.")
        
    source_messages = db.query(Message).filter(Message.conversation_id == id).order_by(Message.created_at.asc()).all()
    
    if payload.message_index < 0 or payload.message_index >= len(source_messages):
        raise HTTPException(status_code=400, detail="Invalid message index.")

    # Create new conversation
    new_chat_id = str(uuid.uuid4())
    new_chat = Conversation(
        id=new_chat_id,
        user_id=current_user.id,
        title=payload.new_title or f"Branch of {source_chat.title}",
        system_prompt=source_chat.system_prompt,
        model=source_chat.model,
        provider=source_chat.provider,
        parent_conversation_id=id,
        branch_point_index=payload.message_index,
        tags=json.dumps([]),
        token_count=0
    )
    db.add(new_chat)
    
    # Copy messages up to the branch index (inclusive)
    for m in source_messages[:payload.message_index + 1]:
        new_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=new_chat_id,
            role=m.role,
            content=m.content,
            extra_metadata=m.extra_metadata
        )
        db.add(new_msg)
        
    db.commit()
    return {"status": "success", "forked_id": new_chat_id}

@router.post("/import")
async def import_conversations(
    payload: ImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import conversations (OpenWebUI format support)."""
    imported_count = 0
    for chat_data in payload.conversations:
        chat_id = str(uuid.uuid4())
        chat = Conversation(
            id=chat_id,
            user_id=current_user.id,
            title=chat_data.title,
            tags=json.dumps([]),
            token_count=0
        )
        db.add(chat)
        
        for msg_data in chat_data.messages:
            msg = Message(
                id=str(uuid.uuid4()),
                conversation_id=chat_id,
                role=msg_data.role,
                content=msg_data.content,
                extra_metadata=json.dumps({})
            )
            db.add(msg)
            
        imported_count += 1
        
    db.commit()
    return {"status": "success", "message": f"Successfully imported {imported_count} conversations."}
