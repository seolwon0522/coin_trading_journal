"""
Market Maker Strategy for Nautilus Trader
Based on official Nautilus Trader patterns
"""

from decimal import Decimal
from typing import Optional

from nautilus_trader.common.enums import LogColor
from nautilus_trader.config import StrategyConfig
from nautilus_trader.core.data import Data
from nautilus_trader.core.message import Event
from nautilus_trader.model.data import OrderBookDeltas, QuoteTick
from nautilus_trader.model.enums import OrderSide, TimeInForce, OrderType
from nautilus_trader.model.identifiers import InstrumentId
from nautilus_trader.model.instruments import Instrument
from nautilus_trader.model.orders import LimitOrder
from nautilus_trader.model.orderbook import OrderBook
from nautilus_trader.trading.strategy import Strategy


class MarketMakerConfig(StrategyConfig):
    """Configuration for Market Maker Strategy."""

    instrument_id: str
    trade_size: Decimal = Decimal("0.01")
    spread: Decimal = Decimal("0.001")  # 0.1% spread
    levels: int = 3  # Number of order levels
    level_spacing: Decimal = Decimal("0.0005")  # 0.05% between levels
    inventory_limit: Decimal = Decimal("1.0")  # Max inventory
    skew_factor: Decimal = Decimal("0.5")  # Inventory skew adjustment
    min_spread: Decimal = Decimal("0.0005")  # Minimum spread
    max_spread: Decimal = Decimal("0.005")  # Maximum spread
    cancel_threshold: Decimal = Decimal("0.002")  # Cancel if price moves 0.2%


