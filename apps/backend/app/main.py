from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import settings
from app.db.session import get_db, engine
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic: verify database connection and run Alembic migrations
    logger.info("Verifying database connection and applying Alembic migrations on startup...")
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified successfully.")

        try:
            from alembic.config import Config
            from alembic import command
            alembic_cfg = Config("alembic.ini")
            sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
            alembic_cfg.set_main_option("sqlalchemy.url", sync_url)
            command.upgrade(alembic_cfg, "head")
            logger.info("Alembic database migrations applied successfully.")
        except Exception as mig_err:
            logger.error(f"Error applying database migrations: {mig_err}")

    except Exception as e:
        logger.error(f"Database connection failed on startup: {e}")
    
    yield
    
    # Shutdown logic: clean up connection pool
    logger.info("Disposing database connection pool...")
    await engine.dispose()
    logger.info("Shutdown completed.")

from app.api.v1 import auth, workflows, credentials, webhooks, websocket, approvals, api_keys, workspaces
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )



# Register routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(workflows.router, prefix=f"{settings.API_V1_STR}/workflows", tags=["workflows"])
app.include_router(credentials.router, prefix=f"{settings.API_V1_STR}/credentials", tags=["credentials"])
app.include_router(webhooks.router, prefix=f"{settings.API_V1_STR}/webhooks", tags=["webhooks"])
app.include_router(websocket.router, prefix=f"{settings.API_V1_STR}/ws", tags=["websocket"])
app.include_router(approvals.router, prefix=f"{settings.API_V1_STR}/approvals", tags=["approvals"])
app.include_router(api_keys.router, prefix=f"{settings.API_V1_STR}/api-keys", tags=["api-keys"])
app.include_router(workspaces.router, prefix=f"{settings.API_V1_STR}/workspaces", tags=["workspaces"])

@app.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    try:
        # Perform light verification query
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check query failed: {e}")
        return {"status": "error", "database": "disconnected"}

@app.get("/health/detailed")
async def detailed_health(db: AsyncSession = Depends(get_db)):
    components = {}
    
    # 1. Database Check
    try:
        await db.execute(text("SELECT 1"))
        components["database"] = {"status": "healthy"}
    except Exception as e:
        components["database"] = {"status": "unhealthy", "error": str(e)}

    # 2. Redis Check
    try:
        from app.db.redis import redis_client
        pong = await redis_client.ping()
        components["redis"] = {"status": "healthy" if pong else "unhealthy"}
    except Exception as e:
        components["redis"] = {"status": "unhealthy", "error": str(e)}

    overall = "ok" if all(v.get("status") == "healthy" for v in components.values()) else "degraded"
    return {
        "status": overall,
        "service": settings.PROJECT_NAME,
        "components": components
    }

