import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis

from app.websocket.connection_manager import manager
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/executions/{execution_id}")
async def execution_websocket(websocket: WebSocket, execution_id: str):
    """
    WebSocket endpoint streaming real-time execution step events to connected canvas clients.
    Subscribes to Redis Pub/Sub channel 'execution:{execution_id}' and relays JSON frames.
    """
    await manager.connect(websocket, execution_id)
    
    # Create an async redis pubsub connection for this subscription
    pubsub_redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = pubsub_redis.pubsub()
    channel_name = f"execution:{execution_id}"

    try:
        await pubsub.subscribe(channel_name)
        logger.info(f"Subscribed to Redis Pub/Sub channel: {channel_name}")

        async def redis_listener():
            try:
                async for message in pubsub.listen():
                    if message and message.get("type") == "message":
                        data_str = message.get("data")
                        try:
                            data_json = json.loads(data_str)
                            await manager.broadcast_to_execution(execution_id, data_json)
                        except Exception as e:
                            logger.error(f"Error relaying websocket frame: {e}")
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.error(f"Redis pubsub listener exception: {e}")

        listener_task = asyncio.create_task(redis_listener())

        # Keep WebSocket connection alive, handling client disconnect or pings
        try:
            while True:
                # Wait for any client messages or pings
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text(json.dumps({"event": "pong"}))
        except WebSocketDisconnect:
            logger.info(f"Client disconnected from execution websocket {execution_id}")
        finally:
            listener_task.cancel()
            try:
                await listener_task
            except asyncio.CancelledError:
                pass
            await pubsub.unsubscribe(channel_name)
            await pubsub.close()
            await pubsub_redis.aclose()

    except Exception as e:
        logger.error(f"WebSocket connection error for execution {execution_id}: {e}")
    finally:
        manager.disconnect(websocket, execution_id)
