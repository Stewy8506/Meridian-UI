# 🚀 AI Workspace (Premium Operating Environment)

A self-hosted, production-grade AI operating environment and orchestration workspace that runs entirely locally or in the cloud. It features dynamic multi-provider routing, a retrieval-gated scalable skill engine, JWT authentication, and secure, encrypted-at-rest server-side API key persistence.

---

## 🎨 Phase 1 — Premium UI Overhaul

The user interface has been transformed into a sophisticated, fluid operating canvas with the following features:

- **🌓 theme-toggle.tsx**: Animated toggle for Dark, Light, and System modes that persists settings to localStorage and the Zustand store, applying `.dark` or `.light` classes to the document root.
- **🔍 command-palette.tsx**: A global Raycast-style shortcut (`Ctrl+K` / `Cmd+K`) supporting arrow key navigation, recent actions, search over conversations, switching models, switching providers, toggling themes, and entering settings.
- **toast.tsx**: Stacking, auto-dismissing toast notifications with progress bars for successes, warnings, and error indicators.
- **📁 sidebar.tsx**:
  - Drag-and-drop foldering organization and pinning of favorite chats.
  - Search filter bar at the top of the conversation list.
  - Chronological chat grouping ("Today", "Yesterday", "This Week", "Older").
  - Expandable/collapsible sidebar transition animations.
  - Bottom avatar area reflecting user login profile status.
- **💬 chat-area.tsx**:
  - **Message hover toolbar**: Actions to copy text, edit user messages, regenerate assistant responses, and record 👍/👎 reactions for analytics.
  - **Edit & Resend**: Click to edit previous user prompts, clearing and regenerating answers from that branch.
  - **Blinking streaming cursor**: Blinking cursor indicating processing state.
  - **Stop generation**: Instant cancellation of ongoing LLM stream calls.
  - **Suggested prompts**: Categorized starter cards (Creative, Code, Analysis, Writing, Research) in an empty workspace state.
  - **Scroll-to-bottom FAB**: Floating action button with a new message badge indicator.
  - Message timestamps displaying relative time.
- **👤 message-bubble.tsx**: Extracted layout containing provider logo branding (Google, OpenAI, Anthropic, Local), AnimatePresence transition entries, and a thinking shimmer while waiting for token responses.
- **💻 code-block.tsx**: Advanced code block renderer supporting copy-to-clipboard animations, syntax highlighting, line numbers toggling, and collapsible structures for codes exceeding 30 lines.
- **⚙️ settings-dialog.tsx**: Full-page tabbed settings dashboard (General, Providers, Models, Skills, Appearance, Keyboard Shortcuts, About) with connection status indicators (connected ✓ / not configured ⚠️), temperature/top-p/max-tokens sliders, system prompt editors, and settings export/import JSON hooks.
- **⌨️ use-keyboard-shortcuts.ts**: Shortcuts tracking system:
  - `Ctrl+K`: Command menu
  - `Ctrl+N`: New conversation
  - `Ctrl+Shift+S`: Sidebar toggling
  - `Ctrl+/`: Focus input prompt
  - `Alt+1-9`: Switch active chats by index
  - `Ctrl+?`: Shortcut cheat sheet overlay

---

## 🛠️ Phase 2 — Scalable Skill Engine

A retrieval-gated, dynamic skill runner capable of scaling to thousands of integrations.

- **base.py & categories.py**: Standardized abstract skill interface (`BaseSkill`) and category enums (WEB, CODE, DATA, FILE, IMAGE, AUDIO, COMMUNICATION, KNOWLEDGE, SYSTEM, UTILITY) supporting timeout controls, config checks, and schemas.
- **registry.py**: Scans the `skills/builtin/` directory on server startup, registers descriptions and metadata into the SQLite database, and lazy-loads python code modules on-demand.
- **router.py**: Two-stage intent classification. Stage 1 uses keyword heuristics to find candidate categories. Stage 2 executes TF-IDF cosine similarity search over descriptions to bind only the top-K relevant skill schemas (default 8) to the LLM tool context.
- **executor.py**: Async executor enforcing timeouts (default 30s), logging durations/success status, capturing stdout/stderr, and formatting traceback exceptions.
- **skills.py API Routes**:
  - `GET /api/skills`: Paginate, search, and filter skills.
  - `GET /api/skills/{name}`: Get skill parameters and schema.
  - `PUT /api/skills/{name}/enable` & `/disable`: Toggle capability activation.
  - `GET /api/skills/categories`: Retrieve categorized totals summary.
  - `POST /api/skills/{name}/test`: Direct skill run execution helper.
