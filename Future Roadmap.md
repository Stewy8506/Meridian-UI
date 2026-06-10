# AI Workspace → Premium AI Operating Environment

> **Goal**: Build a self-hosted AI operating environment that surpasses Open WebUI in every dimension — more providers, more skills, better UX, and unique features no competitor offers.

---

## Current State

| Layer | What Exists |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind v4, Zustand, Framer Motion, ReactMarkdown |
| **Backend** | FastAPI, SSE streaming, OpenAI-compatible provider abstraction |
| **Providers** | 3 (Local/Google/OpenAI) — no Anthropic, no Ollama, no cloud inference |
| **Skills/Tools** | 1 (Web Search) — hardcoded in registry, all schemas injected into every prompt |
| **Storage** | Client-side only (Zustand persist). SQLAlchemy models exist but aren't wired |
| **Auth** | None |

---

## Decisions (from your feedback)

| Question | Decision |
|---|---|
| Anthropic provider? | ✅ Yes, as a core provider |
| API services scope? | ✅ All of them (ElevenLabs, DALL-E, Gemini Images, etc.) |
| Ollama + more providers? | ✅ Yes — 25+ providers |
| Authentication? | ✅ Optional JWT auth — user signs in, saves API keys server-side |
| Docker? | ✅ Yes, but deferred to final phase |
| Skill system scale? | ✅ Must handle **thousands** of skills with dynamic loading |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                 │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐ │
│  │ Chat UI  │ │ Canvas   │ │ Arena  │ │ Skill Market │ │
│  └──────────┘ └──────────┘ └────────┘ └──────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐ │
│  │ Personas │ │Workflows │ │Analytics│ │  Settings    │ │
│  └──────────┘ └──────────┘ └────────┘ └──────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ REST + SSE + WebSocket
┌────────────────────────┴────────────────────────────────┐
│                   BACKEND (FastAPI)                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │            Universal Provider Router               │ │
│  │  25+ providers via OpenAI-compatible adapter       │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Skill Engine (1000s)                   │ │
│  │  Registry → Intent Router → Semantic Retrieval     │ │
│  │  → Dynamic Binding → Sandboxed Execution           │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐ │
│  │ Auth/JWT │ │ RAG/Vec  │ │Sandbox │ │  Analytics   │ │
│  └──────────┘ └──────────┘ └────────┘ └──────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │         SQLite/PostgreSQL + ChromaDB               │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1 — Premium UI Overhaul 🎨

Transform the interface from functional MVP to a visually stunning experience.

---

#### [MODIFY] [globals.css](file:///c:/Users/dasan/Documents/AI%20App/frontend/src/app/globals.css)

- Curated HSL color palette with accent gradients (purple → blue → teal)
- Light mode support via CSS custom properties + `.light` class toggle
- Glassmorphism utilities (`.glass`, `.glass-subtle`, `.glass-card`)
- Micro-animation keyframes: `fadeIn`, `slideUp`, `shimmer`, `glow-pulse`, `float`
- Premium typography scale with Inter weight variations
- Firefox scrollbar styling (`scrollbar-width: thin`)
- Focus-visible ring styles for accessibility

#### [NEW] `frontend/src/components/ui/theme-toggle.tsx`

- Dark / Light / System mode toggle with animated sun/moon icon
- Persists to localStorage + Zustand settings store
- Applies `.dark` / `.light` class to `<html>`

#### [NEW] `frontend/src/components/ui/command-palette.tsx`

- `Ctrl+K` / `Cmd+K` global command palette (Raycast-style)
- Quick actions: New Chat, Switch Model, Switch Provider, Search Chats, Toggle Theme, Open Settings, Toggle Sidebar
- Fuzzy search over chats, skills, personas, and actions
- Animated glassmorphism overlay
- Recent actions section, keyboard navigation with arrow keys

#### [NEW] `frontend/src/components/ui/toast.tsx`

- Lightweight toast notifications (success, error, warning, info)
- Auto-dismiss with progress bar, stacking with animation
- Used throughout the app for feedback

#### [MODIFY] [sidebar.tsx](file:///c:/Users/dasan/Documents/AI%20App/frontend/src/components/layout/sidebar.tsx)

- Search/filter bar at top of chat list
- Group chats by date ("Today", "Yesterday", "This Week", "Older")
- Drag-to-reorder with `framer-motion` `Reorder`
- Folder/workspace organization for chat grouping
- Pin functionality for favorite chats
- User avatar + status area at bottom (ties into auth in Phase 3)
- Animated collapse/expand with proper width transition

#### [MODIFY] [chat-area.tsx](file:///c:/Users/dasan/Documents/AI%20App/frontend/src/components/chat/chat-area.tsx)

