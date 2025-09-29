"""WebSocket manager with channel-based subscriptions."""

from collections import defaultdict
from datetime import datetime
import json
import logging
from typing import Any, Dict, Iterable, List, Optional, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages websocket connections and channel subscriptions."""

    def __init__(self) -> None:
        self._connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        self._websocket_channels: Dict[WebSocket, Set[str]] = {}
        self._active_connections = 0

    # ------------------------------------------------------------------
    async def connect(self, websocket: WebSocket, channel: str = "system") -> None:
        await websocket.accept()
        self._register_connection(websocket, channel)
        logger.info("WebSocket connected on channel=%s", channel)
        await self._send_personal(
            websocket,
            {
                "type": "connected",
                "channel": channel,
                "timestamp": datetime.now().isoformat(),
                "message": f"Connected to {channel} channel",
            },
        )

    async def disconnect(self, websocket: WebSocket, channel: Optional[str] = None) -> None:
        try:
            if channel:
                if channel in self._connections:
                    self._connections[channel].discard(websocket)
                if websocket in self._websocket_channels:
                    self._websocket_channels[websocket].discard(channel)
            else:
                for ch in self._websocket_channels.get(websocket, set()).copy():
                    self._connections[ch].discard(websocket)
                if websocket in self._websocket_channels:
                    del self._websocket_channels[websocket]
                self._active_connections = max(0, self._active_connections - 1)
            logger.info("WebSocket disconnected (%s)", channel or "all")
        except Exception as exc:
            logger.error("Error disconnecting websocket: %s", exc)

    async def disconnect_all(self) -> None:
        for websocket in list(self._websocket_channels.keys()):
            try:
                await websocket.close()
            except Exception as exc:
                logger.error("Error closing websocket: %s", exc)
        self._connections.clear()
        self._websocket_channels.clear()
        self._active_connections = 0
        logger.info("All websocket connections cleared")

    # ------------------------------------------------------------------
    async def subscribe(self, websocket: WebSocket, channels: Iterable[str]) -> None:
        for channel in channels:
            if not channel:
                continue
            self._connections[channel].add(websocket)
            self._websocket_channels.setdefault(websocket, set()).add(channel)
            await self._send_personal(
                websocket,
                {
                    "type": "subscribed",
                    "channel": channel,
                    "timestamp": datetime.now().isoformat(),
                },
            )

    async def unsubscribe(self, websocket: WebSocket, channels: Iterable[str]) -> None:
        for channel in channels:
            if channel in self._connections:
                self._connections[channel].discard(websocket)
            if websocket in self._websocket_channels:
                self._websocket_channels[websocket].discard(channel)
            await self._send_personal(
                websocket,
                {
                    "type": "unsubscribed",
                    "channel": channel,
                    "timestamp": datetime.now().isoformat(),
                },
            )

    # ------------------------------------------------------------------
    async def broadcast(self, message: Dict[str, Any], channel: str) -> None:
        if channel not in self._connections:
            return
        payload = dict(message)
        payload.setdefault("channel", channel)
        payload.setdefault("timestamp", datetime.now().isoformat())

        disconnected: List[WebSocket] = []
        for websocket in list(self._connections[channel]):
            try:
                await websocket.send_json(payload)
            except Exception as exc:
                logger.error("Error sending websocket message: %s", exc)
                disconnected.append(websocket)
        for websocket in disconnected:
            await self.disconnect(websocket)

    async def broadcast_to_all(self, message: Dict[str, Any]) -> None:
        for channel in list(self._connections.keys()):
            await self.broadcast(message, channel)

    async def send_to_websocket(self, websocket: WebSocket, message: Dict[str, Any]) -> None:
        try:
            await self._send_personal(websocket, message)
        except Exception as exc:
            logger.error("Error sending personal message: %s", exc)
            await self.disconnect(websocket)

    # ------------------------------------------------------------------
    def get_stats(self) -> Dict[str, Any]:
        channel_stats = {channel: len(conns) for channel, conns in self._connections.items()}
        return {
            "active_connections": self._active_connections,
            "channels": channel_stats,
            "total_subscriptions": sum(channel_stats.values()),
        }

    def get_channels_for_websocket(self, websocket: WebSocket) -> Set[str]:
        return self._websocket_channels.get(websocket, set())

    async def handle_client_message(self, websocket: WebSocket, message: str) -> None:
        try:
            data = json.loads(message)
            msg_type = data.get("type")

            if msg_type == "subscribe":
                channels = self._extract_channels(data)
                await self.subscribe(websocket, channels)
            elif msg_type == "unsubscribe":
                channels = self._extract_channels(data)
                await self.unsubscribe(websocket, channels)
            elif msg_type == "ping":
                await self._send_personal(websocket, {"type": "pong"})
            else:
                logger.debug("Received unsupported message: %s", data)
        except json.JSONDecodeError as exc:
            logger.error("Invalid JSON message: %s", exc)
            await self._send_personal(
                websocket,
                {"type": "error", "error": "Invalid JSON format"},
            )
        except Exception as exc:
            logger.error("Error handling websocket message: %s", exc)

    # ------------------------------------------------------------------
    def _register_connection(self, websocket: WebSocket, channel: str) -> None:
        self._connections[channel].add(websocket)
        channels = self._websocket_channels.setdefault(websocket, set())
        if not channels:
            self._active_connections += 1
        channels.add(channel)

    async def _send_personal(self, websocket: WebSocket, message: Dict[str, Any]) -> None:
        payload = dict(message)
        payload.setdefault("timestamp", datetime.now().isoformat())
        await websocket.send_json(payload)

    def _extract_channels(self, data: Dict[str, Any]) -> List[str]:
        channels: List[str] = []
        if "channel" in data and data["channel"]:
            channels.append(str(data["channel"]))
        requested = data.get("channels") or []
        if isinstance(requested, str):
            channels.append(requested)
        elif isinstance(requested, Iterable):
            channels.extend(str(ch) for ch in requested if ch)
        return channels


ws_manager = WebSocketManager()

