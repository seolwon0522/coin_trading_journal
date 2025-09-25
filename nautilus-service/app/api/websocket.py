"""
WebSocket API for real-time updates
"""
from fastapi import WebSocket, WebSocketDisconnect, Depends
from typing import Dict, Set, Any
import json
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections and broadcasting
    """

    def __init__(self):
        # Store active connections by client ID
        self.active_connections: Dict[str, WebSocket] = {}

        # Store subscriptions by channel
        self.subscriptions: Dict[str, Set[str]] = {
            "ticker": set(),
            "orderbook": set(),
            "positions": set(),
            "orders": set(),
            "strategies": set(),
            "performance": set(),
            "alerts": set(),
        }

        # Store client metadata
        self.client_metadata: Dict[str, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        """
        Accept new WebSocket connection
        """
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.client_metadata[client_id] = {
            "connected_at": datetime.utcnow(),
            "subscriptions": set()
        }
        logger.info(f"Client {client_id} connected")

    async def disconnect(self, client_id: str):
        """
        Handle client disconnection
        """
        if client_id in self.active_connections:
            # Remove from all subscriptions
            for channel, subscribers in self.subscriptions.items():
                subscribers.discard(client_id)

            # Remove connection and metadata
            del self.active_connections[client_id]
            del self.client_metadata[client_id]
            logger.info(f"Client {client_id} disconnected")

    async def subscribe(self, client_id: str, channel: str, params: Dict[str, Any] = None):
        """
        Subscribe client to a channel
        """
        if channel not in self.subscriptions:
            logger.warning(f"Invalid channel: {channel}")
            return False

        self.subscriptions[channel].add(client_id)
        self.client_metadata[client_id]["subscriptions"].add(channel)

        # Send confirmation
        await self.send_personal_message(client_id, {
            "type": "subscription",
            "channel": channel,
            "status": "subscribed",
            "params": params
        })

        logger.info(f"Client {client_id} subscribed to {channel}")
        return True

    async def unsubscribe(self, client_id: str, channel: str):
        """
        Unsubscribe client from a channel
        """
        if channel in self.subscriptions:
            self.subscriptions[channel].discard(client_id)
            self.client_metadata[client_id]["subscriptions"].discard(channel)

            # Send confirmation
            await self.send_personal_message(client_id, {
                "type": "subscription",
                "channel": channel,
                "status": "unsubscribed"
            })

            logger.info(f"Client {client_id} unsubscribed from {channel}")

    async def send_personal_message(self, client_id: str, message: Dict[str, Any]):
        """
        Send message to specific client
        """
        if client_id in self.active_connections:
            try:
                websocket = self.active_connections[client_id]
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {client_id}: {e}")
                await self.disconnect(client_id)

    async def broadcast_to_channel(self, channel: str, message: Dict[str, Any]):
        """
        Broadcast message to all subscribers of a channel
        """
        if channel not in self.subscriptions:
            return

        message["channel"] = channel
        message["timestamp"] = datetime.utcnow().isoformat()

        disconnected_clients = []

        for client_id in self.subscriptions[channel]:
            if client_id in self.active_connections:
                try:
                    websocket = self.active_connections[client_id]
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to {client_id}: {e}")
                    disconnected_clients.append(client_id)

        # Clean up disconnected clients
        for client_id in disconnected_clients:
            await self.disconnect(client_id)

    async def broadcast_to_all(self, message: Dict[str, Any]):
        """
        Broadcast message to all connected clients
        """
        message["timestamp"] = datetime.utcnow().isoformat()
        disconnected_clients = []

        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {client_id}: {e}")
                disconnected_clients.append(client_id)

        # Clean up disconnected clients
        for client_id in disconnected_clients:
            await self.disconnect(client_id)


# Global connection manager instance
manager = ConnectionManager()


class WebSocketService:
    """
    Service for handling WebSocket business logic
    """

    def __init__(self, connection_manager: ConnectionManager):
        self.manager = connection_manager
        self.update_tasks = {}

    async def start_market_data_updates(self, symbol: str, interval: int = 1):
        """
        Start sending market data updates for a symbol
        """
        task_key = f"market_data_{symbol}"

        if task_key in self.update_tasks:
            return  # Already running

        async def update_loop():
            while True:
                try:
                    # Get market data (mock for now)
                    market_data = {
                        "type": "ticker",
                        "symbol": symbol,
                        "data": {
                            "bid": 50000.0,  # Would fetch real data
                            "ask": 50001.0,
                            "last": 50000.5,
                            "volume": 12345.67,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    }

                    await self.manager.broadcast_to_channel("ticker", market_data)
                    await asyncio.sleep(interval)

                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in market data update loop: {e}")
                    await asyncio.sleep(interval)

        self.update_tasks[task_key] = asyncio.create_task(update_loop())

    async def start_position_updates(self, strategy_id: str, interval: int = 5):
        """
        Start sending position updates for a strategy
        """
        task_key = f"positions_{strategy_id}"

        if task_key in self.update_tasks:
            return  # Already running

        async def update_loop():
            while True:
                try:
                    # Get positions (would fetch from strategy manager)
                    positions_data = {
                        "type": "positions",
                        "strategy_id": strategy_id,
                        "data": {
                            "positions": [],  # Would fetch real positions
                            "total_pnl": 0.0,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    }

                    await self.manager.broadcast_to_channel("positions", positions_data)
                    await asyncio.sleep(interval)

                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in position update loop: {e}")
                    await asyncio.sleep(interval)

        self.update_tasks[task_key] = asyncio.create_task(update_loop())

    async def stop_updates(self, task_key: str):
        """
        Stop a specific update task
        """
        if task_key in self.update_tasks:
            self.update_tasks[task_key].cancel()
            del self.update_tasks[task_key]

    async def stop_all_updates(self):
        """
        Stop all update tasks
        """
        for task in self.update_tasks.values():
            task.cancel()
        self.update_tasks.clear()

    async def send_alert(self, alert_type: str, message: str, severity: str = "info"):
        """
        Send an alert to all subscribed clients
        """
        alert_data = {
            "type": "alert",
            "alert_type": alert_type,
            "message": message,
            "severity": severity,
            "timestamp": datetime.utcnow().isoformat()
        }

        await self.manager.broadcast_to_channel("alerts", alert_data)

    async def send_strategy_update(self, strategy_id: str, status: str, data: Dict[str, Any] = None):
        """
        Send strategy status update
        """
        update_data = {
            "type": "strategy_update",
            "strategy_id": strategy_id,
            "status": status,
            "data": data or {},
            "timestamp": datetime.utcnow().isoformat()
        }

        await self.manager.broadcast_to_channel("strategies", update_data)


# Global WebSocket service instance
ws_service = WebSocketService(manager)


# WebSocket endpoint handler
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    Main WebSocket endpoint handler
    """
    await manager.connect(websocket, client_id)

    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                message_type = message.get("type")

                if message_type == "subscribe":
                    channel = message.get("channel")
                    params = message.get("params", {})
                    await manager.subscribe(client_id, channel, params)

                    # Start updates if needed
                    if channel == "ticker" and "symbol" in params:
                        await ws_service.start_market_data_updates(params["symbol"])
                    elif channel == "positions" and "strategy_id" in params:
                        await ws_service.start_position_updates(params["strategy_id"])

                elif message_type == "unsubscribe":
                    channel = message.get("channel")
                    await manager.unsubscribe(client_id, channel)

                elif message_type == "ping":
                    # Respond to ping with pong
                    await manager.send_personal_message(client_id, {"type": "pong"})

                else:
                    # Invalid message type
                    await manager.send_personal_message(client_id, {
                        "type": "error",
                        "message": f"Unknown message type: {message_type}"
                    })

            except json.JSONDecodeError:
                await manager.send_personal_message(client_id, {
                    "type": "error",
                    "message": "Invalid JSON format"
                })
            except Exception as e:
                logger.error(f"Error processing message from {client_id}: {e}")
                await manager.send_personal_message(client_id, {
                    "type": "error",
                    "message": str(e)
                })

    except WebSocketDisconnect:
        await manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
        await manager.disconnect(client_id)