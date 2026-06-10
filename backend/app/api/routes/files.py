import os
import shutil
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.core.auth import get_current_user
from app.database.models.user import User

logger = logging.getLogger("app.api.routes.files")
router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a file (image, document) for use in the chat.
    """
    try:
        file_id = str(uuid.uuid4())
        suffix = os.path.splitext(file.filename)[1].lower()
        file_name = f"{file_id}{suffix}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_url = f"/api/files/{file_name}"
        
        return {
            "status": "success",
            "file": {
                "id": file_id,
                "name": file.filename,
                "url": file_url,
                "size": os.path.getsize(file_path)
            }
        }
    except Exception as e:
        logger.error(f"Error uploading file {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{file_name}")
async def get_file(file_name: str):
    """
    Serve an uploaded file.
    """
    from fastapi.responses import FileResponse
    file_path = os.path.join(UPLOAD_DIR, file_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)
