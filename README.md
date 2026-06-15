<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/License-MIT-purple?style=for-the-badge" alt="License" />
  
  <h1>🌌 Meridian AI</h1>
  <p><b>A self-hosted, full-stack AI operating environment designed for power users.</b></p>
  
  <p>
    Seamlessly route requests across 25+ LLM providers, build dynamic tools with a custom skill engine, execute local Python code instantly, and manage context with local RAG—all from a single Next.js interface.
  </p>

  <br />
</div>

> **The Modern AI Stack:** Next.js · FastAPI · Zustand · SQLAlchemy · SQLite/ChromaDB · sentence-transformers · Recharts · Monaco Editor

---

## ⚡ Why Meridian AI?

Meridian AI is built for developers, researchers, and power users who demand **absolute control** over their AI infrastructure. Instead of locking into a single ecosystem, this platform acts as an unopinionated orchestrator. It allows you to switch between OpenAI, Anthropic, local models, and dozens of cloud inference providers on the fly, while deeply integrating your local files, analytics, and custom code execution.

---

## 🚀 Features

### 🌐 Universal Multi-Provider LLM Routing
Switch seamlessly between **25+ providers** from a single unified interface. 
- **Native Adapters:** Custom streaming adapters natively support specialized protocols like Claude's `<thinking>` tags, Cohere Chat v2, AWS Bedrock SigV4 authentication, and Azure deployment routing.
- **Provider Health:** Live connection status and per-provider credential management are surfaced directly in your settings dashboard.

### 🧠 Dynamic Skill Engine (Agentic Tools)
Equip your AI with real-time capabilities. A two-stage intent router uses keyword heuristics and TF-IDF cosine similarity to dynamically select the best tools for any given prompt, bypassing context window bloat.
- **Auto-registering:** Drop a Python script in the skills directory, and it is instantly registered.
- **Built-in Arsenal:** Web search (Tavily/Exa), Wikipedia summaries, ArXiv academic search, local vector memory recall/storage, date/time utilities, mathematical expression calculator, secure random UUID generator, and JSON formatting transformations.
- **Marketplace UI:** Browse, toggle, and live-test your tools right from the dashboard.

### 📚 RAG & Knowledge Collections
Your personal, privacy-first knowledge base.
- **Format Agnostic:** Upload PDFs, Word documents, Markdown, CSVs, or JSON.
- **Smart Chunking:** Documents are processed with sentence-aligned overlap to preserve semantic context.
- **Vector Search:** Embedded locally using `all-MiniLM-L6-v2` (with OpenAI/Gemini fallbacks) and stored in a lightweight SQLite/ChromaDB hybrid backend. Pick and choose which collections to augment on a per-conversation basis.

### 🐍 Local Python Sandbox
A completely isolated local code execution environment. Hit "Run Code" on any Python block to execute it via a secure local subprocess and see output and plots streamed live directly in your chat.

### 📊 Usage Telemetry & Cost Analytics
Track token usage and expenses with detailed visualization charts.
- **Daily Spend Trends:** Visualizes token volume and cost history using interactive AreaCharts with currency and token toggles.
- **Cost Allocation:** Break down your spend by provider in a PieChart to see exactly where your budgets are going.
- **Model Distribution:** Track model request popularity to identify which models perform the heavy lifting.
- **Skill Telemetry Logs:** Audit tool routing frequencies, success rates, and average response latency.

### 🏟️ Model Arena Battle (Arena Mode)
Compare multiple LLMs side-by-side on identical prompts to evaluate response quality.
- **Concurrent Streaming Broker:** Pulls outputs from two distinct providers concurrently using an async queue-merging broker, streaming both responses in real-time over a single SSE channel.
- **Blind Evaluation Mode:** Hides model names and identities during streaming and voting to eliminate cognitive bias.
- **Dynamic Leaderboard:** Chess-style Elo rating standing tracking (K=32) automatically updates model ranks based on user votes and ties.

