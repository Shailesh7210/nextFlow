# NexFlow - Enterprise Visual Workflow Automation Platform

NexFlow is an n8n-inspired, self-hosted visual workflow automation platform. Build directed graphs of trigger → logic → action → AI nodes on a drag-and-drop React Flow canvas with asynchronous Celery execution, WebSocket real-time step streaming, AES-256 encrypted credentials, and workspace analytics.

---

## 🚀 Key Features & Completed Architecture (Phases 1-12)

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

---

## 📁 Project Structure

```
NexFlow/
├── apps/
│   ├── web/                     # Next.js 14 Web Editor (React Flow, Zustand, WebSockets, Tailwind)
│   └── backend/                 # FastAPI Control Plane, Celery Worker, Async SQLAlchemy, Redis
├── docker-compose.yml           # Production multi-container orchestration stack
├── .env.example                 # Production environment variables template
└── README.md
```

---

## ⚡ Quick Start: Deploying via Docker Compose

To boot up the complete multi-container production stack (PostgreSQL, Redis, FastAPI Backend Control Plane, Celery Worker, Celery Beat, and Next.js Web UI) in a single command:

```bash
docker compose up --build
```

### Access Ports & Services:
- **Next.js Web UI:** `http://localhost:3000`
- **FastAPI Control Plane:** `http://localhost:8000`
- **Health Check Endpoint:** `http://localhost:8000/health/detailed`
- **Interactive OpenAPI Docs:** `http://localhost:8000/docs`
- **PostgreSQL Database:** `localhost:5433`
- **Redis Server:** `localhost:6379`

---

## 🧪 Running Automated Test Suite

To run the backend test suite:

```bash
cd apps/backend
.venv\Scripts\pytest
```

To run the frontend production build verification:

```bash
cd apps/web
npm run build
```
