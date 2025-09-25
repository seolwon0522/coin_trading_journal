"""
Orderbook Imbalance Strategy for Nautilus Trader
Based on official Nautilus Trader patterns
"""

from decimal import Decimal
from typing import Optional, List

from nautilus_trader.common.enums import LogColor
from nautilus_trader.config import StrategyConfig
from nautilus_trader.core.data import Data
from nautilus_trader.core.message import Event
from nautilus_trader.model.data import OrderBookDeltas, Bar, BarType
from nautilus_trader.model.enums import OrderSide, TimeInForce
from nautilus_trader.model.identifiers import InstrumentId
from nautilus_trader.model.instruments import Instrument
from nautilus_trader.model.orderbook import OrderBook
from nautilus_trader.trading.strategy import Strategy


class OrderbookImbalanceConfig(StrategyConfig):
    """Configuration for Orderbook Imbalance Strategy."""

    instrument_id: str
    bar_type: str = "BINANCE-SPOT.BTCUSDT-1-MINUTE-LAST-INTERNAL"
    imbalance_threshold: Decimal = Decimal("0.65")  # 65% imbalance threshold
    min_depth_usdt: Decimal = Decimal("10000")  # Minimum depth in USDT
    trade_size: Decimal = Decimal("0.01")
    max_positions: int = 1
    lookback_periods: int = 10  # Periods for volume analysis
    stop_loss_pct: float = 0.01  # 1% stop loss
    take_profit_pct: float = 0.02  # 2% take profit
    cool_down_periods: int = 5  # Bars to wait after trade


