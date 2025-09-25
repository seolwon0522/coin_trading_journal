"""
Orderbook Imbalance Strategy for Nautilus Trader
호가창 불균형 기반 마켓 메이킹 전략
"""

from decimal import Decimal
from typing import Optional, Dict, List

from nautilus_trader.common.enums import LogColor
from nautilus_trader.config import StrategyConfig
from nautilus_trader.core.data import Data
from nautilus_trader.core.message import Event
from nautilus_trader.model.data import Bar, BarType, QuoteTick, OrderBookDeltas
from nautilus_trader.model.enums import OrderSide, OrderType, TimeInForce
from nautilus_trader.model.identifiers import InstrumentId, ClientOrderId
from nautilus_trader.model.instruments import Instrument
from nautilus_trader.trading.strategy import Strategy


class OrderbookImbalanceConfig(StrategyConfig):
    """Configuration for Orderbook Imbalance Strategy."""

    instrument_id: str
    bar_type: str
    imbalance_threshold: float = 0.3  # 30% imbalance threshold
    order_levels: int = 5  # Number of order levels
    spread_multiplier: float = 1.5  # Spread multiplier for orders
    position_size: Decimal = Decimal("0.01")
    max_positions: int = 5
    min_spread_bps: int = 10  # Minimum spread in basis points


