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

> **The Modern AI Stack:** Next.js · FastAPI · Zustand · SQLAlchemy · SQLite/ChromaDB · sentence-transformers · Recharts · Monaco Editor

---

## ⚡ Why AI Workspace?

AI Workspace is built for developers, researchers, and power users who demand **absolute control** over their AI infrastructure. Instead of locking into a single ecosystem, this platform acts as an unopinionated orchestrator. It allows you to switch between OpenAI, Anthropic, local models, and dozens of cloud inference providers on the fly, while deeply integrating your local files, analytics, and custom code execution.

---

## 🚀 Detailed Feature Specifications

### 📊 Telemetry & Analytics Dashboard (Phase 7)
Track token usage and expenses with detailed visualization charts.
*   **Database Table:** `usage_records`
    *   `id`: `Integer` (Primary Key, Autoincrement)
    *   `user_id`: `String` (Index)
    *   `provider`: `String` (Index)
    *   `model`: `String` (Index)
    *   `prompt_tokens`: `Integer` (Default: 0)
    *   `completion_tokens`: `Integer` (Default: 0)
    *   `latency_ms`: `Float` (Default: 0.0)
    *   `cost_estimate`: `Float` (Default: 0.0)
    *   `skill_name`: `String` (Nullable, for skill telemetry tracking)
    *   `created_at`: `DateTime` (Server default: `now()`)
*   **Pricing Engine:** Configured in `backend/app/core/pricing.py`. Maps `(provider, model)` to custom input/output costs per 1 million tokens. Falls back to $0.0 for local/Ollama providers, or averages for unrecognized external models.
*   **Key API Endpoints:**
    *   `GET /api/analytics/history`: Returns aggregated daily token counts and costs over the last 30 days for trend analysis.
    *   `GET /api/analytics/skills`: Returns list of skill usage logs, invocation counts, success rates, and average latency.
*   **Frontend Components:** `/frontend/src/app/analytics/page.tsx`
    *   Uses `recharts` to render AreaCharts (daily spending and token metrics), PieCharts (provider-cost distribution), and BarCharts (model popularity) dynamically.

### 🏟️ Model Arena Battle (Arena Mode) (Phase 8A)
Compare two models side-by-side on the identical prompt with blind evaluation and Elo ratings.
*   **Database Tables:**
    *   `arena_matches`: Tracks battle logs (`id`, `user_id`, `prompt`, `model_a`, `model_b`, `winner`, `created_at`).
    *   `model_ratings`: Tracks competitor ratings (`model_name` [PK], `rating` [Float, starting 1200.0], `matches_played` [Int], `updated_at`).
*   **Concurrent Streaming Broker:** Encompassed in `backend/app/api/routes/arena.py`. SSE stream endpoint uses `asyncio.Queue` and background task execution to consume parallel generators for Model A and Model B simultaneously, merging outputs dynamically into a single server-sent stream.
*   **Elo Rating Engine:** Implements the chess Elo formula on voting:
    $$E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}$$
    Updates standings using $K=32$ based on outcome (Model A Win, Model B Win, or Tie).
*   **Key API Endpoints:**
    *   `POST /api/arena/battle`: Streams concurrent responses under blind placeholders (`model_a` and `model_b` tags).
    *   `POST /api/arena/vote`: Logs match vote, updates rating profiles, and reveals true model identities.
    *   `GET /api/arena/leaderboard`: Lists models sorted by current Elo standings.
*   **Frontend Components:** `/frontend/src/app/arena/page.tsx`

### 🎭 Custom AI Personas (Phase 8B)
Customize AI agents tailored to specific tasks, including prompt injection and default parameters.
*   **Database Table:** `personas`
    *   `id`: `String` (Primary Key, UUID)
    *   `user_id`: `String` (Foreign Key, Null for pre-seeded system presets)
    *   `name`: `String`
    *   `avatar`: `String` (Icon identifier or image URL)
    *   `system_prompt`: `Text`
    *   `default_model`: `String` (Nullable)
    *   `temperature`: `Float` (Default: 0.7)
    *   `greeting`: `Text` (Initial welcome message)
    *   `is_system_preset`: `Boolean` (Default: False)
    *   `created_at`: `DateTime`
*   **Pre-seeded Presets:** Code Reviewer, Technical Interviewer, Scientific Research Assistant, Creative Writer, Socratic Tutor, and Devil's Advocate.
*   **Key API Endpoints:**
    *   `GET /api/personas/`: Retrieve both user-defined and system-preset personas.
    *   `POST /api/personas/`: Create a new custom persona configuration.
    *   `PUT /api/personas/{id}` & `DELETE /api/personas/{id}`: Modify or delete user personas.
*   **Frontend Components:** `/frontend/src/components/personas/persona-manager.tsx`
    *   Integrated into the main Chat window header selector for quick toggle switches between personas, instantly updating system parameters.

