"""
Event Bridge V2 - Nautilus Best Practice Implementation
Proper Actor lifecycle management and WebSocket integration
"""

import asyncio
import json
import logging
from typing import Optional, Dict, Any, Set
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
from nautilus_trader.model.identifiers import ComponentId, TraderId

logger = logging.getLogger(__name__)


class NautilusEventBridgeActor(Actor):
    """
    Nautilus Event Bridge Actor - Best Practice Implementation
    Follows Nautilus Actor lifecycle patterns
    """

    def __init__(self, trader_id: str = "TRADER-001"):
        """
        Initialize with proper Actor pattern
        """
        # Initialize parent Actor without arguments
        super().__init__()

        self.ws_manager = None
        self._subscribed = False
        self._running = False

    def set_websocket_manager(self, ws_manager):
        """
        Set WebSocket manager reference
        """
        self.ws_manager = ws_manager
        self.log.info(f"WebSocket manager set for {self.id}")

    def on_start(self):
        """
        Actor lifecycle: on_start - Best Practice
        """
        self.log.info(f"EventBridge {self.id} starting")
        self._running = True
        self._subscribe_to_events()

    def on_stop(self):
        """
        Actor lifecycle: on_stop - Best Practice
        """
        self.log.info(f"EventBridge {self.id} stopping")
        self._running = False
        self._unsubscribe_from_events()

    def on_reset(self):
        """
        Actor lifecycle: on_reset - Best Practice
        """
        self.log.info(f"EventBridge {self.id} resetting")
        self._running = False
        self._subscribed = False

    def on_dispose(self):
        """
        Actor lifecycle: on_dispose - Best Practice
        """
        self.log.info(f"EventBridge {self.id} disposing")
        self.on_reset()
        self.ws_manager = None

    def _subscribe_to_events(self):
        """
        Subscribe to Nautilus events following best practices
        """
        if self._subscribed:
            return

        try:
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

            # Market data
            self.subscribe_data(QuoteTick, self._on_quote_tick)
            self.subscribe_data(TradeTick, self._on_trade_tick)
            self.subscribe_data(Bar, self._on_bar)

            self._subscribed = True
            self.log.info("Successfully subscribed to all events")

        except Exception as e:
            self.log.error(f"Error subscribing to events: {e}")

    def _unsubscribe_from_events(self):
        """
        Unsubscribe from events - Best Practice
        """
        if not self._subscribed:
            return

        try:
            # Order events
            self.unsubscribe_event(OrderInitialized, self._on_order_event)
            self.unsubscribe_event(OrderSubmitted, self._on_order_event)
            self.unsubscribe_event(OrderAccepted, self._on_order_event)
            self.unsubscribe_event(OrderRejected, self._on_order_event)
            self.unsubscribe_event(OrderCanceled, self._on_order_event)
            self.unsubscribe_event(OrderFilled, self._on_order_event)
            self.unsubscribe_event(OrderUpdated, self._on_order_event)

            # Position events
            self.unsubscribe_event(PositionOpened, self._on_position_event)
            self.unsubscribe_event(PositionChanged, self._on_position_event)
            self.unsubscribe_event(PositionClosed, self._on_position_event)

            # Market data
            self.unsubscribe_data(QuoteTick, self._on_quote_tick)
            self.unsubscribe_data(TradeTick, self._on_trade_tick)
            self.unsubscribe_data(Bar, self._on_bar)

            self._subscribed = False
            self.log.info("Successfully unsubscribed from all events")

        except Exception as e:
            self.log.error(f"Error unsubscribing from events: {e}")

    def _on_order_event(self, event: Event):
        """
        Handle order events - Best Practice
        """
        if not self._running:
            return

        try:
            event_data = {
                "type": "order_update",
                "event_type": event.__class__.__name__,
                "timestamp": datetime.utcnow().isoformat(),
                "data": self._serialize_order_event(event)
            }

            # Send to WebSocket if available
            if self.ws_manager:
                asyncio.create_task(self._broadcast("orders", event_data))

        except Exception as e:
            self.log.error(f"Error handling order event: {e}")

    def _on_position_event(self, event: Event):
        """
        Handle position events - Best Practice
        """
        if not self._running:
            return

        try:
            event_data = {
                "type": "position_update",
                "event_type": event.__class__.__name__,
                "timestamp": datetime.utcnow().isoformat(),
                "data": self._serialize_position_event(event)
            }

            # Send to WebSocket if available
            if self.ws_manager:
                asyncio.create_task(self._broadcast("positions", event_data))

        except Exception as e:
            self.log.error(f"Error handling position event: {e}")

    def _on_quote_tick(self, tick: QuoteTick):
        """
        Handle quote tick - Best Practice
        """
        if not self._running:
            return

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

            if self.ws_manager:
                asyncio.create_task(self._broadcast("market_data", tick_data))

        except Exception as e:
            self.log.error(f"Error handling quote tick: {e}")

    def _on_trade_tick(self, tick: TradeTick):
        """
        Handle trade tick - Best Practice
        """
        if not self._running:
            return

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

            if self.ws_manager:
                asyncio.create_task(self._broadcast("market_data", tick_data))

        except Exception as e:
            self.log.error(f"Error handling trade tick: {e}")

    def _on_bar(self, bar: Bar):
        """
        Handle bar - Best Practice
        """
        if not self._running:
            return

        try:
            bar_data = {
                "type": "bar",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "instrument_id": str(bar.instrument_id),
                    "bar_type": str(bar.bar_type),
                    "open": float(bar.open.as_double()),
                    "high": float(bar.high.as_double()),
                    "low": float(bar.low.as_double()),
                    "close": float(bar.close.as_double()),
                    "volume": float(bar.volume.as_double()),
                    "ts_event": bar.ts_event,
                }
            }

            if self.ws_manager:
                asyncio.create_task(self._broadcast("market_data", bar_data))

        except Exception as e:
            self.log.error(f"Error handling bar: {e}")

    def _serialize_order_event(self, event: Event) -> Dict[str, Any]:
        """
        Serialize order event - Best Practice
        """
        data = {}

        # Basic fields
        if hasattr(event, "client_order_id"):
            data["order_id"] = str(event.client_order_id)
        if hasattr(event, "instrument_id"):
            data["instrument_id"] = str(event.instrument_id)
        if hasattr(event, "strategy_id"):
            data["strategy_id"] = str(event.strategy_id)

        # OrderFilled specific fields
        if isinstance(event, OrderFilled):
            data.update({
                "side": str(event.order_side),
                "filled_qty": float(event.last_qty.as_double()),
                "fill_price": float(event.last_px.as_double()),
                "commission": float(event.commission.as_double()) if event.commission else 0.0,
            })

        # Other order events with order object
        elif hasattr(event, "order"):
            order = event.order
            data.update({
                "side": str(order.side),
                "order_type": str(order.order_type),
                "quantity": float(order.quantity.as_double()),
                "status": str(order.status),
            })

            if hasattr(order, "price") and order.price:
                data["price"] = float(order.price.as_double())

        return data

    def _serialize_position_event(self, event: Event) -> Dict[str, Any]:
        """
        Serialize position event - Best Practice
        """
        if not hasattr(event, "position"):
            return {}

        position = event.position

        return {
            "position_id": str(position.id),
            "instrument_id": str(position.instrument_id),
            "strategy_id": str(position.strategy_id) if position.strategy_id else None,
            "side": str(position.side),
            "quantity": float(position.quantity.as_double()),
            "entry": float(position.avg_px_open.as_double()) if position.avg_px_open else None,
            "unrealized_pnl": float(position.unrealized_pnl.as_double()) if position.unrealized_pnl else 0.0,
            "realized_pnl": float(position.realized_pnl.as_double()) if position.realized_pnl else 0.0,
        }

    async def _broadcast(self, channel: str, data: Dict[str, Any]):
        """
        Broadcast to WebSocket - Best Practice
        """
        if not self.ws_manager:
            return

        try:
            await self.ws_manager.broadcast(data, channel)
        except Exception as e:
            self.log.error(f"Failed to broadcast to WebSocket: {e}")


