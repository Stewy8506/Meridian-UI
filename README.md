# AI Workspace

A self-hosted AI operating environment with multi-provider routing, RAG, a dynamic skill engine, and JWT-secured multi-user persistence. Runs locally or in the cloud.

> **Stack:** Next.js · FastAPI · SQLite · Zustand · SQLAlchemy · sentence-transformers

---

## What it is

AI Workspace is a full-stack chat application built for power users who want direct control over their AI stack. Instead of locking into one provider, it routes requests across 25+ LLM endpoints — OpenAI, Anthropic, Gemini, Groq, DeepSeek, Mistral, Cohere, AWS Bedrock, Azure OpenAI, Perplexity, Together AI, Fireworks, SambaNova, Cerebras, Cloudflare, and more — with live connection status and per-provider credential management.

On top of the chat core, it ships a retrieval-augmented generation (RAG) pipeline for querying your own documents, a plugin-style skill engine for tool use (web search, code execution, memory, etc.), and a production-grade auth layer with encrypted-at-rest API key storage.

---

## Features

### Multi-Provider LLM Routing
Switch between 25+ providers from a single interface. Custom streaming adapters handle non-OpenAI protocols natively — Claude's thinking tags, Cohere Chat v2, AWS Bedrock SigV4, and Azure deployment routing. Provider health is checked on startup and surfaced in the settings dashboard.

### Skill Engine
A two-stage intent router selects the right tools per query — keyword heuristics narrow the category, then TF-IDF cosine similarity picks the top-K skill schemas to bind into the LLM tool context. Skills auto-register from the `skills/builtin/` directory on startup. Built-in capabilities include:

- `web_search` — Tavily or Exa
- `wikipedia`, `arxiv_search` — reference lookups
- `calculator`, `datetime_tool`, `uuid_generate`
- `json_transform` — query/parse JSON
- `memory_store` / `memory_recall` — persistent per-user facts

A marketplace UI lets you browse, toggle, and live-test skills with custom JSON inputs.

### RAG & Knowledge Collections
Upload PDFs, Word docs, markdown, CSV, or JSON files into named knowledge collections. Documents are chunked with sentence-aligned overlap, embedded with `all-MiniLM-L6-v2` (with OpenAI/Gemini embedding fallbacks), and stored in a SQLite-backed vector store. At query time, relevant chunks are retrieved via cosine similarity and prepended to the prompt. Select which collections to augment per conversation.

### Multimodal & Code Execution
Upload images and documents directly in chat, interact via browser-native Speech-to-Text (Voice Input), and listen to responses with Text-to-Speech (TTS). The chat includes an embedded local Python sandbox using `subprocess` that lets you execute Python code blocks instantly and view `stdout`/`stderr` inline.

### Analytics & Token Dashboard
Monitor your token usage, latency, and estimated costs over time. A beautiful Recharts-powered dashboard at `/analytics` visualizes your top models and provider cost distributions to help you track spending and usage patterns.

### Auth & Persistence
Multi-user JWT auth with bcrypt password hashing. Provider API keys are encrypted at rest using Fernet (AES-128-CBC). Conversations persist with per-user isolation, branch/fork support, pinning, tags, and OpenWebUI history import compatibility.

### Chat Interface
- Raycast-style command palette (`Ctrl+K`) — search conversations, switch models, toggle settings
- Edit & resend any previous message, regenerating from that branch
- Stop generation mid-stream
- Drag-and-drop sidebar with folder organization, pinning, and chronological grouping
- Full keyboard shortcut system (`Ctrl+N`, `Ctrl+/`, `Alt+1-9`, etc.)
- Code blocks with syntax highlighting, line numbers, and collapse for 30+ line blocks
- Tabbed settings dashboard with temperature/top-p/max-tokens controls and system prompt editor

---

## Architecture

```
AI Workspace/
├── backend/                  # FastAPI ASGI service
│   └── app/
│       ├── api/              # Route handlers (auth, chat, keys, skills, conversations, documents, knowledge, files, execute, analytics, images)
│       ├── core/             # JWT config, security utilities
│       ├── database/         # SQLAlchemy models (User, Conversation, Message, Memory, UserApiKey)
│       ├── providers/        # LLM adapters (OpenAI-compat + custom: Anthropic, Cohere, Bedrock, Azure)
│       ├── rag/              # Document processor, embeddings, vector store, retriever
│       ├── sandbox/          # Python code execution sandbox
│       ├── skills/           # Skill registry, router, executor, built-in skill packages
│       └── main.py
│
├── frontend/                 # Next.js app
│   └── src/
│       ├── app/              # Page routing, global styles
│       ├── components/       # Chat, sidebar, settings, skills, knowledge, auth UI
│       ├── lib/              # API client (JWT injection, 401 handling)
│       └── store/            # Zustand (app state, auth)
│
├── package.json              # Root scripts
└── run-dev.js                # Concurrent dev server runner
```

---

## Getting Started

### 1. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
AUTH_ENABLED=True
AUTH_SECRET_KEY=your_jwt_signing_secret
ENCRYPTION_KEY=your_32_byte_base64_fernet_key

OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...

TAVILY_API_KEY=...       # optional, for web_search skill
EXA_API_KEY=...          # optional, alternative search engine
```

### 2. Start servers

```bash
.\.ai
```
*(Or `npm run .ai` on other operating systems)*

| Service | URL |
|---|---|
| Frontend | http://localhost:5000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

### 3. Verify

```bash
# Backend import check
cd backend && .\venv\Scripts\python -c "import app.main; print('OK')"

# Frontend build check
cd frontend && npm run build
```

---

## Requirements

- Node.js 18+
- Python 3.10+
- SQLite 3.35+ (required for ChromaDB; the custom SQLite vector store fallback bypasses this if needed)