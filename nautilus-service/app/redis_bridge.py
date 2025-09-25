"""
Redis Pub/Sub Bridge for Real-time Event Distribution
Nautilus Events → Redis → Frontend/Backend
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional, Set
from decimal import Decimal

import redis.asyncio as redis
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class EventMessage(BaseModel):
    """Standard event message format"""
    event_type: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    source: str = "nautilus"
    data: Dict[str, Any]
    metadata: Dict[str, Any] = {}


class RedisEventBridge:
    """
    Redis Pub/Sub bridge for distributing Nautilus events
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        channel_prefix: str = "nautilus"
    ):
        self.redis_url = redis_url
        self.channel_prefix = channel_prefix
        self.redis_client: Optional[redis.Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None
        self.subscribed_channels: Set[str] = set()

    async def connect(self) -> None:
        """Connect to Redis"""
        try:
            self.redis_client = await redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            self.pubsub = self.redis_client.pubsub()

            # Test connection
            await self.redis_client.ping()
            logger.info(f"Connected to Redis at {self.redis_url}")

        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    async def disconnect(self) -> None:
        """Disconnect from Redis"""
        if self.pubsub:
            await self.pubsub.unsubscribe()
            await self.pubsub.close()

        if self.redis_client:
            await self.redis_client.close()

        logger.info("Disconnected from Redis")

    def _get_channel_name(self, channel: str) -> str:
        """Get full channel name with prefix"""
        return f"{self.channel_prefix}:{channel}"

    async def publish_event(
        self,
        channel: str,
        event_type: str,
        data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Publish event to Redis channel

        Args:
            channel: Channel name (e.g., "trades", "positions", "orders")
            event_type: Event type (e.g., "trade_executed", "position_opened")
            data: Event data
            metadata: Optional metadata
        """
        if not self.redis_client:
            logger.error("Redis client not connected")
            return

        try:
            # Create event message
            event = EventMessage(
                event_type=event_type,
                data=self._serialize_data(data),
                metadata=metadata or {}
            )

            # Publish to channel
            channel_name = self._get_channel_name(channel)
            await self.redis_client.publish(
                channel_name,
                event.json()
            )

            # Also publish to global channel for monitoring
            await self.redis_client.publish(
                self._get_channel_name("all"),
                event.json()
            )

            logger.debug(f"Published {event_type} to {channel_name}")

        except Exception as e:
            logger.error(f"Failed to publish event: {e}")

    def _serialize_data(self, data: Any) -> Dict:
        """Serialize data for JSON encoding"""
        if isinstance(data, dict):
            return {k: self._serialize_value(v) for k, v in data.items()}
        elif hasattr(data, "__dict__"):
            return self._serialize_data(data.__dict__)
        else:
            return {"value": self._serialize_value(data)}

    def _serialize_value(self, value: Any) -> Any:
        """Serialize individual values"""
        if isinstance(value, Decimal):
            return str(value)
        elif isinstance(value, datetime):
            return value.isoformat()
        elif hasattr(value, "__dict__"):
            return self._serialize_data(value.__dict__)
        else:
            return value

    # Nautilus-specific event publishers

    async def publish_trade(self, trade_data: Dict[str, Any]) -> None:
        """Publish trade execution event"""
        await self.publish_event(
            channel="trades",
            event_type="trade_executed",
            data=trade_data,
            metadata={"strategy_id": trade_data.get("strategy_id")}
        )

    async def publish_position_update(self, position_data: Dict[str, Any]) -> None:
        """Publish position update event"""
        await self.publish_event(
            channel="positions",
            event_type="position_updated",
            data=position_data,
            metadata={"strategy_id": position_data.get("strategy_id")}
        )

    async def publish_order_update(self, order_data: Dict[str, Any]) -> None:
        """Publish order update event"""
        event_type = f"order_{order_data.get('status', 'unknown').lower()}"
        await self.publish_event(
            channel="orders",
            event_type=event_type,
            data=order_data,
            metadata={"strategy_id": order_data.get("strategy_id")}
        )

    async def publish_strategy_status(self, strategy_data: Dict[str, Any]) -> None:
        """Publish strategy status update"""
        await self.publish_event(
            channel="strategies",
            event_type="strategy_status",
            data=strategy_data,
            metadata={"active": strategy_data.get("is_running", False)}
        )

    async def publish_market_data(self, market_data: Dict[str, Any]) -> None:
        """Publish market data update"""
        await self.publish_event(
            channel="market",
            event_type="ticker_update",
            data=market_data,
            metadata={"symbol": market_data.get("symbol")}
        )

    async def publish_performance_metrics(self, metrics: Dict[str, Any]) -> None:
        """Publish performance metrics"""
        await self.publish_event(
            channel="performance",
            event_type="metrics_update",
            data=metrics,
            metadata={"strategy_id": metrics.get("strategy_id")}
        )

    async def publish_risk_alert(self, alert_data: Dict[str, Any]) -> None:
        """Publish risk management alert"""
        await self.publish_event(
            channel="risk",
            event_type="risk_alert",
            data=alert_data,
            metadata={
                "severity": alert_data.get("severity", "medium"),
                "strategy_id": alert_data.get("strategy_id")
            }
        )

    # Subscription methods for bidirectional communication

    async def subscribe(self, channels: list[str]) -> None:
        """Subscribe to Redis channels"""
        if not self.pubsub:
            logger.error("PubSub not initialized")
            return

        for channel in channels:
            channel_name = self._get_channel_name(channel)
            await self.pubsub.subscribe(channel_name)
            self.subscribed_channels.add(channel_name)

        logger.info(f"Subscribed to channels: {channels}")

    async def listen(self) -> None:
        """Listen for messages from subscribed channels"""
        if not self.pubsub:
            logger.error("PubSub not initialized")
            return

        async for message in self.pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    await self.handle_message(message["channel"], data)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to decode message: {e}")
                except Exception as e:
                    logger.error(f"Error handling message: {e}")

    async def handle_message(self, channel: str, data: dict) -> None:
        """Handle incoming messages (override in subclass)"""
        logger.debug(f"Received message on {channel}: {data}")


class NautilusEventHandler:
    """
    Handler for Nautilus Trader events
    Integrates with Redis bridge for real-time distribution
    """

    def __init__(self, redis_bridge: RedisEventBridge):
        self.redis_bridge = redis_bridge

    async def on_order_filled(self, order_event: dict) -> None:
        """Handle order filled event from Nautilus"""
        await self.redis_bridge.publish_order_update({
            "order_id": order_event.get("client_order_id"),
            "status": "FILLED",
            "filled_qty": order_event.get("filled_qty"),
            "avg_price": order_event.get("avg_px"),
            "symbol": order_event.get("instrument_id"),
            "side": order_event.get("order_side"),
            "timestamp": order_event.get("ts_event")
        })

    async def on_position_changed(self, position_event: dict) -> None:
        """Handle position change event from Nautilus"""
        await self.redis_bridge.publish_position_update({
            "position_id": position_event.get("position_id"),
            "symbol": position_event.get("instrument_id"),
            "side": position_event.get("side"),
            "quantity": position_event.get("quantity"),
            "entry_price": position_event.get("avg_px_open"),
            "current_price": position_event.get("last_px"),
            "unrealized_pnl": position_event.get("unrealized_pnl"),
            "realized_pnl": position_event.get("realized_pnl")
        })

    async def on_strategy_started(self, strategy_id: str) -> None:
        """Handle strategy started event"""
        await self.redis_bridge.publish_strategy_status({
            "strategy_id": strategy_id,
            "is_running": True,
            "status": "RUNNING",
            "message": "Strategy started successfully"
        })

    async def on_strategy_stopped(self, strategy_id: str, reason: str = "") -> None:
        """Handle strategy stopped event"""
        await self.redis_bridge.publish_strategy_status({
            "strategy_id": strategy_id,
            "is_running": False,
            "status": "STOPPED",
            "message": f"Strategy stopped: {reason}" if reason else "Strategy stopped"
        })

    async def on_risk_limit_exceeded(self, strategy_id: str, limit_type: str,
                                     current_value: float, limit_value: float) -> None:
        """Handle risk limit exceeded event"""
        await self.redis_bridge.publish_risk_alert({
            "strategy_id": strategy_id,
            "alert_type": "LIMIT_EXCEEDED",
            "limit_type": limit_type,
            "current_value": current_value,
            "limit_value": limit_value,
            "severity": "high"
        })

    async def on_performance_update(self, strategy_id: str, metrics: dict) -> None:
        """Handle performance metrics update"""
        await self.redis_bridge.publish_performance_metrics({
            "strategy_id": strategy_id,
            "total_pnl": metrics.get("total_pnl"),
            "win_rate": metrics.get("win_rate"),
            "total_trades": metrics.get("total_trades"),
            "sharpe_ratio": metrics.get("sharpe_ratio"),
            "max_drawdown": metrics.get("max_drawdown"),
            "avg_win": metrics.get("avg_win"),
            "avg_loss": metrics.get("avg_loss")
        })


# Singleton instance
_redis_bridge: Optional[RedisEventBridge] = None


async def get_redis_bridge() -> RedisEventBridge:
    """Get or create Redis bridge instance"""
    global _redis_bridge
    if _redis_bridge is None:
        _redis_bridge = RedisEventBridge()
        await _redis_bridge.connect()
    return _redis_bridge