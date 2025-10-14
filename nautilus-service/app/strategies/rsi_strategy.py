"""
RSI Strategy for Nautilus Trader
RSI 기반 과매수/과매도 전략
"""

from decimal import Decimal
from typing import Optional

from nautilus_trader.common.enums import LogColor
from nautilus_trader.config import StrategyConfig
from nautilus_trader.core.data import Data
from nautilus_trader.core.message import Event
from nautilus_trader.indicators import RelativeStrengthIndex
from nautilus_trader.model.data import Bar, BarType
from nautilus_trader.model.enums import OrderSide, TimeInForce
from nautilus_trader.model.identifiers import InstrumentId
from nautilus_trader.model.instruments import Instrument
from nautilus_trader.trading.strategy import Strategy


class RSIConfig(StrategyConfig, kw_only=True):
    """Configuration for RSI Strategy."""

    instrument_id: str
    bar_type: str
    order_id_tag: str = "001"
    rsi_period: int = 14
    rsi_overbought: int = 70
    rsi_oversold: int = 30
    trade_size: Decimal = Decimal("0.01")
    max_positions: int = 1
    stop_loss_pct: float = 0.02  # 2% stop loss
    take_profit_pct: float = 0.03  # 3% take profit


class RSIStrategy(Strategy):
    """
    RSI Strategy implementation.

    Trading signals:
    - Buy signal: RSI < oversold level (30)
    - Sell signal: RSI > overbought level (70)
    """

    def __init__(self, config: RSIConfig) -> None:
        super().__init__(config)

        # Configuration
        self.instrument_id = InstrumentId.from_str(config.instrument_id)
        self.bar_type = BarType.from_str(config.bar_type)
        self.rsi_period = config.rsi_period
        self.rsi_overbought = config.rsi_overbought
        self.rsi_oversold = config.rsi_oversold
        self.trade_size = config.trade_size
        self.max_positions = config.max_positions
        self.stop_loss_pct = config.stop_loss_pct
        self.take_profit_pct = config.take_profit_pct

        # Indicators
        self.rsi: Optional[RelativeStrengthIndex] = None

        # State
        self.instrument: Optional[Instrument] = None
        self.last_rsi_value: Optional[float] = None
        self.position_count = 0

    def on_start(self) -> None:
        """Actions to be performed on strategy start."""
        self.instrument = self.cache.instrument(self.instrument_id)
        if self.instrument is None:
            self.log.error(f"Could not find instrument for {self.instrument_id}")
            self.stop()
            return

        # Initialize RSI indicator
        self.rsi = RelativeStrengthIndex(self.rsi_period)

        # Subscribe to market data
        self.subscribe_bars(self.bar_type)

        self.log.info(
            f"RSI Strategy started: period={self.rsi_period}, "
            f"overbought={self.rsi_overbought}, oversold={self.rsi_oversold}",
            color=LogColor.GREEN,
        )

    def on_stop(self) -> None:
        """Actions to be performed on strategy stop."""
        self.unsubscribe_bars(self.bar_type)

        # Close all positions
        self.close_all_positions(self.instrument_id)

        self.log.info("RSI Strategy stopped", color=LogColor.RED)

    def on_reset(self) -> None:
        """Actions to be performed on strategy reset."""
        if self.rsi:
            self.rsi.reset()
        self.last_rsi_value = None
        self.position_count = 0

    def on_bar(self, bar: Bar) -> None:
        """Handle bar data."""
        self.log.debug(f"Received bar: {bar}")

        # Update RSI indicator
        self.rsi.handle_bar(bar)

        # Check if RSI is ready
        if not self.rsi.initialized:
            return

        current_rsi = self.rsi.value

        # Log RSI value periodically
        self.log.debug(f"RSI: {current_rsi:.2f}")

        # Check position count
        positions = self.cache.positions_open(venue=None, instrument_id=self.instrument_id)
        self.position_count = len(positions)

        # Trading logic
        if self.position_count == 0:
            # Look for entry signals
            if current_rsi < self.rsi_oversold:
                # Oversold - potential buy signal
                self._enter_long(bar.close)
                self.log.info(
                    f"RSI oversold ({current_rsi:.2f} < {self.rsi_oversold}), entering LONG",
                    color=LogColor.BLUE,
                )
            elif current_rsi > self.rsi_overbought:
                # Overbought - potential short signal (if enabled)
                # For now, we'll skip shorting in spot markets
                self.log.info(
                    f"RSI overbought ({current_rsi:.2f} > {self.rsi_overbought}), skipping SHORT in spot",
                    color=LogColor.YELLOW,
                )
        else:
            # Check exit conditions for existing positions
            for position in positions:
                if position.is_long and current_rsi > self.rsi_overbought:
                    # Exit long position on overbought
                    self._exit_position(position)
                    self.log.info(
                        f"RSI overbought ({current_rsi:.2f} > {self.rsi_overbought}), exiting LONG",
                        color=LogColor.YELLOW,
                    )
                # Add more exit conditions as needed

        self.last_rsi_value = current_rsi

    def _enter_long(self, entry_price) -> None:
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

        # Optional: Set stop-loss and take-profit orders
        # This would require limit orders or stop orders
        # depending on exchange support

        rsi_val = self.last_rsi_value if self.last_rsi_value is not None else 0.0
        self.log.info(
            f"Entering LONG position: size={self.trade_size}, RSI={rsi_val:.2f}",
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
            f"Exiting position: size={position.quantity}, RSI={self.last_rsi_value:.2f}",
            color=LogColor.YELLOW,
        )

    def on_data(self, data: Data) -> None:
        """Handle generic data."""
        pass

    def on_event(self, event: Event) -> None:
        """Handle generic events."""
        pass