- **Message actions toolbar** (hover): Copy, Edit, Regenerate, Branch, Share
- **Edit & resend**: Click to edit any user message, regenerate from that point
- **Regenerate**: Re-run last assistant response
- **Streaming cursor**: Animated blinking cursor at end of streaming text
- **Empty state**: Premium hero with gradient text, suggested prompts grid, quick-start cards
- **Scroll-to-bottom FAB**: Floating button when scrolled up, with new message count badge
- **Message timestamps**: Subtle relative timestamps
- **Reactions**: 👍/👎 on assistant messages (stored for analytics)
- **Stop generation**: Button to cancel in-progress streaming

#### [NEW] `frontend/src/components/chat/message-bubble.tsx`

- Extracted message component with:
  - Provider-branded avatar icon (Google/OpenAI/Anthropic/Local etc.)
  - Animated entrance via `AnimatePresence`
  - Hover toolbar for message actions
  - Token count badge (optional)
  - "Thinking" shimmer animation while streaming

#### [NEW] `frontend/src/components/chat/code-block.tsx`

- Custom code block renderer for ReactMarkdown
- Syntax highlighting with language label pill
- Copy button with ✓ confirmation animation
- Line numbers toggle
- "Run" button placeholder (connects to Phase 6 code execution)
- Collapsible for long code blocks (>30 lines)

#### [NEW] `frontend/src/components/chat/suggested-prompts.tsx`

- Grid of curated prompt cards shown on empty chat state
- Categories: Creative, Code, Analysis, Writing, Research
- Each card: icon, title, description, click-to-send
- Subtle gradient borders and hover lift animation

#### [MODIFY] [settings-dialog.tsx](file:///c:/Users/dasan/Documents/AI%20App/frontend/src/components/settings/settings-dialog.tsx)

- Convert from modal to full-page tabbed settings panel
- Tabs: General, Providers, Models, Skills, Appearance, Keyboard Shortcuts, About
- Each provider gets its own card with status indicator (connected ✓ / not configured ⚠️)
- Model selection with search, tags (vision, reasoning, fast, large), favorites
- Temperature / top-p / max tokens sliders with real-time preview
- System prompt textarea with character count
- Export/Import settings as JSON

#### [NEW] `frontend/src/hooks/use-keyboard-shortcuts.ts`

- Comprehensive keyboard shortcut system
- `Ctrl+K` — Command palette | `Ctrl+N` — New chat | `Ctrl+Shift+S` — Toggle sidebar
- `Ctrl+/` — Focus input | `Ctrl+.` — Quick model switch | `Ctrl+E` — Toggle Canvas
- `Ctrl+Shift+A` — Arena Mode | `Alt+1-9` — Switch chat by index
- `Ctrl+?` — Shortcut cheat sheet overlay

---

## Phase 2 — Scalable Skill Engine (Thousands of Skills) 🛠️

> [!IMPORTANT]
> This is the architectural heart of the app. Unlike OpenWebUI's basic "tools" or "pipelines", we build a **retrieval-gated, dynamically-loaded skill engine** that can scale to thousands of skills without bloating the LLM context window.

### Architecture: How Thousands of Skills Work

```
User Message
    │
    ▼
┌──────────────────┐
│  Intent Router   │  ← Fast classifier: maps query to skill categories
│  (lightweight)   │     e.g., "plot this data" → [code, visualization, data]
└────────┬─────────┘
         │ top categories
         ▼
┌──────────────────┐
│ Semantic Search  │  ← Vector search over skill descriptions
│ (ChromaDB)       │     within identified categories
└────────┬─────────┘
         │ top-K skills (5-10)
         ▼
┌──────────────────┐
│ Dynamic Binding  │  ← Only inject these K skill schemas into
│ (prompt builder) │     the LLM's tool-calling context
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   LLM Call       │  ← Model sees only relevant skills
│  (tool_choice)   │     not the full catalog of 1000+
└────────┬─────────┘
         │ tool_call response
         ▼
┌──────────────────┐
│ Skill Executor   │  ← Sandboxed execution with timeout,
│ (isolated)       │     logging, error handling
└──────────────────┘
```

**Key insight**: The LLM never sees all 1000+ skills. A retrieval layer picks the 5-10 most relevant skills per turn, keeping context lean and accurate.

---

#### [NEW] `backend/app/skills/` — New Skills Module (replaces `tools/`)

**`backend/app/skills/base.py`** — Skill base class (replaces `tools/base.py`)
```python
class BaseSkill(ABC):
    name: str                    # Unique identifier: "web_search"
    display_name: str            # Human label: "Web Search"
    description: str             # For LLM + semantic search
    category: SkillCategory      # Enum: WEB, CODE, DATA, FILE, IMAGE, ...
    tags: List[str]              # ["search", "internet", "research"]
    version: str                 # Semver: "1.0.0"
    requires_auth: bool          # Needs API key?
    required_config: List[str]   # ["TAVILY_API_KEY"]
    is_dangerous: bool           # Side-effects? (file writes, code exec)
    schema: Dict                 # JSON Schema for tool_call arguments
    
    async def execute(**kwargs) -> SkillResult
    async def validate_config() -> bool
```