class EventBridgeManagerV2:
    """
    Event Bridge Manager - Best Practice Implementation
    Manages EventBridge actor lifecycle properly
    """

    def __init__(self, nautilus_engine, ws_manager):
        """
        Initialize manager with references
        """
        self.nautilus_engine = nautilus_engine
        self.ws_manager = ws_manager
        self.event_bridge_actor: Optional[NautilusEventBridgeActor] = None
        self._trader_id = "TRADER-001"

    async def start(self):
        """
        Start event bridge following best practices
        """
        if not self.nautilus_engine.node:
            logger.warning("Nautilus engine not initialized")
            return False

        try:
            # Create event bridge actor
            self.event_bridge_actor = NautilusEventBridgeActor(self._trader_id)

            # Set WebSocket manager
            self.event_bridge_actor.set_websocket_manager(self.ws_manager)

            # Add actor to trader
            self.nautilus_engine.node.trader.add_actor(self.event_bridge_actor)

            logger.info(f"EventBridge actor {self.event_bridge_actor.id} added to trader")
            return True

        except Exception as e:
            logger.error(f"Failed to start EventBridge: {e}")
            return False

    async def stop(self):
        """
        Stop event bridge following best practices
        """
        if not self.event_bridge_actor:
            return

        try:
            if self.nautilus_engine.node:
                # Remove actor using its ComponentId
                component_id = self.event_bridge_actor.id

                # Stop the actor first
                self.nautilus_engine.node.trader.stop_actor(self.event_bridge_actor)

                # Then remove it
                self.nautilus_engine.node.trader.remove_actor(component_id)

                logger.info(f"EventBridge actor {component_id} removed from trader")

            self.event_bridge_actor = None

        except Exception as e:
            logger.error(f"Failed to stop EventBridge: {e}")

    def is_running(self) -> bool:
        """
        Check if event bridge is running
        """
        return self.event_bridge_actor is not None and self.event_bridge_actor._running