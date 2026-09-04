import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps execution_id -> set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, execution_id: str):
        await websocket.accept()
        if execution_id not in self.active_connections:
            self.active_connections[execution_id] = set()
        self.active_connections[execution_id].add(websocket)
        logger.info(f"WebSocket client connected for execution {execution_id}")

    def disconnect(self, websocket: WebSocket, execution_id: str):
        if execution_id in self.active_connections:
            self.active_connections[execution_id].discard(websocket)
            if not self.active_connections[execution_id]:
                del self.active_connections[execution_id]
        logger.info(f"WebSocket client disconnected for execution {execution_id}")

    async def broadcast_to_execution(self, execution_id: str, message: dict):
        if execution_id in self.active_connections:
            disconnected_sockets = set()
            payload = json.dumps(message)
            for connection in self.active_connections[execution_id]:
                try:
                    await connection.send_text(payload)
                except Exception as e:
                    logger.warning(f"Failed to send message to websocket client: {e}")
                    disconnected_sockets.add(connection)
            
            # Clean up dead sockets
            for dead_socket in disconnected_sockets:
                self.disconnect(dead_socket, execution_id)

manager = ConnectionManager()