**`backend/app/skills/categories.py`** — Skill category enum
```python
class SkillCategory(str, Enum):
    WEB = "web"                  # Search, scrape, fetch
    CODE = "code"                # Execute, lint, format, debug
    DATA = "data"                # Parse, transform, visualize
    FILE = "file"                # Read, write, convert
    IMAGE = "image"              # Generate, edit, analyze
    AUDIO = "audio"              # TTS, STT, music
    COMMUNICATION = "communication"  # Email, SMS, Slack
    KNOWLEDGE = "knowledge"      # RAG, embeddings, memory
    SYSTEM = "system"            # Canvas, workflows, internal
    UTILITY = "utility"          # Calculator, datetime, convert
```

**`backend/app/skills/registry.py`** — Scalable skill registry
- Auto-discovers skills from `skills/builtin/` directory via file scanning
- Registers each skill with its embedding vector (from description + tags)
- Stores skill metadata in SQLite `skills` table
- Exposes: `search(query, category, top_k)`, `get(name)`, `list(category)`, `enable/disable`
- Lazy-loads skill code (imports module only when needed for execution)

**`backend/app/skills/router.py`** — Intent router + semantic retrieval
- **Stage 1 — Intent classification**: Uses keyword matching + lightweight embedding similarity to identify relevant categories from the user message
- **Stage 2 — Semantic retrieval**: Searches ChromaDB for top-K skill descriptions within identified categories
- **Stage 3 — Dynamic binding**: Returns only the selected skill schemas for injection into the LLM prompt
- Configurable `top_k` (default 8, max 15)
- Falls back to full category scan if semantic search returns low confidence

**`backend/app/skills/executor.py`** — Sandboxed skill execution
- Timeout enforcement (30s default, configurable per skill)
- Error capture with formatted tracebacks
- Execution logging (skill name, args, duration, success/fail, tokens saved)
- Rate limiting per skill per user

#### [NEW] `backend/app/skills/builtin/` — 50+ Built-in Skills

Organized by category directories:

**`builtin/web/`** (8 skills)
| Skill | Description |
|---|---|
| `web_search` | Search the web (Tavily/Exa/Google) |
| `web_scrape` | Extract content from a URL |
| `web_screenshot` | Capture screenshot of a URL |
| `web_crawl` | Crawl multiple pages from a domain |
| `rss_reader` | Parse and summarize RSS feeds |
| `wikipedia` | Search and retrieve Wikipedia articles |
| `news_search` | Search recent news articles |
| `arxiv_search` | Search academic papers on arXiv |

**`builtin/code/`** (8 skills)
| Skill | Description |
|---|---|
| `code_execute` | Run Python code in a sandbox |
| `code_javascript` | Run JavaScript/Node.js code |
| `code_format` | Format code (Python, JS, JSON, etc.) |
| `code_lint` | Lint and analyze code for issues |
| `code_explain` | Explain code step-by-step |
| `code_debug` | Analyze errors and suggest fixes |
| `code_diff` | Generate diffs between code versions |
| `code_generate_tests` | Generate unit tests for code |

**`builtin/data/`** (6 skills)
| Skill | Description |
|---|---|
| `csv_analyze` | Analyze CSV data with statistics |
| `json_transform` | Parse, query, and transform JSON |
| `data_visualize` | Generate charts (bar, line, scatter, pie) |
| `regex_builder` | Build and test regular expressions |
| `sql_query` | Execute SQL on uploaded data |
| `data_convert` | Convert between formats (CSV↔JSON↔XML) |

**`builtin/file/`** (6 skills)
| Skill | Description |
|---|---|
| `file_read` | Read file contents (text, PDF, DOCX) |
| `file_write` | Write/create files |
| `file_convert` | Convert between file formats |
| `pdf_extract` | Extract text, images, tables from PDFs |
| `image_ocr` | Extract text from images (OCR) |
| `markdown_render` | Render markdown to HTML/PDF |

**`builtin/image/`** (5 skills)
| Skill | Description |
|---|---|
| `image_generate` | Generate images (DALL-E / Gemini / SD) |
| `image_edit` | Edit images (inpainting, variations) |
| `image_describe` | Describe image content (vision) |
| `image_resize` | Resize/crop/transform images |
| `image_remove_bg` | Remove image background |

**`builtin/audio/`** (3 skills)
| Skill | Description |
|---|---|
| `text_to_speech` | Convert text to audio (ElevenLabs/OpenAI/Browser) |
| `speech_to_text` | Transcribe audio to text (Whisper) |
| `audio_summarize` | Summarize audio/podcast content |

**`builtin/communication/`** (3 skills)
| Skill | Description |
|---|---|
| `email_draft` | Draft emails from context |
| `email_summarize` | Summarize email threads |
| `slack_format` | Format messages for Slack |

