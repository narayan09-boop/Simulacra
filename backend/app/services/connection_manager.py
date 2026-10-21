import json
import logging
import asyncio
from typing import Set, Dict, Any, Optional
from fastapi import WebSocket

logger = logging.getLogger("simulacra.ws")

class ConnectionManager:
    """
    Manages active WebSocket connections, subscription routing by experiment_id,
    and thread-safe async broadcasting of simulation snapshots and metrics.
    """
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.subscriptions: Dict[str, Set[WebSocket]] = {}
        self.loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        for exp_id in list(self.subscriptions.keys()):
            self.subscriptions[exp_id].discard(websocket)
            if not self.subscriptions[exp_id]:
                del self.subscriptions[exp_id]
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    def subscribe(self, websocket: WebSocket, experiment_id: str):
        if experiment_id not in self.subscriptions:
            self.subscriptions[experiment_id] = set()
        self.subscriptions[experiment_id].add(websocket)

    async def broadcast_event(self, event_type: str, payload: Dict[str, Any], experiment_id: Optional[str] = None):
        """Asynchronously sends event to all relevant subscribed clients or all clients."""
        message = json.dumps({
            "type": event_type,
            "experiment_id": experiment_id,
            "timestamp": asyncio.get_event_loop().time(),
            "payload": payload
        })
        
        targets = self.active_connections
        if experiment_id and experiment_id in self.subscriptions:
            # Send to experiment-specific subscribers + general listeners
            targets = self.subscriptions[experiment_id] | {ws for ws in self.active_connections if not any(ws in s for s in self.subscriptions.values())}

        dead_sockets = []
        for connection in list(targets):
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Error sending message to websocket: {e}")
                dead_sockets.append(connection)

        for ws in dead_sockets:
            self.disconnect(ws)

    def threadsafe_broadcast(self, event_type: str, payload: Dict[str, Any], experiment_id: Optional[str] = None):
        """Allows background worker threads to broadcast into the FastAPI asyncio loop."""
        if self.loop and not self.loop.is_closed():
            asyncio.run_coroutine_threadsafe(
                self.broadcast_event(event_type, payload, experiment_id),
                self.loop
            )

ws_manager = ConnectionManager()
