import time
from app.skills.base import BaseSkill, SkillResult
from app.skills.categories import SkillCategory
from app.database.session import SessionLocal
from app.database.models.canvas import CanvasDocument, CanvasVersion

class CanvasWriteSkill(BaseSkill):
    name = "canvas_write"
    display_name = "Canvas Write"
    description = "Write or update a document, file, or code block in the interactive side-panel canvas. Use this whenever the user requests writing code, markdown documents, Mermaid diagrams, or HTML drafts."
    category = SkillCategory.CODE
    tags = ["write", "file", "canvas", "code", "markdown", "save", "document"]
    version = "1.0.0"
    requires_auth = False
    is_dangerous = False
    enabled = True
    timeout_seconds = 10

    @property
    def schema(self):
        return {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "The name of the file or document to write (e.g., 'app.py', 'document.md', 'diagram.mermaid', 'index.html')."
                },
                "content": {
                    "type": "string",
                    "description": "The complete code or text content to put in the canvas document."
                },
                "language": {
                    "type": "string",
                    "description": "The programming/markup language of the content (e.g. 'python', 'javascript', 'html', 'css', 'markdown', 'json', 'mermaid')."
                }
            },
            "required": ["filename", "content", "language"]
        }

    async def execute(self, **kwargs) -> SkillResult:
        start_time = time.monotonic()
        filename: str = kwargs.get("filename", "").strip()
        content: str = kwargs.get("content", "")
        language: str = kwargs.get("language", "markdown").strip().lower()
        user_id: str = kwargs.get("user_id", "default_user")
        conversation_id: str = kwargs.get("conversation_id")

        if not filename or not content:
            return SkillResult(
                success=False,
                data=None,
                skill_name=self.name,
                error="Filename and content are required."
            )

        db = SessionLocal()
        try:
            # Check if document exists
            doc = db.query(CanvasDocument).filter(
                CanvasDocument.user_id == user_id,
                CanvasDocument.filename == filename,
                CanvasDocument.conversation_id == conversation_id
            ).first()

            if doc:
                doc.content = content
                doc.language = language
                doc.version += 1
            else:
                doc = CanvasDocument(
                    user_id=user_id,
                    filename=filename,
                    content=content,
                    language=language,
                    version=1,
                    conversation_id=conversation_id
                )
                db.add(doc)
            
            db.flush()

            # Record version history snapshot
            version_snap = CanvasVersion(
                document_id=doc.id,
                content=content,
                version_num=doc.version
            )
            db.add(version_snap)
            db.commit()

            elapsed = (time.monotonic() - start_time) * 1000
            success_msg = f"Document '{filename}' written to interactive canvas successfully (Version {doc.version})."
            
            return SkillResult(
                success=True,
                data=success_msg,
                skill_name=self.name,
                execution_time_ms=elapsed,
                metadata={"filename": filename, "version": doc.version, "language": language}
            )
        except Exception as e:
            db.rollback()
            elapsed = (time.monotonic() - start_time) * 1000
            return SkillResult(
                success=False,
                data=None,
                skill_name=self.name,
                execution_time_ms=elapsed,
                error=str(e)
            )
        finally:
            db.close()


class CanvasReadSkill(BaseSkill):
    name = "canvas_read"
    display_name = "Canvas Read"
    description = "Read the current contents of a file or code block from the interactive side-panel canvas."
    category = SkillCategory.CODE
    tags = ["read", "file", "canvas", "load", "document"]
    version = "1.0.0"
    requires_auth = False
    is_dangerous = False
    enabled = True
    timeout_seconds = 5

    @property
    def schema(self):
        return {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "The name of the file or document to read from the canvas (e.g. 'app.py', 'document.md')."
                }
            },
            "required": ["filename"]
        }

    async def execute(self, **kwargs) -> SkillResult:
        start_time = time.monotonic()
        filename: str = kwargs.get("filename", "").strip()
        user_id: str = kwargs.get("user_id", "default_user")
        conversation_id: str = kwargs.get("conversation_id")

        if not filename:
            return SkillResult(
                success=False,
                data=None,
                skill_name=self.name,
                error="Filename is required."
            )

        db = SessionLocal()
        try:
            doc = db.query(CanvasDocument).filter(
                CanvasDocument.user_id == user_id,
                CanvasDocument.filename == filename,
                CanvasDocument.conversation_id == conversation_id
            ).first()

            elapsed = (time.monotonic() - start_time) * 1000
            if not doc:
                return SkillResult(
                    success=False,
                    data=None,
                    skill_name=self.name,
                    execution_time_ms=elapsed,
                    error=f"Document '{filename}' not found on canvas."
                )

            return SkillResult(
                success=True,
                data=doc.content,
                skill_name=self.name,
                execution_time_ms=elapsed,
                metadata={"filename": filename, "version": doc.version, "language": doc.language}
            )
        except Exception as e:
            elapsed = (time.monotonic() - start_time) * 1000
            return SkillResult(
                success=False,
                data=None,
                skill_name=self.name,
                execution_time_ms=elapsed,
                error=str(e)
            )
        finally:
            db.close()