class OrderbookImbalanceStrategy(Strategy):
    """
    Orderbook Imbalance Strategy implementation.

    Market making strategy based on orderbook imbalance.
    Places limit orders on the side with less liquidity.
    """

    def __init__(self, config: OrderbookImbalanceConfig) -> None:
        super().__init__(config)

        # Configuration
        self.instrument_id = InstrumentId.from_str(config.instrument_id)
        self.bar_type = BarType.from_str(config.bar_type)
        self.imbalance_threshold = config.imbalance_threshold
        self.order_levels = config.order_levels
        self.spread_multiplier = config.spread_multiplier
        self.position_size = config.position_size
        self.max_positions = config.max_positions
        self.min_spread_bps = config.min_spread_bps

        # State
        self.instrument: Optional[Instrument] = None
        self.active_orders: Dict[ClientOrderId, Dict] = {}
        self.bid_volume: float = 0.0
        self.ask_volume: float = 0.0
        self.imbalance: float = 0.0
        self.mid_price: Optional[float] = None
        self.spread: Optional[float] = None

    def on_start(self) -> None:
        """Actions to be performed on strategy start."""
        self.instrument = self.cache.instrument(self.instrument_id)
        if self.instrument is None:
            self.log.error(f"Could not find instrument for {self.instrument_id}")
            self.stop()
            return

        # Subscribe to market data
        self.subscribe_bars(self.bar_type)
        self.subscribe_quote_ticks(self.instrument_id)
        # Note: In real implementation, would subscribe to order book data
        # self.subscribe_order_book_deltas(self.instrument_id)

        self.log.info(
            f"Orderbook Imbalance Strategy started: threshold={self.imbalance_threshold:.1%}, levels={self.order_levels}",
            color=LogColor.GREEN,
        )

    def on_stop(self) -> None:
        """Actions to be performed on strategy stop."""
        self.unsubscribe_bars(self.bar_type)
        self.unsubscribe_quote_ticks(self.instrument_id)

        # Cancel all active orders
        self._cancel_all_orders()

        # Close all positions
        self.close_all_positions(self.instrument_id)

        self.log.info("Orderbook Imbalance Strategy stopped", color=LogColor.RED)

    def on_reset(self) -> None:
        """Actions to be performed on strategy reset."""
        self.active_orders.clear()
        self.bid_volume = 0.0
        self.ask_volume = 0.0
        self.imbalance = 0.0
        self.mid_price = None
        self.spread = None

    def on_bar(self, bar: Bar) -> None:
        """Handle bar data."""
        # Update mid price estimate from bar
        self.mid_price = float((bar.high + bar.low) / 2)
        self.log.debug(f"Updated mid price: {self.mid_price:.2f}")

    def on_quote_tick(self, tick: QuoteTick) -> None:
        """Handle quote tick data."""
        # Update spread and mid price
        self.spread = float(tick.ask_price - tick.bid_price)
        self.mid_price = float((tick.bid_price + tick.ask_price) / 2)

        # Simple imbalance calculation based on sizes
        # In real implementation, would use full orderbook data
        self.bid_volume = float(tick.bid_size)
        self.ask_volume = float(tick.ask_size)

        # Calculate imbalance (-1 to 1, positive means more bids)
        total_volume = self.bid_volume + self.ask_volume
        if total_volume > 0:
            self.imbalance = (self.bid_volume - self.ask_volume) / total_volume
        else:
            self.imbalance = 0

        self.log.debug(f"Imbalance: {self.imbalance:.2f} (Bid: {self.bid_volume}, Ask: {self.ask_volume})")

        # Check if we should update orders
        if abs(self.imbalance) > self.imbalance_threshold:
            self._update_orders()

    def _update_orders(self) -> None:
        """Update orders based on orderbook imbalance."""
        if not self.mid_price or not self.spread:
            return

        # Cancel existing orders
        self._cancel_all_orders()

        # Check position limits
        positions = self.cache.positions_open(venue=None, instrument_id=self.instrument_id)
        if len(positions) >= self.max_positions:
            return

        # Calculate spread in basis points
        spread_bps = (self.spread / self.mid_price) * 10000
        if spread_bps < self.min_spread_bps:
            self.log.debug(f"Spread too tight: {spread_bps:.1f} bps < {self.min_spread_bps} bps")
            return

        # Place orders on the side with less liquidity
        if self.imbalance > self.imbalance_threshold:
            # More bids than asks - place sell orders
            self._place_limit_orders(OrderSide.SELL)
            self.log.info(
                f"Bid-heavy imbalance ({self.imbalance:.2f}), placing SELL orders",
                color=LogColor.YELLOW,
            )
        elif self.imbalance < -self.imbalance_threshold:
            # More asks than bids - place buy orders
            self._place_limit_orders(OrderSide.BUY)
            self.log.info(
                f"Ask-heavy imbalance ({self.imbalance:.2f}), placing BUY orders",
                color=LogColor.BLUE,
            )

    def _place_limit_orders(self, side: OrderSide) -> None:
        """Place limit orders at multiple levels."""
        if not self.mid_price or not self.spread:
            return

        # Calculate base offset from mid price
        base_offset = self.spread * self.spread_multiplier / 2

        for level in range(self.order_levels):
            # Calculate price for this level
            level_offset = base_offset * (1 + level * 0.2)  # 20% increment per level

            if side == OrderSide.BUY:
                price = self.mid_price - level_offset
            else:
                price = self.mid_price + level_offset

            try:
                order = self.order_factory.limit(
                    instrument_id=self.instrument_id,
                    order_side=side,
                    quantity=self.instrument.make_qty(self.position_size),
                    price=self.instrument.make_price(Decimal(str(price))),
                    time_in_force=TimeInForce.GTC,
                )

                self.submit_order(order)

                # Track the order
                self.active_orders[order.client_order_id] = {
                    "side": side,
                    "price": price,
                    "level": level
                }

                self.log.debug(
                    f"Placed {side} order at level {level}: Price {price:.2f}"
                )

            except Exception as e:
                self.log.error(f"Failed to place order: {e}")

    def _cancel_all_orders(self) -> None:
        """Cancel all active orders."""
        for order_id in list(self.active_orders.keys()):
            order = self.cache.order(order_id)
            if order and order.is_open:
                self.cancel_order(order)
        self.active_orders.clear()

    def on_order_filled(self, event) -> None:
        """Handle order fill events."""
        if event.client_order_id in self.active_orders:
            order_info = self.active_orders[event.client_order_id]
            self.log.info(
                f"Order filled: {order_info['side']} at {order_info['price']:.2f}",
                color=LogColor.GREEN,
            )
            del self.active_orders[event.client_order_id]

            # Optionally place a hedge order on the opposite side
            # This would depend on the specific market making strategy

    def on_data(self, data: Data) -> None:
        """Handle generic data."""
        # Handle order book data if available
        if isinstance(data, OrderBookDeltas):
            # Process order book updates
            # In real implementation, would update bid/ask volumes
            pass

    def on_event(self, event: Event) -> None:
        """Handle generic events."""
        # Handle order events
        if hasattr(event, "client_order_id"):
            if event.__class__.__name__ == "OrderFilled":
                self.on_order_filled(event)