### 🎭 Custom AI Personas
Equip your workspace with specialized AI agents tailored to specific tasks.
- **Built-in Expert Presets:** Instant access to pre-configured profiles including a Code Reviewer, Technical Interviewer, Scientific Research Assistant, Socratic Tutor, and Creative Writer.
- **Visual Profile Builder:** Configure custom persona metadata, system instructions, temperature parameters, and unique greeting behaviors.
- **Inline Switching:** Toggle active personas directly in the chat window header.
- **Default Everyday Assistant:** Defaults to a standard, everyday AI assistant when no persona profile is active, and persists selected personas across sessions/reloads.

### 🔗 Sequential Workflows (Prompt Chains)
Automate complex multi-model pipelines with a sequential prompt execution runner.
- **Linear Prompt Pipelines:** Define sequential execution tasks where step outputs are dynamically piped into downstream prompt configurations using brackets interpolation (e.g. `{{step_1_output}}`).
- **Live Stream Tracking:** Watch execution progress in real-time with visual indicators showing step states (Pending, Running, Completed, or Error).

### 🎨 Resizable Interactive Canvas
A dedicated side-workspace for writing documents, editing source code, and previewing diagrams.
- **Monaco Code Editor:** Full code editing capabilities featuring syntax highlighting, line wrapping, and manual saves.
- **Multi-Format Previews:** Instantly render Markdown documents, HTML drafts (sandboxed inside an iframe), and Mermaid flowcharts.
- **Version Snapshots & Diffs:** Log history checkpoints with a split-screen version comparison slider to view diff changes.
- **AI Document Skills:** AI agents automatically read/write to the active canvas using dedicated editor access skills.

### ⚡ Prompt Library Templates
Create, categorize, and autocomplete template shortcuts.
- **Auto Variables Extractor:** Automatically parses variable placeholders (e.g., `{{topic}}`, `{{language}}`) from prompt templates.
- **Prompt Compiling Form:** Displays a custom input form to replace placeholders before inserting compiled text into the chat prompt area.
- **Tag Organization & Search:** Organize template prompts with custom tags, enabling rapid semantic sorting and search filters.

### 🔐 Secure Auth & State Persistence
Security and state management you can trust.
- **Multi-User Isolation:** JWT authentication with bcrypt password hashing ensures complete privacy.
- **Encrypted Keys:** Your provider API keys are encrypted at rest using Fernet (AES-128-CBC) and only decrypted in memory.
- **Advanced State:** Pin, tag, branch, and fork conversations. Fully compatible with OpenWebUI history imports.
- **AI Conversational Auto-Titling:** Spawns a background worker on the first exchange using Google's `gemini-2.5-flash` to automatically generate a clean, context-appropriate 3-5 word title for the chat room.

### 🔌 Interface & Additional Capabilities
- **Multimodal Inputs:** Browser-native Speech-to-Text (Voice Input), Text-to-Speech (TTS), and vision support for multimodal models.
- **Premium TTS Engines:** Integrates advanced API-driven Text-to-Speech voices from **OpenAI** and **ElevenLabs**, allowing customization of speed rates, pitch, and high-fidelity custom voices.
- **Interface Customization:** Adjust layout densities, toggle panel sizes, customize keyboard shortcuts, and write custom CSS overrides directly in the settings panel.
- **Workspace Administration:** Toggle open registrations, whitelist specific email domains (CSV format), and view live audit trails of diagnostic backend connections (Ollama, Gemini, vector store, etc.).

---

## 🏗️ Architecture

```text
Meridian AI/
├── backend/                  # High-performance FastAPI ASGI service
│   └── app/
│       ├── api/              # Route handlers (auth, chat, keys, skills, conversations, docs, analytics, canvas, workflows, arena, prompts, personas)
│       ├── core/             # JWT config, security utilities, Fernet encryption, pricing tiers
│       ├── database/         # SQLAlchemy schemas (User, Conversation, Message, Memory, UserApiKey, usage_records, personas, workflows, canvas, prompts)
│       ├── providers/        # LLM streaming adapters (OpenAI-compat, Anthropic, Cohere, Bedrock)
│       ├── rag/              # Document processor, local embeddings, vector store, retriever
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
  <i>A modular, self-hosted console for universal model orchestrations and structured Meridian AI apps.</i>
</div>