**`builtin/knowledge/`** (4 skills)
| Skill | Description |
|---|---|
| `rag_query` | Query knowledge bases |
| `rag_ingest` | Add documents to knowledge base |
| `memory_store` | Store facts in long-term memory |
| `memory_recall` | Recall stored facts |

**`builtin/utility/`** (7 skills)
| Skill | Description |
|---|---|
| `calculator` | Evaluate math expressions safely |
| `datetime_tool` | Date/time calculations and formatting |
| `unit_convert` | Convert between units |
| `uuid_generate` | Generate UUIDs, hashes, random strings |
| `qr_generate` | Generate QR codes |
| `translator` | Translate text between languages |
| `summarizer` | Summarize long text into key points |

**`builtin/system/`** (3 skills)
| Skill | Description |
|---|---|
| `canvas_write` | Create/update Canvas content |
| `canvas_read` | Read current Canvas state |
| `workflow_trigger` | Trigger a saved workflow |

#### [NEW] `backend/app/api/routes/skills.py` — Skills API

- `GET /api/skills` — list all skills with pagination, filtering by category/tag/status
- `GET /api/skills/{name}` — get skill details + schema
- `PUT /api/skills/{name}/enable` — enable/disable a skill
- `GET /api/skills/categories` — list categories with skill counts
- `GET /api/skills/search?q=...` — semantic search over skills
- `POST /api/skills/{name}/test` — test a skill with sample input
- `GET /api/skills/active?chat_id=...` — get skills active for a conversation

#### [MODIFY] [chat.py](file:///c:/Users/dasan/Documents/AI%20App/backend/app/api/routes/chat.py)

- Replace direct `tool_registry.get_all_schemas()` with `skill_router.get_relevant_skills(messages)`
- Only inject dynamically-selected skill schemas into the LLM call
- Pass skill execution results back through the tool-call loop
- Log which skills were selected vs. executed per turn

#### [NEW] `frontend/src/components/skills/skill-marketplace.tsx`

- Full-page skill browser (accessible from sidebar)
- Grid of skill cards organized by category tabs
- Each card: icon, name, description, category badge, enable/disable toggle
- Search bar with instant filtering
- "Active Skills" section showing what's enabled for current chat
- Skill detail panel with config options, usage stats, test button

#### [NEW] `frontend/src/components/skills/skill-indicator.tsx`

- Small chip/badge in chat header showing count of active skills
- Click to expand dropdown of active skills for current chat
- Shows which skills were used in each assistant response

#### [NEW] `frontend/src/components/chat/skill-result.tsx`

- Inline display of skill execution results in chat
- Type-specific renderers: code output, charts, images, file downloads, search results
- Collapsible "Skill used: web_search" header with execution time
- Error state with formatted details

---

## Phase 3 — Authentication & Server-Side Persistence 🔐

Optional auth system — user signs in, saves API keys on the server, uses the app.

---

#### [NEW] `backend/app/core/auth.py`

- JWT-based authentication (access + refresh tokens)
- Password hashing with `bcrypt` via `passlib`
- Token generation/validation utilities
- `AUTH_ENABLED` environment variable toggle — when `False`, all routes are open (single-user mode)
- Middleware that checks JWT on protected routes when auth is enabled

#### [NEW] `backend/app/database/models/user.py`

- `User` model: id, email, username, hashed_password, avatar_url, created_at, is_active
- `UserApiKey` model: user_id, provider_name, encrypted_api_key, created_at
  - API keys encrypted at rest using `cryptography.fernet` with a server-side secret
  - One row per provider per user

#### [NEW] `backend/app/api/routes/auth.py`

- `POST /api/auth/signup` — create account (email, username, password)
- `POST /api/auth/login` — returns JWT access + refresh tokens
- `POST /api/auth/refresh` — refresh access token
- `GET /api/auth/me` — current user profile
- `PUT /api/auth/me` — update profile (username, avatar)
- `PUT /api/auth/password` — change password

#### [NEW] `backend/app/api/routes/api_keys.py`

- `GET /api/keys` — list user's saved providers (names only, not key values)
- `POST /api/keys` — save an API key for a provider (encrypted server-side)
- `DELETE /api/keys/{provider}` — remove a saved key
- `GET /api/keys/{provider}/test` — test connectivity with saved key
- Keys are decrypted only at call-time, never sent to frontend

#### [MODIFY] [conversation.py](file:///c:/Users/dasan/Documents/AI%20App/backend/app/database/models/conversation.py)

- Add `user_id: String` — links conversation to user
- Add `system_prompt: Text` — per-conversation system prompt
- Add `model: String`, `provider: String` — which model was used
- Add `is_pinned: Boolean`, `is_archived: Boolean`
- Add `tags: String` — JSON-encoded tags
- Add `token_count: Integer` — total tokens used
- Add `parent_conversation_id: String` — for branching
- Add `branch_point_index: Integer`
- Add `Message.metadata: Text` — JSON for token counts, latency, reactions, skill usage

