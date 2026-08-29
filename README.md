# NexFlow - Visual Workflow Automation Platform

NexFlow is an n8n-inspired, self-hosted visual workflow automation platform. Build directed graphs of trigger → logic → action → AI nodes on a drag-and-drop canvas.

## Features (Roadmap)
- **Visual Editor:** Drag-and-drop nodes using React Flow.
- **Asynchronous Execution:** Heavy tasks and API integrations are offloaded to Celery workers backed by Redis.
- **Robust Database Schema:** Workspace partitioning, RBAC, execution history, and credential storage.
- **Secure Credentials:** AES-GCM encryption at rest for sensitive configurations.
- **Websockets:** Real-time execution status streams back to the frontend.

## Project Structure
```
NexFlow/
├── apps/
│   ├── web/                     # Next.js frontend (React Flow editor)
│   └── backend/                 # FastAPI backend control plane + Celery worker
├── docker-compose.yml           # Local multi-container development environment
└── README.md
```

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (for frontend local dev)
- Python 3.11+ (for backend local dev)

### Running the Stack via Docker
To boot up the complete Postgres, Redis, and FastAPI stack:
```bash
docker compose up --build
```

Access the FastAPI server at `http://localhost:8000/health` or view the interactive OpenAPI documentation at `http://localhost:8000/docs`.
