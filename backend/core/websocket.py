"""
WebSocket Connection Manager and broadcast utilities
"""
from fastapi import WebSocket
from typing import List
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to connection: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn)


# Global manager instance
manager = ConnectionManager()


async def broadcast_update(entity_type: str, action: str, data: dict = None):
    """Broadcast real-time updates to all connected WebSocket clients"""
    message = {
        "type": "update",
        "entity": entity_type,
        "action": action,
        "data": data or {}
    }
    await manager.broadcast(message)