#### [NEW] `backend/app/api/routes/conversations.py`

- Full CRUD REST API for server-side conversation persistence
- `POST /api/conversations` — create
- `GET /api/conversations` — list with pagination, search, sort, folder filter
- `GET /api/conversations/{id}` — get with messages
- `PUT /api/conversations/{id}` — update title, tags, pin, archive
- `DELETE /api/conversations/{id}` — soft delete
- `POST /api/conversations/{id}/messages` — append message
- `POST /api/conversations/{id}/fork` — branch from a message index
- `POST /api/conversations/export` — export as JSON
- `POST /api/conversations/import` — import JSON (supports OpenWebUI format)

#### [MODIFY] [main.py](file:///c:/Users/dasan/Documents/AI%20App/backend/app/main.py)

- Register all new route modules (auth, api_keys, conversations, skills)
- Add startup event to create database tables
- Conditional auth middleware based on `AUTH_ENABLED` env var
- Expanded `/health` with provider connectivity status

#### [MODIFY] [session.py](file:///c:/Users/dasan/Documents/AI%20App/backend/app/database/session.py)

- Switch to async SQLAlchemy with `aiosqlite` (already in requirements)
- Add Alembic migration support
- Connection pooling configuration

#### [MODIFY] [app-store.ts](file:///c:/Users/dasan/Documents/AI%20App/frontend/src/store/app-store.ts)

- Add `systemPrompt`, `temperature`, `topP`, `maxTokens` — per-chat params
- Add `pinnedChatIds`, `chatFolders`, `messageReactions`, `chatTags`
- Add `exportChat(id)` / `importChat(data)` / `duplicateChat(id)`
- API key storage: if auth is enabled, keys live server-side; if not, keep in Zustand

#### [NEW] `frontend/src/store/auth-store.ts`

- Auth state: `user`, `token`, `isAuthenticated`, `isAuthEnabled`
- `login()`, `signup()`, `logout()`, `refreshToken()` actions
- Auto-refresh token before expiry

#### [NEW] `frontend/src/components/auth/login-page.tsx`

- Beautiful sign-in / sign-up page with gradient background
- Email + password form with validation
- "Continue without account" option (when auth is optional)
- Animated transitions between sign-in and sign-up

#### [NEW] `frontend/src/lib/api-client.ts`

- Centralized API client
- Base URL config, auth header injection, error handling, retry logic
- Type-safe request/response wrappers
- Auto-redirect to login on 401

---

## Phase 4 — Universal Provider System (25+ Providers) 🌐

Expand from 3 providers to 25+ with a unified adapter architecture.

---

> [!IMPORTANT]
> Almost all modern LLM providers use the OpenAI-compatible API format. This means our existing `OpenAICompatibleProvider` can power most providers — we just need different base URLs, headers, and quirk-handling.

#### [NEW] `backend/app/providers/provider_configs.py` — Provider definitions

Master configuration for all 25+ providers:

| # | Provider | Type | Base URL | Notes |
|---|---|---|---|---|
| 1 | **Local (LM Studio)** | Local | `localhost:1234/v1` | No auth needed |
| 2 | **Ollama** | Local | `localhost:11434/v1` | OpenAI-compat mode |
| 3 | **OpenAI** | Cloud | `api.openai.com/v1` | GPT-4o, o3, GPT-5 |
| 4 | **Anthropic** | Cloud | `api.anthropic.com/v1` | Needs custom adapter (non-OpenAI format) |
| 5 | **Google (Gemini)** | Cloud | `generativelanguage.googleapis.com/v1beta/openai` | OpenAI-compat endpoint |
| 6 | **Groq** | Cloud | `api.groq.com/openai/v1` | Ultra-fast inference |
| 7 | **Together AI** | Cloud | `api.together.xyz/v1` | Open-weight models |
| 8 | **Fireworks AI** | Cloud | `api.fireworks.ai/inference/v1` | Fast inference |
| 9 | **Mistral** | Cloud | `api.mistral.ai/v1` | Mistral models |
| 10 | **Cohere** | Cloud | `api.cohere.com/v2` | Needs custom adapter |
| 11 | **DeepSeek** | Cloud | `api.deepseek.com/v1` | Reasoning models |
| 12 | **OpenRouter** | Gateway | `openrouter.ai/api/v1` | 400+ models aggregator |
| 13 | **Perplexity** | Cloud | `api.perplexity.ai` | Search-augmented |
| 14 | **xAI (Grok)** | Cloud | `api.x.ai/v1` | Grok models |
| 15 | **DeepInfra** | Cloud | `api.deepinfra.com/v1/openai` | Budget inference |
| 16 | **SiliconFlow** | Cloud | `api.siliconflow.cn/v1` | CN-optimized |
| 17 | **Cerebras** | Cloud | `api.cerebras.ai/v1` | Fast inference |
| 18 | **SambaNova** | Cloud | `api.sambanova.ai/v1` | Enterprise |
| 19 | **Lepton AI** | Cloud | `api.lepton.ai/v1` | Serverless models |
| 20 | **Novita AI** | Cloud | `api.novita.ai/v3/openai` | Open models |
| 21 | **HuggingFace** | Cloud | `api-inference.huggingface.co/v1` | Inference API |
| 22 | **AWS Bedrock** | Cloud | Custom | Needs custom adapter (SigV4 auth) |
| 23 | **Azure OpenAI** | Cloud | Custom per deployment | Needs custom adapter (API versioning) |
| 24 | **Cloudflare AI** | Cloud | `api.cloudflare.com/client/v4/accounts/{id}/ai` | Workers AI |
| 25 | **AI21** | Cloud | `api.ai21.com/studio/v1` | Jamba models |