class MarketMakerStrategy(Strategy):
    """
    Market Maker Strategy implementation based on Nautilus Trader patterns.

    This strategy provides liquidity by placing bid and ask orders around
    the mid-price, managing inventory risk through dynamic spread adjustment.
    """

    def __init__(self, config: MarketMakerConfig) -> None:
        super().__init__(config)

        # Configuration
        self.instrument_id = InstrumentId.from_str(config.instrument_id)
        self.trade_size = config.trade_size
        self.base_spread = config.spread
        self.levels = config.levels
        self.level_spacing = config.level_spacing
        self.inventory_limit = config.inventory_limit
        self.skew_factor = config.skew_factor
        self.min_spread = config.min_spread
        self.max_spread = config.max_spread
        self.cancel_threshold = config.cancel_threshold

        # State
        self.instrument: Optional[Instrument] = None
        self.orderbook: Optional[OrderBook] = None
        self.mid_price: Optional[Decimal] = None
        self.inventory: Decimal = Decimal("0")
        self.active_orders = {}

    def on_start(self) -> None:
        """Actions to be performed on strategy start."""
        self.instrument = self.cache.instrument(self.instrument_id)
        if self.instrument is None:
            self.log.error(f"Could not find instrument for {self.instrument_id}")
            self.stop()
            return

        # Subscribe to market data
        self.subscribe_order_book_deltas(
            self.instrument_id,
            book_type=2,  # L2_MBP
            depth=10,
        )
        self.subscribe_quote_ticks(self.instrument_id)

        self.log.info(
            f"Market Maker started: spread={self.base_spread}, levels={self.levels}",
            color=LogColor.GREEN,
        )

    def on_stop(self) -> None:
        """Actions to be performed on strategy stop."""
        self.unsubscribe_order_book_deltas(self.instrument_id)
        self.unsubscribe_quote_ticks(self.instrument_id)

        # Cancel all orders and close positions
        self.cancel_all_orders(self.instrument_id)
        self.close_all_positions(self.instrument_id)

        self.log.info("Market Maker stopped", color=LogColor.RED)

    def on_reset(self) -> None:
        """Actions to be performed on strategy reset."""
        self.orderbook = None
        self.mid_price = None
        self.inventory = Decimal("0")
        self.active_orders.clear()

    def on_order_book_deltas(self, deltas: OrderBookDeltas) -> None:
        """Handle order book updates."""
        # Update orderbook
        if self.orderbook is None:
            self.orderbook = OrderBook(
                instrument_id=self.instrument_id,
                book_type=2,
            )

        self.orderbook.apply_deltas(deltas)

        # Update mid price
        if self.orderbook.best_bid_price() and self.orderbook.best_ask_price():
            self.mid_price = (
                Decimal(str(self.orderbook.best_bid_price())) +
                Decimal(str(self.orderbook.best_ask_price()))
            ) / Decimal("2")

            # Update quotes
            self._update_quotes()

    def on_quote_tick(self, tick: QuoteTick) -> None:
        """Handle quote tick data."""
        # Update mid price from quote
        if tick.bid_price and tick.ask_price:
            self.mid_price = (
                Decimal(str(tick.bid_price)) +
                Decimal(str(tick.ask_price))
            ) / Decimal("2")

    def _calculate_spread(self) -> Decimal:
        """Calculate dynamic spread based on inventory."""
        # Adjust spread based on inventory
        inventory_ratio = self.inventory / self.inventory_limit if self.inventory_limit else Decimal("0")

        # Skew spread to reduce inventory risk
        spread_adjustment = abs(inventory_ratio) * self.skew_factor * self.base_spread

        # Apply min/max bounds
        spread = self.base_spread + spread_adjustment
        spread = max(self.min_spread, min(self.max_spread, spread))

        return spread

    def _update_quotes(self) -> None:
        """Update bid and ask quotes."""
        if not self.mid_price or not self.instrument:
            return

        # Cancel existing orders that are too far from mid price
        self._cancel_stale_orders()

        # Calculate current spread
        spread = self._calculate_spread()
        half_spread = spread / Decimal("2")

        # Calculate inventory skew
        inventory_ratio = self.inventory / self.inventory_limit if self.inventory_limit else Decimal("0")
        price_skew = inventory_ratio * self.skew_factor * half_spread

        # Place orders at multiple levels
        for level in range(self.levels):
            level_offset = Decimal(str(level)) * self.level_spacing * self.mid_price

            # Bid side
            bid_price = self.mid_price - half_spread - level_offset - price_skew
            bid_size = self.trade_size * (Decimal("1") + Decimal(str(level)) * Decimal("0.5"))

            # Only place bid if we have room for inventory
            if self.inventory + bid_size <= self.inventory_limit:
                self._place_limit_order(
                    OrderSide.BUY,
                    bid_price,
                    bid_size,
                    f"MM_BID_{level}"
                )

            # Ask side
            ask_price = self.mid_price + half_spread + level_offset - price_skew
            ask_size = self.trade_size * (Decimal("1") + Decimal(str(level)) * Decimal("0.5"))

            # Only place ask if we have inventory to sell
            if self.inventory - ask_size >= -self.inventory_limit:
                self._place_limit_order(
                    OrderSide.SELL,
                    ask_price,
                    ask_size,
                    f"MM_ASK_{level}"
                )

    def _place_limit_order(
        self,
        side: OrderSide,
        price: Decimal,
        size: Decimal,
        client_order_id_tag: str
    ) -> None:
        """Place a limit order."""
        # Cancel existing order with same tag if exists
        if client_order_id_tag in self.active_orders:
            old_order = self.active_orders[client_order_id_tag]
            self.cancel_order(old_order)

        # Create new order
        order = self.order_factory.limit(
            instrument_id=self.instrument_id,
            order_side=side,
            quantity=self.instrument.make_qty(size),
            price=self.instrument.make_price(price),
            time_in_force=TimeInForce.GTC,
            post_only=True,  # Ensure maker fees
        )

        self.submit_order(order)
        self.active_orders[client_order_id_tag] = order

        self.log.debug(
            f"Placed {side} order: price={price}, size={size}, tag={client_order_id_tag}"
        )

    def _cancel_stale_orders(self) -> None:
        """Cancel orders that are too far from current mid price."""
        if not self.mid_price:
            return

        for tag, order in list(self.active_orders.items()):
            if order.price:
                price_diff = abs(Decimal(str(order.price)) - self.mid_price) / self.mid_price

                if price_diff > self.cancel_threshold:
                    self.cancel_order(order)
                    del self.active_orders[tag]
                    self.log.debug(f"Cancelled stale order: {tag}")

    def on_order_filled(self, order) -> None:
        """Handle order fill events."""
        # Update inventory
        if order.side == OrderSide.BUY:
            self.inventory += Decimal(str(order.filled_qty))
        else:
            self.inventory -= Decimal(str(order.filled_qty))

        self.log.info(
            f"Order filled: side={order.side}, qty={order.filled_qty}, inventory={self.inventory}",
            color=LogColor.BLUE,
        )

        # Remove from active orders
        for tag, active_order in list(self.active_orders.items()):
            if active_order.client_order_id == order.client_order_id:
                del self.active_orders[tag]
                break

        # Update quotes after fill
        self._update_quotes()

    def on_data(self, data: Data) -> None:
        """Handle generic data."""
        pass

    def on_event(self, event: Event) -> None:
        """Handle generic events."""
        pass