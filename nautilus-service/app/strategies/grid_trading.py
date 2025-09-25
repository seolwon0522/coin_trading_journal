"""
Grid Trading Strategy for Nautilus Trader
그리드 트레이딩 - 일정 간격으로 매수/매도 주문을 배치
"""

from decimal import Decimal
from typing import Optional, List, Dict

from nautilus_trader.common.enums import LogColor
from nautilus_trader.config import StrategyConfig
from nautilus_trader.core.data import Data
from nautilus_trader.core.message import Event
from nautilus_trader.model.data import Bar, BarType, QuoteTick
from nautilus_trader.model.enums import OrderSide, OrderType, TimeInForce
from nautilus_trader.model.identifiers import InstrumentId, ClientOrderId
from nautilus_trader.model.instruments import Instrument
from nautilus_trader.model.orders import LimitOrder
from nautilus_trader.trading.strategy import Strategy


class GridTradingConfig(StrategyConfig):
    """Configuration for Grid Trading Strategy."""

    instrument_id: str
    bar_type: str
    grid_levels: int = 10  # Number of grid levels
    grid_spacing: float = 0.01  # 1% spacing between levels
    position_size: Decimal = Decimal("0.01")  # Size per grid level
    max_positions: int = 10  # Maximum concurrent positions
    upper_price: Optional[float] = None  # Upper bound (auto-calculate if None)
    lower_price: Optional[float] = None  # Lower bound (auto-calculate if None)


