"""
Momentum Strategy for Nautilus Trader
모멘텀 기반 추세 추종 전략
"""

from decimal import Decimal
from typing import Optional, List
import numpy as np

from nautilus_trader.common.enums import LogColor
from nautilus_trader.config import StrategyConfig
from nautilus_trader.core.data import Data
from nautilus_trader.core.message import Event
from nautilus_trader.model.data import Bar, BarType
from nautilus_trader.model.enums import OrderSide, TimeInForce
from nautilus_trader.model.identifiers import InstrumentId
from nautilus_trader.model.instruments import Instrument
from nautilus_trader.trading.strategy import Strategy


class MomentumConfig(StrategyConfig):
    """Configuration for Momentum Strategy."""

    instrument_id: str
    bar_type: str
    lookback_period: int = 20  # Period for momentum calculation
    momentum_threshold: float = 0.02  # 2% momentum threshold
    trade_size: Decimal = Decimal("0.01")
    max_positions: int = 1
    stop_loss_pct: float = 0.02
    take_profit_pct: float = 0.05  # Higher take profit for trend following


class MomentumStrategy(Strategy):
    """
    Momentum Strategy implementation.

    Trading signals:
    - Buy signal: Positive momentum above threshold
    - Sell signal: Negative momentum or momentum reversal
    """

    def __init__(self, config: MomentumConfig) -> None:
        super().__init__(config)

        # Configuration
        self.instrument_id = InstrumentId.from_str(config.instrument_id)
        self.bar_type = BarType.from_str(config.bar_type)
        self.lookback_period = config.lookback_period
        self.momentum_threshold = config.momentum_threshold
        self.trade_size = config.trade_size
        self.max_positions = config.max_positions
        self.stop_loss_pct = config.stop_loss_pct
        self.take_profit_pct = config.take_profit_pct

        # State
        self.instrument: Optional[Instrument] = None
        self.price_history: List[float] = []
        self.momentum: Optional[float] = None
        self.position_count = 0

    def on_start(self) -> None:
        """Actions to be performed on strategy start."""
        self.instrument = self.cache.instrument(self.instrument_id)
        if self.instrument is None:
            self.log.error(f"Could not find instrument for {self.instrument_id}")
            self.stop()
            return

        # Subscribe to market data
        self.subscribe_bars(self.bar_type)

        self.log.info(
            f"Momentum Strategy started: lookback={self.lookback_period}, threshold={self.momentum_threshold:.2%}",
            color=LogColor.GREEN,
        )

    def on_stop(self) -> None:
        """Actions to be performed on strategy stop."""
        self.unsubscribe_bars(self.bar_type)
        self.close_all_positions(self.instrument_id)
        self.log.info("Momentum Strategy stopped", color=LogColor.RED)

    def on_reset(self) -> None:
        """Actions to be performed on strategy reset."""
        self.price_history.clear()
        self.momentum = None
        self.position_count = 0

    def on_bar(self, bar: Bar) -> None:
        """Handle bar data."""
        self.log.debug(f"Received bar: {bar}")

        # Update price history
        current_price = float(bar.close)
        self.price_history.append(current_price)

        # Keep only lookback_period prices
        if len(self.price_history) > self.lookback_period:
            self.price_history.pop(0)

        # Need enough data for momentum calculation
        if len(self.price_history) < self.lookback_period:
            return

        # Calculate momentum
        old_price = self.price_history[0]
        self.momentum = (current_price - old_price) / old_price

        self.log.debug(f"Momentum: {self.momentum:.4f} ({self.momentum*100:.2f}%)")

        # Check position count
        positions = self.cache.positions_open(venue=None, instrument_id=self.instrument_id)
        self.position_count = len(positions)

        # Trading logic
        if self.position_count == 0:
            # Look for entry signals
            if self.momentum > self.momentum_threshold:
                # Strong positive momentum - buy signal
                self._enter_long()
                self.log.info(
                    f"Strong positive momentum ({self.momentum:.2%} > {self.momentum_threshold:.2%}), entering LONG",
                    color=LogColor.BLUE,
                )
            elif self.momentum < -self.momentum_threshold:
                # Strong negative momentum - potential short signal
                # Skip for spot trading
                self.log.debug(
                    f"Strong negative momentum ({self.momentum:.2%}), skipping SHORT in spot",
                )
        else:
            # Check exit conditions
            for position in positions:
                if position.is_long:
                    # Exit if momentum turns negative or weakens significantly
                    if self.momentum < 0:
                        self._exit_position(position)
                        self.log.info(
                            f"Momentum turned negative ({self.momentum:.2%}), exiting LONG",
                            color=LogColor.YELLOW,
                        )
                    elif self.momentum < self.momentum_threshold / 2:
                        # Momentum weakening
                        self._exit_position(position)
                        self.log.info(
                            f"Momentum weakening ({self.momentum:.2%}), exiting LONG",
                            color=LogColor.YELLOW,
                        )

    def _enter_long(self) -> None:
        """Enter a long position."""
        if not self.instrument:
            return

        if self.position_count >= self.max_positions:
            return

        order = self.order_factory.market(
            instrument_id=self.instrument_id,
            order_side=OrderSide.BUY,
            quantity=self.instrument.make_qty(self.trade_size),
            time_in_force=TimeInForce.IOC,
        )

        self.submit_order(order)

        self.log.info(
            f"Entering LONG position: size={self.trade_size}, momentum={self.momentum:.2%}",
            color=LogColor.BLUE,
        )

    def _exit_position(self, position) -> None:
        """Exit a position."""
        if position.is_long:
            order = self.order_factory.market(
                instrument_id=self.instrument_id,
                order_side=OrderSide.SELL,
                quantity=position.quantity,
                time_in_force=TimeInForce.IOC,
            )
        else:
            order = self.order_factory.market(
                instrument_id=self.instrument_id,
                order_side=OrderSide.BUY,
                quantity=position.quantity,
                time_in_force=TimeInForce.IOC,
            )

        self.submit_order(order)

        self.log.info(
            f"Exiting position: size={position.quantity}, momentum={self.momentum:.2%}",
            color=LogColor.YELLOW,
        )

    def on_data(self, data: Data) -> None:
        """Handle generic data."""
        pass

    def on_event(self, event: Event) -> None:
        """Handle generic events."""
        pass