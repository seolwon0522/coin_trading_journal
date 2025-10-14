"""
EMA Cross Strategy for Nautilus Trader
Based on official Nautilus Trader patterns
"""

from decimal import Decimal
from typing import Optional
from pydantic import Field

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


class EMACrossConfig(StrategyConfig, kw_only=True):
    """Configuration for EMA Cross Strategy."""

    instrument_id: str
    bar_type: str
    order_id_tag: str = "001"  # Prevent '-None' suffix in strategy ID
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
        
        # Signal state to prevent duplicate entries
        self.last_signal: Optional[str] = None  # "BUY" or "SELL"
        self.signal_bar_count = 0  # Count bars since last signal

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
        self.last_signal = None
        self.signal_bar_count = 0

    def on_bar(self, bar: Bar) -> None:
        """Handle bar data."""
        self.log.debug(f"Received bar: {bar}")
        
        # Debug: Log bar count
        if not hasattr(self, '_bar_count'):
            self._bar_count = 0
        self._bar_count += 1

        # Store previous EMA values BEFORE updating
        prev_fast = self.fast_ema.value if self.fast_ema.initialized else None
        prev_slow = self.slow_ema.value if self.slow_ema.initialized else None

        # Update indicators
        self.fast_ema.handle_bar(bar)
        self.slow_ema.handle_bar(bar)

        # Check if indicators are ready
        if not self.fast_ema.initialized or not self.slow_ema.initialized:
            return

        # Need previous values for crossover detection
        if prev_fast is None or prev_slow is None:
            self.last_bar = bar
            return

        # Get current EMA values AFTER updating
        curr_fast = self.fast_ema.value
        curr_slow = self.slow_ema.value

        # Check current positions
        positions = self.cache.positions_open(venue=None, instrument_id=self.instrument_id)
        self.position_count = len(positions)
        has_long = any(p.is_long for p in positions)
        has_short = any(p.is_short for p in positions)

        # Buy signal: Fast EMA crosses above Slow EMA
        if prev_fast <= prev_slow and curr_fast > curr_slow:
            # Only process if this is a NEW signal (prevent duplicate actions on same crossover)
            if self.last_signal != "BUY":
                self.log.info(f"🔵 BUY Signal at bar #{self._bar_count}! Fast EMA crossed above Slow EMA (Fast: {curr_fast:.2f}, Slow: {curr_slow:.2f})")
                self.log.info(f"   Last signal was: {self.last_signal}, Position count: {self.position_count}")
                
                # Close any existing positions first (including shorts)
                if self.position_count > 0:
                    self.log.info(f"   Closing existing position(s) before entering long...")
                    self._exit_positions()
                
                # Enter new long position
                self._enter_long()
                
                # Mark this signal as processed
                self.last_signal = "BUY"
                self.signal_bar_count = 0
            else:
                self.signal_bar_count += 1
                if self.signal_bar_count == 1:  # Log first skip
                    self.log.info(f"   Skipping duplicate BUY signal (already in LONG)")
                elif self.signal_bar_count % 100 == 0:  # Log every 100 bars
                    self.log.debug(f"   Still in LONG trend (bar {self.signal_bar_count})")

        # Sell signal: Fast EMA crosses below Slow EMA
        elif prev_fast >= prev_slow and curr_fast < curr_slow:
            # Only process if this is a NEW signal
            if self.last_signal != "SELL":
                self.log.info(f"🔴 SELL Signal at bar #{self._bar_count}! Fast EMA crossed below Slow EMA (Fast: {curr_fast:.2f}, Slow: {curr_slow:.2f})")
                self.log.info(f"   Last signal was: {self.last_signal}, Position count: {self.position_count}")
                
                # Close any existing positions (including longs)
                if self.position_count > 0:
                    self.log.info(f"   Closing position(s) before entering short...")
                    self._exit_positions()
                
                # Enter new SHORT position
                self._enter_short()
                
                # Mark this signal as processed
                self.last_signal = "SELL"
                self.signal_bar_count = 0
            else:
                self.signal_bar_count += 1
                if self.signal_bar_count == 1:  # Log first skip
                    self.log.info(f"   Skipping duplicate SELL signal (already in SHORT)")
                elif self.signal_bar_count % 100 == 0:  # Log every 100 bars
                    self.log.debug(f"   Still in SHORT trend (bar {self.signal_bar_count})")
        
        # Update last bar
        self.last_bar = bar

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

    def _enter_short(self) -> None:
        """Enter a short position."""
        if not self.instrument:
            return

        order = self.order_factory.market(
            instrument_id=self.instrument_id,
            order_side=OrderSide.SELL,
            quantity=self.instrument.make_qty(self.trade_size),
            time_in_force=TimeInForce.IOC,
        )

        self.submit_order(order)

        self.log.info(
            f"Entering SHORT position: size={self.trade_size}",
            color=LogColor.RED,
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