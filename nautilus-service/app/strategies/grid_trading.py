"""
Grid Trading Strategy Implementation
Nautilus Actor Pattern을 활용한 그리드 트레이딩 전략
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional

from nautilus_trader.config import StrategyConfig
from nautilus_trader.model.data import QuoteTick, TradeTick, Bar
from nautilus_trader.model.enums import OrderSide
from nautilus_trader.model.events import OrderFilled
from nautilus_trader.model.objects import Price
from nautilus_trader.model.orders import LimitOrder

from app.strategies.base_strategy import BaseStrategy


class GridTradingConfig(StrategyConfig):
    """Configuration model for grid trading strategy."""

    instrument_id: str
    bar_type: str
    upper_price: Decimal = Decimal("70000")
    lower_price: Decimal = Decimal("30000")
    grid_levels: int = 10
    grid_spacing: Optional[Decimal] = None
    position_size: Decimal = Decimal("0.001")
    max_positions: int = 10
    post_only: bool = True


class GridTradingStrategy(BaseStrategy):
    """그리드 트레이딩 전략."""

    _PRICE_QUANTIZE = Decimal("0.01")

    def __init__(self, config: GridTradingConfig):
        super().__init__(config)

        self.upper_price = Decimal(str(config.upper_price))
        self.lower_price = Decimal(str(config.lower_price))
        if self.upper_price <= self.lower_price:
            raise ValueError("upper_price must be greater than lower_price")

        self.grid_levels = max(int(config.grid_levels), 2)
        spacing = config.grid_spacing
        self.grid_spacing = Decimal(str(spacing)) if spacing is not None else None
        if self.grid_spacing is not None and self.grid_spacing <= 0:
            raise ValueError("grid_spacing must be positive when provided")

        self.post_only = bool(config.post_only)

        self.grid_prices = self._calculate_grid_prices()
        self.grid_orders: Dict[Decimal, LimitOrder] = {}

        self.current_price: Optional[Decimal] = None
        self.last_filled_price: Optional[Decimal] = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------
    def on_start(self):  # type: ignore[override]
        super().on_start()
        self.log.info(
            "Grid Trading Strategy started: range=[%s - %s], levels=%s",
            self.lower_price,
            self.upper_price,
            self.grid_levels,
        )

    def on_stop(self):  # type: ignore[override]
        self._cancel_all_grid_orders()
        super().on_stop()

    # ------------------------------------------------------------------
    # Event handlers
    # ------------------------------------------------------------------
    def _process_quote_tick(self, tick: QuoteTick):
        mid_price = (float(tick.bid_price) + float(tick.ask_price)) / 2
        self.current_price = Decimal(str(mid_price))

        if not self.grid_orders and self.is_running:
            self._setup_initial_grid()

    def _process_trade_tick(self, tick: TradeTick):
        # No-op for grid strategy
        return

    def _process_bar(self, bar: Bar):
        # No-op for grid strategy
        return

    def _setup_initial_grid(self):
        if self.current_price is None:
            return

        self.log.info("Setting up initial grid at price %s", self.current_price)

        for grid_price in self.grid_prices:
            if grid_price < self.current_price:
                self._place_grid_order(OrderSide.BUY, grid_price)
            elif grid_price > self.current_price:
                self._place_grid_order(OrderSide.SELL, grid_price)

        self.log.info("Initial grid setup complete with %s orders", len(self.grid_orders))

    def _update_grid_orders(self):
        # Placeholder for future enhancements (e.g., dynamic spacing)
        return

    def _on_order_filled(self, event: OrderFilled):
        filled_price = Decimal(str(event.last_px))
        filled_side = event.order_side

        self.log.info("Grid order filled: %s @ %s", filled_side.name, filled_price)

        # Remove filled order from tracking
        rounded_price = self._round_price(filled_price)
        if rounded_price in self.grid_orders:
            self.grid_orders.pop(rounded_price, None)

        # Determine next grid price based on fill direction
        direction = "up" if filled_side == OrderSide.BUY else "down"
        next_price = self._get_next_grid_price(filled_price, direction)
        if next_price:
            opposite_side = OrderSide.SELL if filled_side == OrderSide.BUY else OrderSide.BUY
            if direction == "up":
                opposite_side = OrderSide.SELL
            else:
                opposite_side = OrderSide.BUY
            self._place_grid_order(opposite_side, next_price)

        self.last_filled_price = filled_price
        self._update_grid_orders()

        total_pnl = self.get_total_pnl()
        self.log.info("Current total PnL: %s", total_pnl)

    # ------------------------------------------------------------------
    # Order helpers
    # ------------------------------------------------------------------
    def _place_grid_order(self, side: OrderSide, price: Decimal) -> Optional[LimitOrder]:
        rounded_price = self._round_price(price)
        if rounded_price in self.grid_orders:
            return self.grid_orders[rounded_price]

        try:
            order = self.submit_limit_order(
                side=side,
                price=rounded_price,
                post_only=self.post_only,
            )
            self.grid_orders[rounded_price] = order
            self.log.debug("Grid order placed: %s %s @ %s", side.name, self._position_size, rounded_price)
            return order
        except Exception as exc:  # noqa: BLE001
            self.log.error("Failed to place grid order: %s", exc)
            return None

    def _cancel_all_grid_orders(self):
        for price, order in list(self.grid_orders.items()):
            try:
                self.cancel_order(order)
            except Exception as exc:  # noqa: BLE001
                self.log.error("Failed to cancel grid order: %s", exc)
            finally:
                self.grid_orders.pop(price, None)

        self.log.info("All grid orders cancelled")

    # ------------------------------------------------------------------
    # Utility helpers
    # ------------------------------------------------------------------
    def _calculate_grid_prices(self) -> List[Decimal]:
        prices: List[Decimal] = []

        if self.grid_spacing and self.grid_spacing > 0:
            price = self.lower_price
            while price <= self.upper_price:
                prices.append(self._round_price(price))
                price += self.grid_spacing
            if prices[-1] != self._round_price(self.upper_price):
                prices.append(self._round_price(self.upper_price))
        else:
            step = (self.upper_price - self.lower_price) / (self.grid_levels - 1)
            for idx in range(self.grid_levels):
                price = self.lower_price + (step * idx)
                prices.append(self._round_price(price))

        # Ensure unique, sorted prices within bounds
        unique_prices = sorted({p for p in prices if self.lower_price <= p <= self.upper_price})
        return unique_prices

    def _round_price(self, price: Decimal) -> Decimal:
        return (price.quantize(self._PRICE_QUANTIZE))

    def _get_next_grid_price(self, current_price: Decimal, direction: str) -> Optional[Decimal]:
        rounded_current = self._round_price(current_price)
        if direction == "up":
            higher = [p for p in self.grid_prices if p > rounded_current]
            return min(higher) if higher else None
        lower = [p for p in self.grid_prices if p < rounded_current]
        return max(lower) if lower else None

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------
    def get_grid_status(self) -> Dict[str, Any]:
        buy_orders = sum(1 for order in self.grid_orders.values() if order.side == OrderSide.BUY)
        sell_orders = sum(1 for order in self.grid_orders.values() if order.side == OrderSide.SELL)

        return {
            "strategy_id": str(self.id),
            "upper_price": float(self.upper_price),
            "lower_price": float(self.lower_price),
            "grid_levels": self.grid_levels,
            "current_price": float(self.current_price) if self.current_price else None,
            "active_orders": len(self.grid_orders),
            "buy_orders": buy_orders,
            "sell_orders": sell_orders,
            "last_filled_price": float(self.last_filled_price) if self.last_filled_price else None,
            "total_pnl": float(self.get_total_pnl()),
            "position_count": self.get_position_count(),
        }