Each provider config includes:
```python
@dataclass
class ProviderConfig:
    id: str                      # "groq"
    name: str                    # "Groq"
    icon: str                    # "groq" (maps to frontend icon)
    base_url: str                # API endpoint
    api_key_env: str             # "GROQ_API_KEY"
    adapter: str                 # "openai_compatible" | "anthropic" | "cohere" | "bedrock" | "azure"
    supports_streaming: bool
    supports_vision: bool
    supports_tool_calling: bool
    model_list_endpoint: str     # "/models" or custom
    default_model: str           # Suggested default
    quirks: Dict                 # Provider-specific adjustments
```

#### [NEW] `backend/app/providers/anthropic.py` — Anthropic adapter

- Uses Anthropic's native Messages API format (not OpenAI-compatible)
- Maps our internal message format to Anthropic's `messages` with `system` parameter
- Handles streaming via Anthropic's SSE format (`message_start`, `content_block_delta`, etc.)
- Supports `thinking` blocks natively (maps to our thought-block parsing)
- Tool calling via Anthropic's format

#### [NEW] `backend/app/providers/cohere.py` — Cohere adapter

- Maps to Cohere's Chat API v2 format
- Handles Cohere-specific response structure

#### [NEW] `backend/app/providers/bedrock.py` — AWS Bedrock adapter

- SigV4 request signing
- Model invocation via Bedrock Runtime API
- Streaming via Bedrock's event stream format

#### [NEW] `backend/app/providers/azure_openai.py` — Azure OpenAI adapter

- Deployment-based URL construction
- API version query parameter
- Azure AD token support

#### [MODIFY] [registry.py](file:///c:/Users/dasan/Documents/AI%20App/backend/app/providers/registry.py)

- Complete rewrite: dynamic provider loading from `provider_configs.py`
- Auto-detects which providers are configured (have API keys)
- `get_provider(name, api_key?)` → returns correct adapter instance
- `list_available()` → returns all providers with their connectivity status
- `test_connection(name)` → verifies API key works

#### [MODIFY] [openai_compatible.py](file:///c:/Users/dasan/Documents/AI%20App/backend/app/providers/openai_compatible.py)

- Add `quirks` parameter for provider-specific adjustments:
  - Custom headers (e.g., OpenRouter needs `X-Title`, `HTTP-Referer`)
  - Model name mapping (e.g., `models/` prefix stripping for Google)
  - Response format differences
  - Timeout adjustments
- Support multi-part messages with `image_url` content type for vision models
- Support `reasoning_content` / thinking tokens in response parsing

#### [MODIFY] [config.py](file:///c:/Users/dasan/Documents/AI%20App/backend/app/core/config.py)

- Add all 25+ provider API key environment variables
- Add `AUTH_ENABLED: bool = False`
- Add `AUTH_SECRET_KEY: str` — for JWT signing
- Add `ENCRYPTION_KEY: str` — for API key encryption at rest
- Add `SKILL_TOP_K: int = 8` — max skills per turn
- Add `DEFAULT_PROVIDER: str = "local"`

#### [NEW] `frontend/src/components/settings/provider-grid.tsx`

- Visual grid of all 25+ provider cards
- Each card: provider icon/logo, name, status indicator (🟢 connected / 🟡 needs key / 🔴 error)
- Click to configure: API key input, test connection, set as default
- Group by type: Local, Frontier, Inference, Gateway, Enterprise

---

## Phase 5 — RAG & Knowledge Management 📚

Let users chat with their documents.

---

#### [NEW] `backend/app/rag/` — RAG Module

**`embeddings.py`**
- Embedding provider abstraction
- Local: `sentence-transformers` (all-MiniLM-L6-v2)
- API: OpenAI embeddings, Google embeddings, Cohere embeddings
- Batch processing with progress

**`vector_store.py`**
- ChromaDB for local vector storage
- CRUD on collections: create, query, delete
- Hybrid search: vector similarity + keyword BM25

