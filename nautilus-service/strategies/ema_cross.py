"""
EMA Cross Strategy for Nautilus Trader
Based on official Nautilus Trader patterns
"""

from decimal import Decimal
from typing import Optional

from nautilus_trader.common.enums import LogColor
from nautilus_trader.config import StrategyConfig
from nautilus_trader.core.data import Data
from nautilus_trader.core.message import Event
from nautilus_trader.indicators import ExponentialMovingAverage
from nautilus_trader.model.data import Bar, BarType, QuoteTick, TradeTick
from nautilus_trader.model.enums import OrderSide, TimeInForce
from nautilus_trader.model.identifiers import InstrumentId
from nautilus_trader.model.instruments import Instrument
from nautilus_trader.model.orders import MarketOrder
from nautilus_trader.trading.strategy import Strategy


class EMACrossConfig(StrategyConfig):
    """Configuration for EMA Cross Strategy."""

    instrument_id: str
    bar_type: str
    fast_period: int = 10
    slow_period: int = 20
    trade_size: Decimal = Decimal("0.01")
    max_positions: int = 1
    stop_loss_pct: float = 0.02  # 2% stop loss
    take_profit_pct: float = 0.03  # 3% take profit


class EMACrossStrategy(Strategy):
    """
    EMA Cross Strategy implementation based on Nautilus Trader patterns.

    This strategy generates trading signals when fast EMA crosses slow EMA.
    - Buy signal: Fast EMA crosses above Slow EMA
    - Sell signal: Fast EMA crosses below Slow EMA
    """

    def __init__(self, config: EMACrossConfig) -> None:
        super().__init__(config)

        # Configuration
        self.instrument_id = InstrumentId.from_str(config.instrument_id)
        self.bar_type = BarType.from_str(config.bar_type)
        self.fast_period = config.fast_period
        self.slow_period = config.slow_period
        self.trade_size = config.trade_size
        self.max_positions = config.max_positions
        self.stop_loss_pct = config.stop_loss_pct
        self.take_profit_pct = config.take_profit_pct

        # Indicators
        self.fast_ema: Optional[ExponentialMovingAverage] = None
        self.slow_ema: Optional[ExponentialMovingAverage] = None

        # State
        self.instrument: Optional[Instrument] = None
        self.position_count = 0
        self.last_bar: Optional[Bar] = None

    def on_start(self) -> None:
        """Actions to be performed on strategy start."""
        self.instrument = self.cache.instrument(self.instrument_id)
        if self.instrument is None:
            self.log.error(f"Could not find instrument for {self.instrument_id}")
            self.stop()
            return

        # Initialize indicators
        self.fast_ema = ExponentialMovingAverage(self.fast_period)
        self.slow_ema = ExponentialMovingAverage(self.slow_period)

        # Subscribe to market data
        self.subscribe_bars(self.bar_type)
        self.subscribe_quote_ticks(self.instrument_id)

        self.log.info(
            f"Strategy started: fast_period={self.fast_period}, slow_period={self.slow_period}",
            color=LogColor.GREEN,
        )

    def on_stop(self) -> None:
        """Actions to be performed on strategy stop."""
        self.unsubscribe_bars(self.bar_type)
        self.unsubscribe_quote_ticks(self.instrument_id)

        # Close all positions
        self.close_all_positions(self.instrument_id)

        self.log.info("Strategy stopped", color=LogColor.RED)

    def on_reset(self) -> None:
        """Actions to be performed on strategy reset."""
        if self.fast_ema:
            self.fast_ema.reset()
        if self.slow_ema:
            self.slow_ema.reset()
        self.position_count = 0
        self.last_bar = None

    def on_bar(self, bar: Bar) -> None:
        """Handle bar data."""
        self.log.debug(f"Received bar: {bar}")

        # Update indicators
        self.fast_ema.handle_bar(bar)
        self.slow_ema.handle_bar(bar)

        # Check if indicators are ready
        if not self.fast_ema.initialized or not self.slow_ema.initialized:
            return

        # Store last bar for reference
        if self.last_bar is None:
            self.last_bar = bar
            return

        # Check for crossover signals
        prev_fast = self.fast_ema.value
        prev_slow = self.slow_ema.value

        self.last_bar = bar

        curr_fast = self.fast_ema.value
        curr_slow = self.slow_ema.value

        # Check position count
        positions = self.cache.positions_open(venue=None, instrument_id=self.instrument_id)
        self.position_count = len(positions)

        # Buy signal: Fast EMA crosses above Slow EMA
        if prev_fast <= prev_slow and curr_fast > curr_slow:
            if self.position_count < self.max_positions:
                self._enter_long()

        # Sell signal: Fast EMA crosses below Slow EMA
        elif prev_fast >= prev_slow and curr_fast < curr_slow:
            if self.position_count > 0:
                self._exit_positions()

    def on_quote_tick(self, tick: QuoteTick) -> None:
        """Handle quote tick data."""
        # Can be used for more precise entry/exit
        pass

    def _enter_long(self) -> None:
        """Enter a long position."""
        if not self.instrument:
            return

        order = self.order_factory.market(
            instrument_id=self.instrument_id,
            order_side=OrderSide.BUY,
            quantity=self.instrument.make_qty(self.trade_size),
            time_in_force=TimeInForce.IOC,
        )

        self.submit_order(order)

        self.log.info(
            f"Entering LONG position: size={self.trade_size}",
            color=LogColor.BLUE,
        )

    def _exit_positions(self) -> None:
        """Exit all positions."""
        positions = self.cache.positions_open(venue=None, instrument_id=self.instrument_id)

        for position in positions:
            if position.is_long:
                order = self.order_factory.market(
                    instrument_id=self.instrument_id,
                    order_side=OrderSide.SELL,
                    quantity=position.quantity,
                    time_in_force=TimeInForce.IOC,
                )
                self.submit_order(order)

                self.log.info(
                    f"Exiting LONG position: size={position.quantity}",
                    color=LogColor.YELLOW,
                )
            elif position.is_short:
                order = self.order_factory.market(
                    instrument_id=self.instrument_id,
                    order_side=OrderSide.BUY,
                    quantity=position.quantity,
                    time_in_force=TimeInForce.IOC,
                )
                self.submit_order(order)

                self.log.info(
                    f"Covering SHORT position: size={position.quantity}",
                    color=LogColor.YELLOW,
                )

    def on_data(self, data: Data) -> None:
        """Handle generic data."""
        pass

    def on_event(self, event: Event) -> None:
        """Handle generic events."""
        pass