class OrderbookImbalanceStrategy(Strategy):
    """
    Orderbook Imbalance Strategy implementation based on Nautilus Trader patterns.

    This strategy analyzes order book depth to detect supply/demand imbalances
    and trades in the direction of the imbalance.
    """

    def __init__(self, config: OrderbookImbalanceConfig) -> None:
        super().__init__(config)

        # Configuration
        self.instrument_id = InstrumentId.from_str(config.instrument_id)
        self.bar_type = BarType.from_str(config.bar_type)
        self.imbalance_threshold = config.imbalance_threshold
        self.min_depth_usdt = config.min_depth_usdt
        self.trade_size = config.trade_size
        self.max_positions = config.max_positions
        self.lookback_periods = config.lookback_periods
        self.stop_loss_pct = config.stop_loss_pct
        self.take_profit_pct = config.take_profit_pct
        self.cool_down_periods = config.cool_down_periods

        # State
        self.instrument: Optional[Instrument] = None
        self.orderbook: Optional[OrderBook] = None
        self.volume_history: List[Decimal] = []
        self.imbalance_history: List[Decimal] = []
        self.bars_since_trade = 0
        self.last_mid_price: Optional[Decimal] = None

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
            depth=20,  # Get top 20 levels
        )
        self.subscribe_bars(self.bar_type)

        self.log.info(
            f"Orderbook Imbalance started: threshold={self.imbalance_threshold}",
            color=LogColor.GREEN,
        )

    def on_stop(self) -> None:
        """Actions to be performed on strategy stop."""
        self.unsubscribe_order_book_deltas(self.instrument_id)
        self.unsubscribe_bars(self.bar_type)

        # Close all positions
        self.close_all_positions(self.instrument_id)

        self.log.info("Orderbook Imbalance stopped", color=LogColor.RED)

    def on_reset(self) -> None:
        """Actions to be performed on strategy reset."""
        self.orderbook = None
        self.volume_history.clear()
        self.imbalance_history.clear()
        self.bars_since_trade = 0
        self.last_mid_price = None

    def on_order_book_deltas(self, deltas: OrderBookDeltas) -> None:
        """Handle order book updates."""
        # Initialize or update orderbook
        if self.orderbook is None:
            self.orderbook = OrderBook(
                instrument_id=self.instrument_id,
                book_type=2,
            )

        self.orderbook.apply_deltas(deltas)

        # Calculate imbalance
        imbalance = self._calculate_imbalance()
        if imbalance is not None:
            self.imbalance_history.append(imbalance)
            if len(self.imbalance_history) > self.lookback_periods:
                self.imbalance_history.pop(0)

            # Check for trading signals
            self._check_imbalance_signal(imbalance)

    def on_bar(self, bar: Bar) -> None:
        """Handle bar data."""
        # Update volume history
        volume = Decimal(str(bar.volume))
        self.volume_history.append(volume)
        if len(self.volume_history) > self.lookback_periods:
            self.volume_history.pop(0)

        # Update cool down counter
        self.bars_since_trade += 1

        # Update mid price
        self.last_mid_price = (
            Decimal(str(bar.high)) + Decimal(str(bar.low))
        ) / Decimal("2")

    def _calculate_imbalance(self) -> Optional[Decimal]:
        """Calculate order book imbalance ratio."""
        if not self.orderbook:
            return None

        # Calculate bid depth
        bid_depth = Decimal("0")
        bid_levels = min(10, self.orderbook.bid_depth())
        for i in range(bid_levels):
            level = self.orderbook.bid(i)
            if level:
                bid_depth += Decimal(str(level.size)) * Decimal(str(level.price))

        # Calculate ask depth
        ask_depth = Decimal("0")
        ask_levels = min(10, self.orderbook.ask_depth())
        for i in range(ask_levels):
            level = self.orderbook.ask(i)
            if level:
                ask_depth += Decimal(str(level.size)) * Decimal(str(level.price))

        # Check minimum depth requirement
        total_depth = bid_depth + ask_depth
        if total_depth < self.min_depth_usdt:
            return None

        # Calculate imbalance ratio (bid / total)
        if total_depth > 0:
            imbalance = bid_depth / total_depth
            return imbalance

        return None

    def _check_imbalance_signal(self, imbalance: Decimal) -> None:
        """Check if imbalance creates a trading signal."""
        # Check cooldown
        if self.bars_since_trade < self.cool_down_periods:
            return

        # Check position count
        positions = self.cache.positions_open(venue=None, instrument_id=self.instrument_id)
        if len(positions) >= self.max_positions:
            return

        # Check volume conditions
        if len(self.volume_history) < self.lookback_periods:
            return

        avg_volume = sum(self.volume_history) / len(self.volume_history)
        recent_volume = self.volume_history[-1] if self.volume_history else Decimal("0")

        # Only trade on above-average volume
        if recent_volume < avg_volume:
            return

        # Strong buy imbalance
        if imbalance > self.imbalance_threshold:
            self._enter_long()

        # Strong sell imbalance
        elif imbalance < (Decimal("1") - self.imbalance_threshold):
            self._enter_short()

    def _enter_long(self) -> None:
        """Enter a long position."""
        if not self.instrument:
            return

        # Calculate stop loss and take profit
        if self.last_mid_price:
            stop_loss_price = self.last_mid_price * (Decimal("1") - Decimal(str(self.stop_loss_pct)))
            take_profit_price = self.last_mid_price * (Decimal("1") + Decimal(str(self.take_profit_pct)))
        else:
            stop_loss_price = None
            take_profit_price = None

        # Place market order with stop loss and take profit
        order = self.order_factory.market(
            instrument_id=self.instrument_id,
            order_side=OrderSide.BUY,
            quantity=self.instrument.make_qty(self.trade_size),
            time_in_force=TimeInForce.IOC,
        )

        self.submit_order(order)

        # Place stop loss order if we have price
        if stop_loss_price:
            sl_order = self.order_factory.stop_market(
                instrument_id=self.instrument_id,
                order_side=OrderSide.SELL,
                quantity=self.instrument.make_qty(self.trade_size),
                trigger_price=self.instrument.make_price(stop_loss_price),
                time_in_force=TimeInForce.GTC,
            )
            self.submit_order(sl_order)

        # Place take profit order if we have price
        if take_profit_price:
            tp_order = self.order_factory.limit(
                instrument_id=self.instrument_id,
                order_side=OrderSide.SELL,
                quantity=self.instrument.make_qty(self.trade_size),
                price=self.instrument.make_price(take_profit_price),
                time_in_force=TimeInForce.GTC,
            )
            self.submit_order(tp_order)

        self.bars_since_trade = 0
        self.log.info(
            f"Entering LONG: imbalance={self.imbalance_history[-1]:.2%}",
            color=LogColor.BLUE,
        )

    def _enter_short(self) -> None:
        """Enter a short position."""
        if not self.instrument:
            return

        # Calculate stop loss and take profit
        if self.last_mid_price:
            stop_loss_price = self.last_mid_price * (Decimal("1") + Decimal(str(self.stop_loss_pct)))
            take_profit_price = self.last_mid_price * (Decimal("1") - Decimal(str(self.take_profit_pct)))
        else:
            stop_loss_price = None
            take_profit_price = None

        # Place market order
        order = self.order_factory.market(
            instrument_id=self.instrument_id,
            order_side=OrderSide.SELL,
            quantity=self.instrument.make_qty(self.trade_size),
            time_in_force=TimeInForce.IOC,
        )

        self.submit_order(order)

        # Place stop loss order if we have price
        if stop_loss_price:
            sl_order = self.order_factory.stop_market(
                instrument_id=self.instrument_id,
                order_side=OrderSide.BUY,
                quantity=self.instrument.make_qty(self.trade_size),
                trigger_price=self.instrument.make_price(stop_loss_price),
                time_in_force=TimeInForce.GTC,
            )
            self.submit_order(sl_order)

        # Place take profit order if we have price
        if take_profit_price:
            tp_order = self.order_factory.limit(
                instrument_id=self.instrument_id,
                order_side=OrderSide.BUY,
                quantity=self.instrument.make_qty(self.trade_size),
                price=self.instrument.make_price(take_profit_price),
                time_in_force=TimeInForce.GTC,
            )
            self.submit_order(tp_order)

        self.bars_since_trade = 0
        self.log.info(
            f"Entering SHORT: imbalance={self.imbalance_history[-1]:.2%}",
            color=LogColor.YELLOW,
        )

    def on_data(self, data: Data) -> None:
        """Handle generic data."""
        pass

    def on_event(self, event: Event) -> None:
        """Handle generic events."""
        pass