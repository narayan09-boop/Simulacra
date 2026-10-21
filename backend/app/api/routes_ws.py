import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.connection_manager import ws_manager

logger = logging.getLogger("simulacra.ws_routes")
router = APIRouter(tags=["WebSocket"])

@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
                action = data.get("action")
                
                if action == "subscribe":
                    exp_id = data.get("experiment_id")
                    if exp_id:
                        ws_manager.subscribe(websocket, exp_id)
                        await websocket.send_text(json.dumps({
                            "type": "subscribed",
                            "experiment_id": exp_id
                        }))
                elif action == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket)