class GridTradingStrategy(Strategy):
    """
    Grid Trading Strategy implementation.

    Places buy and sell orders at regular intervals (grid levels).
    Profits from market volatility in ranging markets.
    """

    def __init__(self, config: GridTradingConfig) -> None:
        super().__init__(config)

        # Configuration
        self.instrument_id = InstrumentId.from_str(config.instrument_id)
        self.bar_type = BarType.from_str(config.bar_type)
        self.grid_levels = config.grid_levels
        self.grid_spacing = config.grid_spacing
        self.position_size = config.position_size
        self.max_positions = config.max_positions
        self.upper_price = config.upper_price
        self.lower_price = config.lower_price

        # State
        self.instrument: Optional[Instrument] = None
        self.grid_orders: Dict[ClientOrderId, Dict] = {}  # order_id: {side, price, level}
        self.active_grids: Dict[int, ClientOrderId] = {}  # level: order_id
        self.current_price: Optional[float] = None
        self.grid_initialized = False

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

        self.log.info(
            f"Grid Trading Strategy started: levels={self.grid_levels}, spacing={self.grid_spacing:.2%}",
            color=LogColor.GREEN,
        )

    def on_stop(self) -> None:
        """Actions to be performed on strategy stop."""
        self.unsubscribe_bars(self.bar_type)
        self.unsubscribe_quote_ticks(self.instrument_id)

        # Cancel all grid orders
        self._cancel_all_grid_orders()

        # Close all positions
        self.close_all_positions(self.instrument_id)

        self.log.info("Grid Trading Strategy stopped", color=LogColor.RED)

    def on_reset(self) -> None:
        """Actions to be performed on strategy reset."""
        self.grid_orders.clear()
        self.active_grids.clear()
        self.current_price = None
        self.grid_initialized = False

    def on_bar(self, bar: Bar) -> None:
        """Handle bar data."""
        self.current_price = float(bar.close)

        # Initialize grid on first bar
        if not self.grid_initialized:
            self._initialize_grid(self.current_price)
            self.grid_initialized = True

    def on_quote_tick(self, tick: QuoteTick) -> None:
        """Handle quote tick data for more responsive grid management."""
        self.current_price = float((tick.bid_price + tick.ask_price) / 2)

        # Check if grid needs rebalancing
        if self.grid_initialized:
            self._check_grid_rebalance()

    def on_order_filled(self, event) -> None:
        """Handle order fill events."""
        if event.client_order_id not in self.grid_orders:
            return

        order_info = self.grid_orders[event.client_order_id]
        level = order_info["level"]

        self.log.info(
            f"Grid order filled: Level {level}, Side {order_info['side']}, Price {order_info['price']}",
            color=LogColor.GREEN,
        )

        # Place opposite order at the same level
        self._place_opposite_order(level, order_info)

        # Remove filled order from tracking
        del self.grid_orders[event.client_order_id]
        if level in self.active_grids and self.active_grids[level] == event.client_order_id:
            del self.active_grids[level]

    def _initialize_grid(self, current_price: float) -> None:
        """Initialize the grid with buy and sell orders."""
        if not self.upper_price:
            self.upper_price = current_price * (1 + self.grid_spacing * self.grid_levels / 2)
        if not self.lower_price:
            self.lower_price = current_price * (1 - self.grid_spacing * self.grid_levels / 2)

        self.log.info(
            f"Initializing grid: Range [{self.lower_price:.2f} - {self.upper_price:.2f}], "
            f"Current price: {current_price:.2f}",
            color=LogColor.BLUE,
        )

        # Calculate grid levels
        price_range = self.upper_price - self.lower_price
        level_spacing = price_range / (self.grid_levels - 1)

        # Place grid orders
        for i in range(self.grid_levels):
            grid_price = self.lower_price + (level_spacing * i)

            # Determine order side based on current price
            if grid_price < current_price * 0.999:  # Below current price - place buy orders
                self._place_grid_order(i, grid_price, OrderSide.BUY)
            elif grid_price > current_price * 1.001:  # Above current price - place sell orders
                self._place_grid_order(i, grid_price, OrderSide.SELL)

    def _place_grid_order(self, level: int, price: float, side: OrderSide) -> None:
        """Place a single grid order."""
        if level in self.active_grids:
            # Grid level already has an active order
            return

        # Check position limits
        positions = self.cache.positions_open(venue=None, instrument_id=self.instrument_id)
        if len(positions) >= self.max_positions:
            return

        try:
            order = self.order_factory.limit(
                instrument_id=self.instrument_id,
                order_side=side,
                quantity=self.instrument.make_qty(self.position_size),
                price=self.instrument.make_price(Decimal(str(price))),
                time_in_force=TimeInForce.GTC,  # Good Till Cancel
            )

            self.submit_order(order)

            # Track the order
            self.grid_orders[order.client_order_id] = {
                "side": side,
                "price": price,
                "level": level
            }
            self.active_grids[level] = order.client_order_id

            self.log.debug(
                f"Placed grid order: Level {level}, Side {side}, Price {price:.2f}"
            )

        except Exception as e:
            self.log.error(f"Failed to place grid order: {e}")

    def _place_opposite_order(self, level: int, previous_order: Dict) -> None:
        """Place opposite order after a fill."""
        # Determine opposite side and new price
        if previous_order["side"] == OrderSide.BUY:
            # Was a buy, place a sell higher
            new_side = OrderSide.SELL
            new_price = previous_order["price"] * (1 + self.grid_spacing)
        else:
            # Was a sell, place a buy lower
            new_side = OrderSide.BUY
            new_price = previous_order["price"] * (1 - self.grid_spacing)

        # Check if new price is within bounds
        if self.lower_price <= new_price <= self.upper_price:
            self._place_grid_order(level, new_price, new_side)

    def _check_grid_rebalance(self) -> None:
        """Check if grid needs rebalancing based on current price."""
        if not self.current_price:
            return

        # Check if price has moved outside grid bounds
        if self.current_price > self.upper_price * 1.1:
            # Price broke above - shift grid up
            self.log.warning(
                f"Price {self.current_price:.2f} above grid upper bound {self.upper_price:.2f}, rebalancing",
                color=LogColor.YELLOW,
            )
            self._rebalance_grid()
        elif self.current_price < self.lower_price * 0.9:
            # Price broke below - shift grid down
            self.log.warning(
                f"Price {self.current_price:.2f} below grid lower bound {self.lower_price:.2f}, rebalancing",
                color=LogColor.YELLOW,
            )
            self._rebalance_grid()

    def _rebalance_grid(self) -> None:
        """Rebalance the grid around current price."""
        # Cancel all existing orders
        self._cancel_all_grid_orders()

        # Reset grid state
        self.grid_orders.clear()
        self.active_grids.clear()

        # Reinitialize grid at current price
        if self.current_price:
            self.upper_price = None
            self.lower_price = None
            self._initialize_grid(self.current_price)

    def _cancel_all_grid_orders(self) -> None:
        """Cancel all active grid orders."""
        for order_id in list(self.grid_orders.keys()):
            order = self.cache.order(order_id)
            if order and order.is_open:
                self.cancel_order(order)

    def on_data(self, data: Data) -> None:
        """Handle generic data."""
        pass

    def on_event(self, event: Event) -> None:
        """Handle generic events."""
        # Handle order events
        if hasattr(event, "client_order_id"):
            if event.__class__.__name__ == "OrderFilled":
                self.on_order_filled(event)