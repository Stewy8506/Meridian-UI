import os
import shutil
import tempfile
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.database.session import get_db
from app.database.models.user import User, UserApiKey
from app.database.models.knowledge import KnowledgeBase, Document
from app.rag.document_processor import DocumentProcessor
from app.rag.embeddings import embedding_generator
from app.rag.vector_store import vector_store

logger = logging.getLogger("app.api.routes.documents")
router = APIRouter()

@router.post("/upload")
async def upload_document(
    knowledge_base_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a text, PDF, Word, CSV, or JSON document, chunk it,
    generate vector embeddings, and save to the knowledge base.
    """
    # 1. Verify knowledge base exists and is owned by user
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == knowledge_base_id,
        KnowledgeBase.user_id == current_user.id
    ).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found.")

    # 2. Save file temporarily for processing
    suffix = os.path.splitext(file.filename)[1].lower()
    temp_fd, temp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(temp_fd, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 3. Parse and chunk document
        try:
            chunks = DocumentProcessor.process_file(temp_path)
        except Exception as e:
            logger.error(f"Error parsing file {file.filename}: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse document format: {str(e)}"
            )

        if not chunks:
            raise HTTPException(
                status_code=400,
                detail="The document is empty or no indexable text could be extracted."
            )

        # 4. Generate document record in SQLite
        doc_id = str(uuid.uuid4())
        # Measure size of uploaded file
        file_size = os.path.getsize(temp_path)
        
        # 5. Retrieve active key for embeddings if fallback is needed
        # We can look up openai or google keys if sentence-transformers is missing
        openai_db_key = db.query(UserApiKey).filter(
            UserApiKey.user_id == current_user.id,
            UserApiKey.provider_name == "openai"
        ).first()
        api_key = openai_db_key.decrypt_key() if openai_db_key else None
        provider = "openai" if api_key else None
        
        # 6. Generate embeddings and upload to vector database
        chunk_ids = [f"doc_{doc_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "filename": file.filename, 
                "document_id": doc_id, 
                "chunk_index": i,
                "knowledge_base_id": kb.id
            } 
            for i in range(len(chunks))
        ]
        
        try:
            embeddings = embedding_generator.get_embeddings(chunks, api_key=api_key, provider=provider)
            
            vector_store.add_documents(
                collection_name=f"kb_{kb.id}",
                texts=chunks,
                metadatas=metadatas,
                ids=chunk_ids,
                embeddings=embeddings
            )
        except Exception as e:
            logger.error(f"Embedding or vector storage failure for {file.filename}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Vector storage indexing failed: {str(e)}"
            )

        # 7. Persist document record
        db_doc = Document(
            id=doc_id,
            knowledge_base_id=kb.id,
            filename=file.filename,
            file_size=file_size,
            chunk_count=len(chunks)
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)

        return {
            "status": "success",
            "message": f"Successfully indexed '{file.filename}' into {len(chunks)} chunks.",
            "document": {
                "id": db_doc.id,
                "filename": db_doc.filename,
                "file_size": db_doc.file_size,
                "chunk_count": db_doc.chunk_count,
                "created_at": db_doc.created_at
            }
        }

    finally:
        # Guarantee cleanup of temporary file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a document record and purge all its chunks from the vector database."""
    # Find document, ensuring ownership via parent knowledge base
    doc = db.query(Document).join(KnowledgeBase).filter(
        Document.id == doc_id,
        KnowledgeBase.user_id == current_user.id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # 1. Purge chunks from vector store
    collection_name = f"kb_{doc.knowledge_base_id}"
    chunk_ids = [f"doc_{doc.id}_chunk_{i}" for i in range(doc.chunk_count)]
    try:
        vector_store.delete_documents(collection_name, chunk_ids)
    except Exception as e:
        logger.error(f"Failed to clear chunks for document '{doc.filename}' from vector database: {e}")
        # Continue to delete SQLite record regardless

    # 2. Delete document record from SQLite
    db.delete(doc)
    db.commit()
    
    return {
        "status": "success", 
        "message": f"Document '{doc.filename}' and its indexed chunks successfully deleted."
    }
