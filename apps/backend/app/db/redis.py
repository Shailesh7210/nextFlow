import redis.asyncio as aioredis
from app.core.config import settings

# Async Redis client for caching and session management (e.g. token blacklisting)
redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
