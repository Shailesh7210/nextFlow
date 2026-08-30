from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
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
    # Startup logic: check if the database is reachable
    logger.info("Verifying database connection on startup...")
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified successfully.")
    except Exception as e:
        logger.error(f"Database connection failed on startup: {e}")
    
    yield
    
    # Shutdown logic: clean up connection pool
    logger.info("Disposing database connection pool...")
    await engine.dispose()
    logger.info("Shutdown completed.")

from app.api.v1 import auth, workflows, credentials

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan
)

# Register routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(workflows.router, prefix=f"{settings.API_V1_STR}/workflows", tags=["workflows"])
app.include_router(credentials.router, prefix=f"{settings.API_V1_STR}/credentials", tags=["credentials"])

@app.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    try:
        # Perform light verification query
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check query failed: {e}")
        return {"status": "error", "database": "disconnected"}