### 🔗 Prompt Chains (Workflow Builder) (Phase 8C)
Set up multi-step pipelines executing linear LLM queries where downstream step prompts compile variables parsed from upstream outputs.
*   **Database Table:** `workflows`
    *   `id`: `String` (Primary Key, UUID)
    *   `user_id`: `String` (Foreign Key)
    *   `name`: `String`
    *   `description`: `Text`
    *   `definition`: `Text` (JSON string serialized representing the steps configuration array)
    *   `created_at`: `DateTime`
*   **Step Execution Variable Compilation:** Sequential executor matches double curly brackets `{{step_N_output}}` using regex and replaces them with output text accumulated from the completion of the respective step before initiating the next model run.
*   **Key API Endpoints:**
    *   `POST /api/workflows/{id}/run`: Starts execution, running steps sequentially, and streams status updates (`Pending`, `Running`, `Completed`, `Error`) along with generated intermediate text via SSE.
*   **Frontend Components:** `/frontend/src/app/workflows/page.tsx`
    *   Provides a step builder form (prompt text, target provider/model, and sequence sorting) and a live runtime panel.

### 🎨 Resizable Interactive Canvas (Phase 8D)
A split side-by-side workspace next to the chat screen dedicated to rendering, editing, and checking version diffs of text, markdown, HTML, and diagrams.
*   **Database Tables:**
    *   `canvas_documents`: Tracks documents (`id`, `user_id`, `filename`, `content`, `language`, `version`, `updated_at`).
    *   `canvas_versions`: Tracks historical snapshot checkpoints (`id`, `document_id`, `content`, `version_num`, `created_at`).
*   **Canvas Built-in Skills:** Exposes `canvas_write` and `canvas_read` tools to the agentic skill engine:
    *   `canvas_write`: Allows the LLM to write or replace content inside the active canvas.
    *   `canvas_read`: Allows the LLM to inspect the full contents of the active canvas file.
*   **Key API Endpoints:**
    *   `POST /api/canvas/`: Create new document in the canvas workspace.
    *   `GET /api/canvas/{id}/versions`: Retrieve all saved snapshot diffs for a document.
    *   `POST /api/canvas/{id}/save`: Push manual editor changes and create a version checkpoint.
*   **Frontend Components:** `/frontend/src/components/canvas/canvas-panel.tsx`
    *   Monaco Code Editor (`@monaco-editor/react`) integration featuring syntax highlighting, line wrapping, and multi-format preview tabs: Markdown renderer, sandboxed HTML `<iframe>` preview, and `mermaid` flowchart charts.
    *   Split-screen version comparator showing code diffs between active edits and historical snapshots.

### ⚡ Prompt Library Templates (Phase 8E)
Store template text, parse placeholder tags, and compile prompts dynamically using a compiler form modal.
*   **Database Table:** `prompt_templates`
    *   `id`: `String` (Primary Key, UUID)
    *   `user_id`: `String` (Foreign Key)
    *   `title`: `String`
    *   `content`: `Text`
    *   `variables`: `Text` (JSON-serialized list of placeholder strings parsed, e.g., `["topic", "language"]`)
    *   `tags`: `Text` (Comma-separated custom categories)
    *   `created_at`: `DateTime`
*   **Auto-extraction Engine:** When creating/modifying templates, `backend/app/api/routes/prompts.py` automatically extracts variable placeholder tokens enclosed within double curly brackets (e.g. `{{placeholder_name}}`) using a regex parser.
*   **Key API Endpoints:**
    *   `GET /api/prompts/`: Returns saved prompt templates.
    *   `POST /api/prompts/`: Creates template and returns list of extracted placeholders.
*   **Frontend Components:** `/frontend/src/components/prompts/prompt-library.tsx`
    *   A template gallery overlay. Clicking a template prompts the user with an input form displaying fields for each extracted variable, compiles the final prompt, and inserts it into the active chat textarea.

---

## 🏗️ Architecture

```text
AI Workspace/
├── backend/                  # High-performance FastAPI ASGI service
│   └── app/
│       ├── api/              # Route handlers (auth, chat, keys, skills, conversations, docs, analytics, canvas, workflows, arena, prompts, personas)
│       ├── core/             # JWT config, security utilities, Fernet encryption, pricing tiers
│       ├── database/         # SQLAlchemy schemas (User, Conversation, Message, Memory, UserApiKey, usage_records, personas, workflows, canvas, prompts)
│       ├── providers/        # LLM streaming adapters (OpenAI-compat, Anthropic, Cohere, Bedrock)
│       ├── rag/              # Document processor, local embeddings, vector store, semantic retriever
│       ├── sandbox/          # Secure Python code execution sandbox (`subprocess` runner)
│       ├── skills/           # TF-IDF Skill registry, intent router, executor, built-in packages
│       └── main.py
│
├── frontend/                 # Responsive, modern Next.js React application
│   └── src/
│       ├── app/              # App Router pages (Chat, Analytics, Settings, Arena, Workflows)
│       ├── components/       # UI Components (CanvasPanel, PromptLibrary, PersonaManager, CodeEditors)
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