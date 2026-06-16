from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import chat, skills, auth, api_keys, conversations, documents, knowledge, files, images, execute, analytics, settings as settings_route, arena, personas, workflows, canvas, prompts

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dynamically import models to register them on Base metadata
    from app.database.models.conversation import Base
    from app.database.models.user import User, UserApiKey, Memory
    from app.database.models.knowledge import KnowledgeBase, Document
    from app.database.models.usage import UsageRecord
    from app.database.models.settings import SystemSetting
    from app.database.models.arena import ArenaMatch, ModelRating
    from app.database.models.persona import Persona
    from app.database.models.workflow import Workflow
    from app.database.models.canvas import CanvasDocument, CanvasVersion
    from app.database.models.prompt import PromptTemplate
    from app.database.session import engine
    Base.metadata.create_all(bind=engine)
    
    # Auto-migration: check if conversation_id column exists in canvas_documents table
    from sqlalchemy import text
    with engine.begin() as conn:
        result = conn.execute(text("PRAGMA table_info(canvas_documents);"))
        columns = [row[1] for row in result.fetchall()]
        if "conversation_id" not in columns:
            conn.execute(text("ALTER TABLE canvas_documents ADD COLUMN conversation_id VARCHAR;"))
    
    # Run skill auto-discovery
    from app.skills.registry import skill_registry
    skill_registry.discover()
    
    # Pre-load heavy ML models and Vector DBs eagerly
    from app.rag.embeddings import embedding_generator
    from app.rag.vector_store import vector_store
    
    import logging
    logger = logging.getLogger("app.main")
    logger.info("Pre-loading machine learning models and vector databases...")
    embedding_generator.initialize()
    vector_store.initialize()
    logger.info("Eager initialization complete.")
    
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# Allow CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(skills.router, prefix="/api/skills", tags=["skills"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(api_keys.router, prefix="/api/keys", tags=["keys"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["knowledge"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(execute.router, prefix="/api/execute", tags=["execute"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(settings_route.router, prefix="/api/settings", tags=["settings"])
app.include_router(arena.router, prefix="/api/arena", tags=["arena"])
app.include_router(personas.router, prefix="/api/personas", tags=["personas"])
app.include_router(workflows.router, prefix="/api/workflows", tags=["workflows"])
app.include_router(canvas.router, prefix="/api/canvas", tags=["canvas"])
app.include_router(prompts.router, prefix="/api/prompts", tags=["prompts"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.VERSION}
