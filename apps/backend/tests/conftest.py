import asyncio
import sys
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.db.session import get_db
from app.main import app
from app.core.config import settings

# Force SelectorEventLoop on Windows during tests
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

@pytest.fixture(scope="function")
async def db_session():
    """
    Fixture that creates a fresh database engine and session scoped to the 
    current event loop. Overrides the FastAPI get_db dependency.
    """
    engine = create_async_engine(
        settings.DATABASE_URL, 
        future=True,
        pool_pre_ping=True
    )
    TestingSessionLocal = async_sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False
    )
    
    async with TestingSessionLocal() as session:
        # Override the FastAPI db dependency to use the session from this fixture
        async def override_get_db():
            yield session
            
        app.dependency_overrides[get_db] = override_get_db
        
        yield session
        
        app.dependency_overrides.clear()
    
    await engine.dispose()

@pytest.fixture(scope="function", autouse=True)
async def cleanup_redis():
    """
    Disconnects the Redis client at the end of each test to prevent 
    'Event loop is closed' errors on subsequent tests.
    """
    yield
    from app.db.redis import redis_client
    try:
        await redis_client.aclose()
    except Exception:
        pass
