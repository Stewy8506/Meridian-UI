<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/License-MIT-purple?style=for-the-badge" alt="License" />
  
  <h1>🌌 AI Workspace</h1>
  <p><b>A self-hosted, full-stack AI operating environment designed for power users.</b></p>
  
  <p>
    Seamlessly route requests across 25+ LLM providers, build dynamic tools with a custom skill engine, execute local Python code instantly, and manage context with enterprise-grade RAG—all wrapped in a beautifully sleek Next.js interface.
  </p>

  <br />
</div>

> **The Modern AI Stack:** Next.js 14 · FastAPI · Zustand · SQLAlchemy · SQLite/ChromaDB · sentence-transformers · Recharts

---

## ⚡ Why AI Workspace?

AI Workspace is built for developers, researchers, and power users who demand **absolute control** over their AI infrastructure. Instead of locking into a single ecosystem, this platform acts as an unopinionated orchestrator. It allows you to switch between OpenAI, Anthropic, local models, and dozens of cloud inference providers on the fly, while deeply integrating your local files, analytics, and custom code execution.

---

## 🚀 Flagship Features

### 🌐 Universal Multi-Provider LLM Routing
Switch seamlessly between **25+ providers** from a single unified interface. 
- **Native Adapters:** Custom streaming adapters natively support specialized protocols like Claude's `<thinking>` tags, Cohere Chat v2, AWS Bedrock SigV4 auth, and Azure deployment routing.
- **Provider Health:** Live connection status and per-provider credential management are surfaced directly in your settings dashboard.

### 🧠 Dynamic Skill Engine (Agentic Tools)
Equip your AI with real-time capabilities. A blazing-fast, two-stage intent router uses keyword heuristics and TF-IDF cosine similarity to dynamically select the best tools for any given prompt, bypassing context window bloat.
- **Auto-registering:** Drop a Python script in the `skills/builtin/` directory, and it's instantly available.
- **Built-in arsenal:** Web search (Tavily/Exa), Wikipedia, ArXiv, memory storage/recall, date/time tools, JSON transformations, and more.
- **Marketplace UI:** Browse, toggle, and live-test your tools right from the dashboard.

### 📚 RAG & Knowledge Collections
Your personal, privacy-first knowledge base.
- **Format Agnostic:** Upload PDFs, Word docs, Markdown, CSVs, or JSON.
- **Smart Chunking:** Documents are processed with sentence-aligned overlap to preserve semantic context.
- **Vector Search:** Embedded locally using `all-MiniLM-L6-v2` (with OpenAI/Gemini fallbacks) and stored in a lightweight SQLite/ChromaDB hybrid backend. Pick and choose which collections to augment on a per-conversation basis.

### 🎙️ Multimodal & Local Sandbox
Interact with your AI naturally, and let it work autonomously.
- **Speech & Vision:** Browser-native Speech-to-Text (Voice Input) and Text-to-Speech (TTS). Drag-and-drop image uploads for vision-enabled models.
- **Local Python Sandbox:** A completely isolated local code execution environment. Hit "Run Code" on any Python block to execute it via `subprocess` and see `stdout`/`stderr` streamed live directly in your chat.

### 📊 Telemetry & Analytics Dashboard
Track your usage like a pro. A stunning, interactive `recharts`-powered dashboard at `/analytics` provides a bird's-eye view of your metrics:
- **Cost Estimation:** Calculate precise API costs across different providers.
- **Latency Tracking:** Monitor average response times to optimize your provider choices.
- **Usage Breakdown:** Visualize your most-used models and providers via elegant bar and donut charts.

### 🔐 Enterprise-Grade Auth & Persistence
Security and state management you can trust.
- **Multi-User Isolation:** JWT authentication with bcrypt password hashing ensures complete privacy.
- **Encrypted Keys:** Your provider API keys are encrypted at rest using Fernet (AES-128-CBC).
- **Advanced State:** Pin, tag, branch, and fork conversations. Fully compatible with OpenWebUI history imports.

---

## 🏗️ Architecture

```text
AI Workspace/
├── backend/                  # High-performance FastAPI ASGI service
│   └── app/
│       ├── api/              # Route handlers (auth, chat, keys, skills, conversations, docs, analytics)
│       ├── core/             # JWT config, security utilities, Fernet encryption
│       ├── database/         # SQLAlchemy schemas (User, Conversation, Message, Memory, UserApiKey)
│       ├── providers/        # LLM streaming adapters (OpenAI-compat, Anthropic, Cohere, Bedrock)
│       ├── rag/              # Document processor, local embeddings, vector store, semantic retriever
│       ├── sandbox/          # Secure Python code execution sandbox (`subprocess` runner)
│       ├── skills/           # TF-IDF Skill registry, intent router, executor, built-in packages
│       └── main.py
│
├── frontend/                 # Responsive, modern Next.js React application
│   └── src/
│       ├── app/              # App Router pages (Chat, Analytics, Settings)
│       ├── components/       # Reusable UI (MessageBubbles, CodeEditors, Dashboards, CommandPalette)
│       ├── lib/              # API client (Automatic JWT injection, 401 handling, refresh flows)
│       └── store/            # Zustand global state management (app state, themes, auth)
│
├── package.json              # Root orchestration scripts
├── run-dev.js                # Concurrent multi-process dev server runner
└── .ai.cmd / .ai.ps1         # 1-click startup scripts
```

---

## 🚦 Getting Started

### 1. Configure the Environment

```bash
cd backend
cp .env.example .env
```

Edit your `backend/.env` file with your credentials:

```env
# Security
AUTH_ENABLED=True
AUTH_SECRET_KEY=your_jwt_signing_secret_here
ENCRYPTION_KEY=your_32_byte_base64_fernet_key_here

# Provider Keys (Add what you use)
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...

# Optional Skill Keys
TAVILY_API_KEY=tvly-...
EXA_API_KEY=...
```

### 2. Launch the Workspace

Start both the frontend and backend simultaneously using the root launcher:

**Windows (PowerShell):**
```powershell
.\.ai
```
*(On Unix/macOS, simply use `npm run .ai`)*

### 3. Access the Platform

| Service | Address |
|:---|:---|
| 🖥️ **Frontend Interface** | [http://localhost:5000](http://localhost:5000) |
| ⚙️ **Backend API** | [http://localhost:8000](http://localhost:8000) |
| 📖 **OpenAPI Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) |

---

## 💻 Requirements
- **Node.js:** v18.0 or higher
- **Python:** v3.10 or higher
- **Database:** SQLite 3.35+ (Required for ChromaDB integration)

---
<div align="center">
  <i>Designed for developers who refuse to compromise on their AI workflow.</i>
</div>