**`document_processor.py`**
- File parsing: PDF (`PyMuPDF`), DOCX (`python-docx`), TXT, MD, CSV, JSON, XLSX
- Intelligent chunking: 512 tokens, 64 token overlap
- Metadata extraction (filename, page, section headers)

**`retriever.py`**
- Top-K retrieval with relevance scoring
- Context window management
- Optional cross-encoder re-ranking

#### [NEW] `backend/app/api/routes/documents.py`

- `POST /api/documents/upload` — upload, parse, chunk, embed, store
- `GET /api/documents` — list with metadata
- `DELETE /api/documents/{id}` — remove + embeddings
- `POST /api/documents/query` — raw similarity search

#### [NEW] `backend/app/api/routes/knowledge.py`

- CRUD for named knowledge bases (collections of documents)
- Attach knowledge bases to conversations

#### [MODIFY] [chat.py](file:///c:/Users/dasan/Documents/AI%20App/backend/app/api/routes/chat.py)

- Accept `knowledge_base_ids: List[str]` in `ChatRequest`
- Retrieve relevant chunks, prepend as context
- Include source citations in response metadata

#### [NEW] `frontend/src/components/knowledge/knowledge-panel.tsx`

- Sidebar panel or dedicated page
- Drag-and-drop file upload with progress
- Document list with type icons, chunk count, status
- Knowledge base cards

#### [NEW] `frontend/src/components/knowledge/rag-toggle.tsx`

- Per-chat toggle for RAG
- Knowledge base selection dropdown

---

## Phase 6 — Multimodal Capabilities 🎙️🎨📎

Voice, image, file support, and code execution.

---

#### [NEW] `frontend/src/components/chat/file-upload.tsx`

- Paperclip button in chat input
- Images (preview inline), PDFs (parse via backend), code files
- Drag-and-drop onto chat area
- File preview pills with remove button

#### [NEW] `frontend/src/components/chat/voice-input.tsx`

- Microphone button with `SpeechRecognition` API (zero dependency)
- Visual waveform animation while recording
- `Ctrl+Shift+V` shortcut

#### [NEW] `frontend/src/components/chat/tts-player.tsx`

- Speaker icon on assistant messages
- Browser `SpeechSynthesis` for basic TTS (zero dependency)
- Optional ElevenLabs / OpenAI TTS API for premium voices
- Voice selection in settings

#### [NEW] `backend/app/api/routes/files.py`

- Upload, serve, validate files
- Image resizing for vision models

#### [NEW] `backend/app/api/routes/images.py`

- `POST /api/images/generate` — DALL-E / Gemini / Stable Diffusion
- Image editing (inpainting, variations)

#### [NEW] `backend/app/sandbox/executor.py` — Code Execution Sandbox

- Sandboxed Python execution via `subprocess` with resource limits
- Timeout enforcement (30s), stdout/stderr capture
- Matplotlib → base64 image rendering
- Persistent sessions per conversation

#### [NEW] `backend/app/api/routes/execute.py`

- `POST /api/execute` — run code, return output
- `POST /api/execute/install` — install pip packages in sandbox

#### [NEW] `frontend/src/components/chat/code-output.tsx`

- Inline code execution results
- Syntax-highlighted code + output panels
- Image output rendering (matplotlib plots)
- Error states, "Re-run" button

---

## Phase 7 — Analytics & Token Dashboard 📊

---

#### [NEW] `backend/app/database/models/usage.py`

- `UsageRecord`: timestamp, provider, model, prompt_tokens, completion_tokens, latency_ms, cost_estimate, skill_name

#### [NEW] `backend/app/api/routes/analytics.py`

- Usage over time, breakdown by model/provider, cost tracking, most active conversations, skill usage stats

#### [NEW] `frontend/src/app/analytics/page.tsx`

- Token usage area chart, cost donut by provider, model popularity bar chart, skill usage heatmap
- Summary cards: total tokens, estimated spend, avg response time, total conversations
- Uses `recharts` for charting

---

## Phase 8 — 🌟 Unique Differentiating Features

Features **Open WebUI does NOT have**.

---

### 🏟️ 8A: Arena Mode (Model Battle)

Compare 2+ models side-by-side on the same prompt, vote on the best.

**`frontend/src/components/arena/arena-view.tsx`**
- Split-screen: 2-4 model columns with independent streaming
- Vote buttons: A wins / B wins / Tie
- Blind mode: model names hidden until after voting
- Elo rating leaderboard

**`backend/app/api/routes/arena.py`**
- `POST /api/arena/battle` — send prompt to N providers, return N streams
- `POST /api/arena/vote` — record result
- `GET /api/arena/leaderboard` — Elo rankings

**`backend/app/database/models/arena.py`**
- `ArenaMatch`, `ModelRating` models

---

### 🎭 8B: AI Personas

Custom AI personalities with persistent system prompts, avatars, presets.

