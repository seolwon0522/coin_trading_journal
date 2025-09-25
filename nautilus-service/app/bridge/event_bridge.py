"""
Event Bridge - Nautilus MessageBus to WebSocket Bridge
Connects Nautilus Trading events to WebSocket broadcasting
"""

import asyncio
import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from nautilus_trader.core.message import Event
from nautilus_trader.common.actor import Actor
from nautilus_trader.model.events import (
    OrderInitialized,
    OrderSubmitted,
    OrderAccepted,
    OrderRejected,
    OrderCanceled,
    OrderFilled,
    OrderUpdated,
    PositionOpened,
    PositionChanged,
    PositionClosed,
)
from nautilus_trader.model.data import QuoteTick, TradeTick, Bar
from nautilus_trader.model.identifiers import StrategyId
from nautilus_trader.accounting.accounts.base import Account

logger = logging.getLogger(__name__)


class NautilusEventBridge(Actor):
    """
    Bridge between Nautilus MessageBus and WebSocket Manager
    Subscribes to Nautilus events and broadcasts them via WebSocket
    """

    def __init__(self, ws_manager=None):
        super().__init__()
        self.ws_manager = ws_manager
        self._subscribed = False

    def on_start(self):
        """Initialize event subscriptions when actor starts"""
        self._subscribe_to_events()
        self.log.info("EventBridge started and subscribed to events")

    def on_stop(self):
        """Cleanup when actor stops"""
        self.log.info("EventBridge stopped")

    def _subscribe_to_events(self):
        """Subscribe to all relevant Nautilus events"""
        if self._subscribed:
            return

        # Order events
        self.subscribe_event(OrderInitialized, self._on_order_event)
        self.subscribe_event(OrderSubmitted, self._on_order_event)
        self.subscribe_event(OrderAccepted, self._on_order_event)
        self.subscribe_event(OrderRejected, self._on_order_event)
        self.subscribe_event(OrderCanceled, self._on_order_event)
        self.subscribe_event(OrderFilled, self._on_order_event)
        self.subscribe_event(OrderUpdated, self._on_order_event)

        # Position events
        self.subscribe_event(PositionOpened, self._on_position_event)
        self.subscribe_event(PositionChanged, self._on_position_event)
        self.subscribe_event(PositionClosed, self._on_position_event)

        # Market data events
        self.subscribe_data(QuoteTick, self._on_quote_tick)
        self.subscribe_data(TradeTick, self._on_trade_tick)
        self.subscribe_data(Bar, self._on_bar)

        self._subscribed = True

    def _on_order_event(self, event: Event):
        """Handle order events"""
        try:
            event_data = {
                "type": "order_update",
                "event_type": event.__class__.__name__,
                "timestamp": datetime.utcnow().isoformat(),
                "data": self._serialize_order_event(event)
            }

            # Broadcast to orders channel
            asyncio.create_task(self._broadcast("orders", event_data))

        except Exception as e:
            self.log.error(f"Error handling order event: {e}")

    def _on_position_event(self, event: Event):
        """Handle position events"""
        try:
            event_data = {
                "type": "position_update",
                "event_type": event.__class__.__name__,
                "timestamp": datetime.utcnow().isoformat(),
                "data": self._serialize_position_event(event)
            }

            # Broadcast to positions channel
            asyncio.create_task(self._broadcast("positions", event_data))

        except Exception as e:
            self.log.error(f"Error handling position event: {e}")

    def _on_quote_tick(self, tick: QuoteTick):
        """Handle quote tick updates"""
        try:
            tick_data = {
                "type": "quote_tick",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "instrument_id": str(tick.instrument_id),
                    "bid": float(tick.bid_price.as_double()),
                    "ask": float(tick.ask_price.as_double()),
                    "bid_size": float(tick.bid_size.as_double()),
                    "ask_size": float(tick.ask_size.as_double()),
                    "ts_event": tick.ts_event,
                }
            }

            # Broadcast to market_data channel
            asyncio.create_task(self._broadcast("market_data", tick_data))

        except Exception as e:
            self.log.error(f"Error handling quote tick: {e}")

    def _on_trade_tick(self, tick: TradeTick):
        """Handle trade tick updates"""
        try:
            tick_data = {
                "type": "trade_tick",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "instrument_id": str(tick.instrument_id),
                    "price": float(tick.price.as_double()),
                    "size": float(tick.size.as_double()),
                    "aggressor_side": str(tick.aggressor_side),
                    "ts_event": tick.ts_event,
                }
            }

            # Broadcast to market_data channel
            asyncio.create_task(self._broadcast("market_data", tick_data))

        except Exception as e:
            self.log.error(f"Error handling trade tick: {e}")

    def _on_bar(self, bar: Bar):
        """Handle bar updates"""
        try:
            bar_data = {
                "type": "bar",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "instrument_id": str(bar.instrument_id),
                    "open": float(bar.open.as_double()),
                    "high": float(bar.high.as_double()),
                    "low": float(bar.low.as_double()),
                    "close": float(bar.close.as_double()),
                    "volume": float(bar.volume.as_double()),
                    "ts_event": bar.ts_event,
                    "ts_close": bar.ts_close,
                }
            }

            # Broadcast to market_data channel
            asyncio.create_task(self._broadcast("market_data", bar_data))

        except Exception as e:
            self.log.error(f"Error handling bar: {e}")

    def _serialize_order_event(self, event: Event) -> Dict[str, Any]:
        """Serialize order event to dictionary"""
        data = {
            "order_id": str(event.client_order_id) if hasattr(event, "client_order_id") else None,
            "instrument_id": str(event.instrument_id) if hasattr(event, "instrument_id") else None,
            "strategy_id": str(event.strategy_id) if hasattr(event, "strategy_id") else None,
        }

        # Add specific fields based on event type
        if isinstance(event, OrderFilled):
            data.update({
                "side": str(event.order_side),
                "filled_qty": float(event.last_qty.as_double()),
                "fill_price": float(event.last_px.as_double()),
                "commission": float(event.commission.as_double()) if event.commission else 0.0,
            })
        elif hasattr(event, "order"):
            order = event.order
            data.update({
                "side": str(order.side),
                "order_type": str(order.order_type),
                "quantity": float(order.quantity.as_double()),
                "price": float(order.price.as_double()) if hasattr(order, "price") and order.price else None,
                "status": str(order.status),
            })

        return data

    def _serialize_position_event(self, event: Event) -> Dict[str, Any]:
        """Serialize position event to dictionary"""
        position = event.position if hasattr(event, "position") else None

        if not position:
            return {}

        return {
            "position_id": str(position.id),
            "instrument_id": str(position.instrument_id),
            "strategy_id": str(position.strategy_id),
            "side": str(position.side),
            "quantity": float(position.quantity.as_double()),
            "entry": float(position.avg_px_open.as_double()) if position.avg_px_open else None,
            "unrealized_pnl": float(position.unrealized_pnl.as_double()) if position.unrealized_pnl else 0.0,
            "realized_pnl": float(position.realized_pnl.as_double()) if position.realized_pnl else 0.0,
        }

    async def _broadcast(self, channel: str, data: Dict[str, Any]):
        """Broadcast event to WebSocket channel"""
        if self.ws_manager:
            try:
                await self.ws_manager.broadcast(data, channel)
            except Exception as e:
                self.log.error(f"Failed to broadcast to WebSocket: {e}")


class EventBridgeManager:
    """
    Manager for EventBridge lifecycle
    """

    def __init__(self, nautilus_engine, ws_manager):
        self.nautilus_engine = nautilus_engine
        self.ws_manager = ws_manager
        self.event_bridge: Optional[NautilusEventBridge] = None

    async def start(self):
        """Start the event bridge"""
        if not self.nautilus_engine.node:
            logger.warning("Nautilus engine not initialized, cannot start event bridge")
            return

        # Create and register the event bridge actor
        self.event_bridge = NautilusEventBridge(ws_manager=self.ws_manager)

        # Add to trading node
        self.nautilus_engine.node.trader.add_actor(self.event_bridge)

        logger.info("EventBridge started successfully")

    async def stop(self):
        """Stop the event bridge"""
        if self.event_bridge and self.nautilus_engine.node:
            # remove_actor expects the actor's ID (ComponentId), not the actor object itself
            self.nautilus_engine.node.trader.remove_actor(self.event_bridge.id)
            self.event_bridge = None
            logger.info("EventBridge stopped")

    def is_running(self) -> bool:
        """Check if event bridge is running"""
        return self.event_bridge is not None