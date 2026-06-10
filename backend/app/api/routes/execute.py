import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.auth import get_current_user
from app.database.models.user import User
from app.sandbox.executor import code_executor

logger = logging.getLogger("app.api.routes.execute")
router = APIRouter()

class ExecuteRequest(BaseModel):
    code: str
    language: str = "python"

@router.post("")
async def execute_code(
    request: ExecuteRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Execute code in the sandbox.
    """
    if request.language != "python":
        raise HTTPException(status_code=400, detail="Only python is supported currently")
        
    try:
        result = code_executor.execute_python(request.code)
        return {
            "status": "success" if result["success"] else "error",
            "result": result
        }
    except Exception as e:
        logger.error(f"Execution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