- **skill-marketplace.tsx**: Full-page marketplace browser enabling category filtering, search, state toggling, and a live testing panel for running skills with custom JSON inputs.
- **skill-indicator.tsx**: Header dropdown chip listing enabled capabilities.
- **skill-result.tsx**: Renders collapsible execution metrics, success badges, elapsed execution time, and raw outputs inside the chat bubble list.
- **🔌 Discovered Capabilities**:
  - `web_search`: Search using Tavily or Exa engine.
  - `wikipedia`: Fetch historical details and summaries.
  - `arxiv_search`: Retrieve scholarly documents.
  - `calculator`: Safely compute math equations.
  - `datetime_tool`: Format current date/time and timezone configurations.
  - `uuid_generate`: Generate secure keys and random hashes.
  - `json_transform`: Query/parse JSON arrays.
  - `memory_store` & `memory_recall`: Read and write facts to the user's sqlite database profile.

---

## 🔐 Phase 3 — Authentication & Server-Side Persistence

A secure persistence layer for multiple users.

- **auth.py**: Password cryptography hashing via `bcrypt` and JWT bearer token creation and parsing.
- **user.py (Database Model)**: Defines schemas for `User`, `UserApiKey` (encrypted at rest), and `Memory` tables.
- **conversation.py (Database Model)**: Extends standard parameters to store `user_id`, `system_prompt`, model/provider selections, pinning state, tag list, and `Message.extra_metadata` JSON.
- **auth.py (API Routes)**: User signup, login, status check, and profile me update routes.
- **api_keys.py (API Routes)**: Securely saves user's provider API keys encrypted on the server utilizing base64 Fernet cryptography.
- **conversations.py (API Routes)**: CRUD handlers for persistent chat history, branching/forking chats, and importing OpenWebUI-formatted history dumps.
- **api-client.ts**: Standard fetch wrapper with automatic JWT injection and 401 logout redirect triggers.
- **auth-store.ts**: State store managing authenticated profiles and login redirects.
- **login-page.tsx**: Modern dark-themed signup/signin card overlay.
- **auth-provider.tsx**: Client component wrapping root views, showing a loader spinner during initial token verification, and displaying the login overlay when auth is required.

---

## 🏛️ Project Architecture

```
AI Workspace/
├── backend/            # FastAPI ASGI Backend Service
│   ├── app/
│   │   ├── api/        # Endpoint routers (auth, chat, keys, skills, conversations)
│   │   ├── core/       # Security utilities, JWT setups, and configs
│   │   ├── database/   # Declarative SQLAlchemy SQLite models
│   │   ├── providers/  # Abstracted LLM clients (OpenAI, Gemini, Local)
│   │   ├── skills/     # Skill Engine (builtin category subpackages & executor)
│   │   └── main.py     # FastAPI server entry point
│   ├── venv/           # Python virtual environment
│   └── requirements.txt# Backend dependencies (cryptography, jwt, passlib, etc.)
│
├── frontend/           # Next.js Frontend Application
│   ├── src/
│   │   ├── app/        # Page routing & global styling
│   │   ├── components/ # UI panels (auth, chat, settings, skills)
│   │   ├── lib/        # API client fetch handlers & class merges
│   │   └── store/      # Zustand state managers (app, auth)
│   └── package.json    # Frontend dependency manifests
│
├── package.json        # Root scripts manifest
└── run-dev.js          # Root concurrent process runner
```

---

## 🚀 Getting Started

### 1. Environment Setup

Configure backend keys and database locations in `backend/`:
```bash
cd backend
cp .env.example .env
```

Supply keys and authentication secrets in `backend/.env`:
```env
# Server-side Auth Options
AUTH_ENABLED=True
AUTH_SECRET_KEY=generate_a_secure_jwt_secret_signing_key_here
ENCRYPTION_KEY=generate_a_secure_32_byte_base64_encryption_key_here

# Provider APIs
OPENAI_API_KEY=your_openai_key_here
GOOGLE_API_KEY=your_gemini_key_here

# Search Engine APIs
TAVILY_API_KEY=your_tavily_key_here
EXA_API_KEY=your_exa_key_here
```

---

### 2. Spawning Servers

Run both the Next.js client and FastAPI server concurrently from the root directory:
```bash
npm run dev:all
```
- Frontend starts at **`http://localhost:5000`** (Next.js client-side interface).
- Backend starts at **`http://localhost:8000`** (FastAPI documentation at `/docs`).

---

## 🧪 Verification & Development

Run compilation checks and unit tests to verify stability:
```bash
# Verify backend compiles and imports cleanly
cd backend
.\venv\Scripts\python -c "import app.main; print('Backend loaded successfully!')"

# Run type checking and production frontend builds
cd frontend
npm run build
```
