from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import chat, skills, auth, api_keys, conversations, documents, knowledge

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
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

@app.on_event("startup")
def on_startup():
    # Dynamically import models to register them on Base metadata
    from app.database.models.conversation import Base
    from app.database.models.user import User, UserApiKey, Memory
    from app.database.models.knowledge import KnowledgeBase, Document
    from app.database.session import engine
    Base.metadata.create_all(bind=engine)
    
    # Run skill auto-discovery
    from app.skills.registry import skill_registry
    skill_registry.discover()

app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(skills.router, prefix="/api/skills", tags=["skills"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(api_keys.router, prefix="/api/keys", tags=["keys"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["knowledge"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.VERSION}