**`frontend/src/components/personas/persona-manager.tsx`**
- Gallery of persona cards with avatars
- Create/edit: name, avatar, system prompt, default model, temperature, greeting
- Quick-switch in chat header
- Built-in presets: "Code Reviewer", "Creative Writer", "Research Assistant", "Socratic Tutor", "Devil's Advocate", "Data Analyst", "Product Manager", "Technical Interviewer"

**`backend/app/api/routes/personas.py`** + **`backend/app/database/models/persona.py`**
- Full CRUD + presets endpoint

---

### 🔗 8C: Prompt Chains (Workflow Builder)

Visual workflow builder — chain prompts, tools, conditionals.

**`frontend/src/components/workflows/workflow-builder.tsx`**
- Drag-and-drop node editor (no external lib)
- Node types: Prompt, Conditional, Loop, Skill Call, Output
- Each node can use a different model/provider
- Variables: `{{input}}`, `{{step1_output}}`, `{{file_content}}`
- One-click run with step visualization
- Save/load templates

**`backend/app/api/routes/workflows.py`** + **`backend/app/database/models/workflow.py`**
- CRUD + execution endpoint with SSE progress

---

### 🎨 8D: Interactive Canvas

Free-form side panel where AI creates and iterates on content.

**`frontend/src/components/canvas/canvas-panel.tsx`**
- Resizable side panel alongside chat
- Content types: Markdown doc, Code (Monaco editor), Mermaid diagrams, HTML preview
- AI writes/modifies via `canvas_write` / `canvas_read` skills
- Version history with diff view
- Export to file

---

### ⚡ 8E: Prompt Library

Save, tag, and reuse prompt templates.

**`frontend/src/components/prompts/prompt-library.tsx`**
- Create/edit prompt templates with variables (`{{topic}}`, `{{language}}`)
- Tags and categories
- Community-inspired presets
- Quick-insert into chat

**`backend/app/api/routes/prompts.py`** + **`backend/app/database/models/prompt.py`**
- CRUD for prompt templates
- Variable substitution engine

---

## Phase 9 — Infrastructure & Deployment 🔧

Production hardening (Docker deferred here as requested).

---

#### Performance Optimizations

- **Frontend**: `React.memo` on message list, virtualized scrolling (`react-window`), lazy loading for Canvas/Workflows/Arena
- **Backend**: Response caching for model lists, connection pooling, async DB operations
- **SSE**: Backpressure handling, reconnection with exponential backoff

#### [NEW] `frontend/src/components/chat/chat-export.tsx`

- Export as Markdown, JSON, PDF
- Import from OpenWebUI JSON format
- Share via unique link (if auth enabled)

#### [NEW] `docker-compose.yml`

- Single-file deployment: backend + frontend + ChromaDB
- Volume mounts for persistent data
- Environment variable configuration

#### [NEW] `Dockerfile.backend` + `Dockerfile.frontend`

- Multi-stage builds for minimal image size
- Health check endpoints

---

## New Dependency Summary

### Backend (`requirements.txt` additions)

```
# Auth
pyjwt>=2.0.0
passlib[bcrypt]>=1.7.0
cryptography>=41.0.0

# RAG
chromadb>=0.4.0
sentence-transformers>=2.0.0
pymupdf>=1.23.0
python-docx>=1.0.0

# Providers
anthropic>=0.30.0

# Sandbox
# (uses stdlib subprocess — no extra deps)

# Image Processing
pillow>=10.0.0
```

### Frontend (`package.json` additions)

```json
{
  "recharts": "^2.12.0",
  "react-window": "^1.8.0",
  "@monaco-editor/react": "^4.6.0"
}
```

---

## Verification Plan

### Automated Tests

```bash
# Backend
cd backend && python -m pytest tests/ -v --cov=app

# Frontend build
cd frontend && npm run build

# Lint
cd frontend && npm run lint
```

### Manual Verification by Phase

| Phase | Key Tests |
|---|---|
| **1 — UI** | Dark/light toggle, command palette `Ctrl+K`, message actions, responsive breakpoints |
| **2 — Skills** | Verify only 5-10 skills injected per turn (not 50+); test web_search, code_execute, calculator; skill marketplace browse |
| **3 — Auth** | Sign up → login → save API key → verify key persists → logout → login again → key still there |
| **4 — Providers** | Connect 5+ providers, fetch models from each, send messages, verify streaming |
| **5 — RAG** | Upload PDF, verify chunks, ask questions about document, check source citations |
| **6 — Multimodal** | Voice recording → transcription → send; TTS playback; image upload to vision model; code execution + plot |
| **7 — Analytics** | Token counts accumulate, charts render, cost estimates match |
| **8 — Unique** | Arena: 2 models stream simultaneously; Personas: switch and verify system prompt; Workflow: chain 3 steps; Canvas: AI writes document |
| **9 — Infra** | `docker-compose up` starts everything; import OpenWebUI chat; export as markdown |

### Incremental Shipping

Each phase produces a working, testable increment. Run `npm run dev:all` after each phase and validate before proceeding.
