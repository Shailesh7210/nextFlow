# NexFlow - Enterprise Visual Workflow Automation Platform

NexFlow is an n8n-inspired, self-hosted visual workflow automation platform. Build directed graphs of trigger → logic → action → AI & RAG nodes on a drag-and-drop React Flow canvas with asynchronous Celery execution, WebSocket real-time step streaming, AES-256 encrypted credentials, multi-tenant RBAC isolation, and RAG knowledge retrieval.

---

## 🚀 Key Features & Completed Architecture (Phases 1-21)

- **Phase 1: Multi-Tenant Workspace & RBAC Scoping** — Tenant isolation with role-based permissions (`owner`, `admin`, `editor`, `viewer`).
- **Phase 2: Visual Node Editor** — Interactive drag-and-drop graph nodes (Webhook, HTTP Request, Set Variable, IF Condition, Switch Router, Delay Waiter).
- **Phase 3: Sequential Versioning & Publishing** — Snapshot draft graphs into immutable version records (`wfv_...`) with active pointer switching.
- **Phase 4: State Persistence & Canvas History** — Full Zustand store persistence with undo/redo history stack (`pushHistory`, `undo`, `redo`).
- **Phase 5: Secure Credential Management** — AES-256-GCM authenticated encryption at rest for basic auth & API keys with response masking (`********`).
- **Phase 6: Async Execution Engine** — Background Celery execution worker with Redis broker and DB logging (`exl_...`).
- **Phase 7: Webhooks & Scheduling** — Inbound webhook trigger receiver (`POST /api/v1/webhooks/{id}`) with query, header, and payload extraction.
- **Phase 8: Execution History UI & Inspector** — Slide-out execution history drawer with step-by-step node trace inspector.
- **Phase 9: Real-Time WebSockets & Canvas Visualizer** — Redis Pub/Sub WebSocket streaming (`/api/v1/ws/executions/{id}`) with glowing node badges (`RUNNING`, `SUCCESS`, `FAILED`) and edge animations.
- **Phase 10: AI / LLM Integration & Templates Hub** — `ai-prompt` node supporting OpenAI/Gemini models, pre-built templates gallery, and JSON Export/Import.
- **Phase 11: Enterprise Dashboard & Analytics** — Workspace analytics summary API (`GET /api/v1/workflows/analytics/summary`), stat cards, recent runs table, and header navigation tabs.
- **Phase 12: Production Readiness & Docker Service Stack** — One-command multi-container Docker deployment (`docker-compose.yml`), multi-stage frontend Dockerfile, and component health monitoring (`/health/detailed`).
- **Phase 13: Sub-Workflow Invocation Node & Graph Nesting Engine** — Sub-workflow node (`execute-workflow`), nested child graph traversal, output payload propagation, and circular recursion depth safeguard.
- **Phase 14: Looping & Array Processing Node & Batch Execution Engine** — Array iteration node (`loop-items`), dynamic payload resolution (`{{ $json.items }}`), iteration cap limits, and aggregated output batching.
- **Phase 15: Node-Level Error Handling & Fallback Retry Engine** — Automatic retries with exponential backoff delay (`retry_on_fail`, `max_retries`), continue-on-fail error swallowing (`continue_on_fail`), and visual node error indicators.
- **Phase 16: Custom Webhook Response Node & Synchronous Response Engine** — Custom HTTP response node (`respond-to-webhook`), synchronous execution mode (`?sync=true`), custom HTTP status codes, headers, and dynamic response payloads.
- **Phase 17: Custom Code Execution Node & Dynamic Transformation Engine** — Inline sandboxed Python script node (`code-script`), variable payload scope (`$json`, `$input`, `$node`), array filtering/mapping, math calculations, and quick insert code snippets.
- **Phase 18: Human-in-the-Loop Approval Node & Paused Workflow Engine** — Approval gate node (`human-approval`), workflow execution pause (`PAUSED`), secure response tokens, approvals API router (`GET /pending`, `POST /{token}/respond`), twin `approved`/`rejected` output handles, and execution resumption.
- **Phase 19: User Profile & Account Settings** — User profile modal (`UserProfileModal.tsx`), full name & password updates (`PATCH /api/v1/auth/me`), and user avatar menu.
- **Phase 20: SMTP Email Workspace Invitations** — SMTP email dispatch service (`app/core/email.py`), invitation background tasks, secure token validation, and email password delivery.
- **Phase 21: Vector DB & RAG Knowledge Retrieval System** — Multi-tenant document vector embeddings (`DocumentEmbedding` table with `workspace_id` scoping), text chunker (`document-chunker`), vector indexer (`vector-indexer`), vector search (`rag-retriever`), cosine similarity search, and offline L2-normalized fallback embeddings.

---

## 📁 Project Structure

```
NexFlow/
├── apps/
│   ├── web/                     # Next.js 14 Web Editor (React Flow, Zustand, WebSockets, Tailwind)
│   └── backend/                 # FastAPI Control Plane, Celery Worker, Async SQLAlchemy, Redis, RAG
├── docker-compose.yml           # Production multi-container orchestration stack
├── .env.example                 # Production environment variables template
└── README.md
```

---

## 🛠️ Prerequisites

Before running NexFlow, ensure you have the following installed:

