from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# Create async engine with pool pre-ping to verify connections are alive
engine = create_async_engine(
    settings.DATABASE_URL,
    future=True,
    pool_pre_ping=True
)

# Async session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

# Dependency to get db session in FastAPI routes
async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