- **Docker & Docker Compose** (Recommended for easiest setup)
- *OR for manual local development:*
  - **Python**: `3.11+`
  - **Node.js**: `18.0+` or `20.0+` & `npm`
  - **PostgreSQL**: `15+`
  - **Redis**: `7+`

---

## ⚡ Option 1: Quick Start via Docker Compose (Recommended)

To boot up the complete multi-container production stack (PostgreSQL, Redis, FastAPI Backend Control Plane, Celery Worker, Celery Beat, and Next.js Web UI) in a single command:

1. **Clone the repository & enter workspace directory:**
   ```bash
   cd NexFlow
   ```

2. **Copy environment variables template:**
   ```bash
   cp .env.example .env
   ```

3. **Build and start all services:**
   ```bash
   docker compose up --build
   ```

### 🌐 Access Ports & Services
- **Next.js Web UI:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Control Plane:** [http://localhost:8000](http://localhost:8000)
- **Interactive OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check Endpoint:** [http://localhost:8000/health/detailed](http://localhost:8000/health/detailed)
- **PostgreSQL Database:** `localhost:5433`
- **Redis Server:** `localhost:6379`

---

## 💻 Option 2: Local Development Setup (Manual)

If you prefer to run services manually for active development:

### Step 1: Start PostgreSQL and Redis
You can start PostgreSQL and Redis using Docker:
```bash
docker run -d --name nexflow-postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=nexflow postgres:15
docker run -d --name nexflow-redis -p 6379:6379 redis:7
```

### Step 2: Configure Backend (`apps/backend`)

1. Navigate to the backend directory:
   ```bash
   cd apps/backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up backend environment variables (create `.env` inside `apps/backend` or set in environment):
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/nexflow
   REDIS_URL=redis://localhost:6379/0
   CELERY_BROKER_URL=redis://localhost:6379/1
   CELERY_RESULT_BACKEND=redis://localhost:6379/2
   SECRET_KEY=dev-secret-key-change-in-production-12345
   CREDENTIAL_ENCRYPTION_KEY=32-character-base64-key-for-aes-gcm
   ```

5. Run database migrations:
   ```bash
   alembic upgrade head
   ```

6. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

7. In a separate terminal, start the Celery worker:
   ```bash
   cd apps/backend
   # Activate virtualenv first
   # On Windows:
   celery -A app.core.celery_app worker --loglevel=info --pool=solo
   # On Linux/macOS:
   celery -A app.core.celery_app worker --loglevel=info
   ```

### Step 3: Configure Frontend (`apps/web`)

1. Open a new terminal and navigate to the web directory:
   ```bash
   cd apps/web
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@db:5432/nexflow` | Async PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379/0` | Redis URL for Pub/Sub & caching |
| `CELERY_BROKER_URL` | `redis://redis:6379/1` | Celery task queue broker URL |
| `CELERY_RESULT_BACKEND` | `redis://redis:6379/2` | Celery execution result storage URL |
| `SECRET_KEY` | `dev-secret-key...` | JWT token signing key |
| `CREDENTIAL_ENCRYPTION_KEY` | `32-character-base64-key...` | AES-256-GCM key for encrypted credentials |
| `OPENAI_API_KEY` | *(Optional)* | Used for LLM nodes & high-precision RAG vector embeddings |
| `SMTP_HOST` | *(Optional)* | Host for outgoing invitation emails |
| `SMTP_PORT` | `587` | Port for SMTP service |
| `SMTP_USER` | *(Optional)* | Sender email username |
| `SMTP_PASSWORD` | *(Optional)* | Sender email password |

---

## 🧪 Running Automated Test Suite

### Run Backend Tests (Pytest)
```bash
cd apps/backend
pytest
```
*Executes all 27+ tests covering Auth, Multi-Tenancy, Credentials, Workflow Graph Engine, Webhooks, Approval Gates, and Vector RAG.*

### Verify Frontend Production Build
```bash
cd apps/web
npm run build
```
*Compiles Next.js application to verify zero TypeScript or syntax errors.*

---

## 🤖 RAG Knowledge Retrieval Workflow Example

NexFlow includes built-in RAG (Retrieval-Augmented Generation) nodes:
1. **Document Chunker Node (`document-chunker`)**: Splits raw input text into overlapping chunks.
2. **Vector Indexer Node (`vector-indexer`)**: Generates embeddings and saves chunks into multi-tenant isolated vector storage.
3. **RAG Retriever Node (`rag-retriever`)**: Searches stored document embeddings by cosine similarity for top-K matching contexts.
4. **AI Prompt Node (`ai-prompt`)**: Synthesizes retrieved context into an accurate LLM answer.

---

## 🌐 Deploying to Render

NexFlow includes a `render.yaml` Blueprint specification for one-click stack deployment on Render.

1. **Push your code to GitHub / GitLab.**
2. Go to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** $\rightarrow$ **Blueprint**.
4. Connect your NexFlow repository.
5. Render will automatically detect `render.yaml` and provision:
   - **PostgreSQL Database** (`nexflow-db`)
   - **Redis Cache & Celery Broker** (`nexflow-redis`)
   - **FastAPI Control Plane** (`nexflow-backend`)
   - **Celery Execution Worker** (`nexflow-worker`)
   - **Next.js Web UI** (`nexflow-web`)
6. Fill in your environment secrets (`SMTP_USER`, `SMTP_PASSWORD`, `OPENAI_API_KEY`) when prompted.
7. Click **Apply** to deploy!

