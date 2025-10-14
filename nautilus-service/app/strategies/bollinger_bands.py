"""
Bollinger Bands Strategy for Nautilus Trader
볼린저 밴드 평균회귀 전략
"""

from decimal import Decimal
from typing import Optional

from nautilus_trader.common.enums import LogColor
from nautilus_trader.config import StrategyConfig
from nautilus_trader.core.data import Data
from nautilus_trader.core.message import Event
from nautilus_trader.model.data import Bar, BarType
from nautilus_trader.model.enums import OrderSide, TimeInForce
from nautilus_trader.model.identifiers import InstrumentId
from nautilus_trader.model.instruments import Instrument
from nautilus_trader.trading.strategy import Strategy
from nautilus_trader.indicators import BollingerBands


class BollingerBandsConfig(StrategyConfig, kw_only=True):
    """Configuration for Bollinger Bands Strategy."""

    instrument_id: str
    bar_type: str
    order_id_tag: str = "001"
    bb_period: int = 20
    bb_std: float = 2.0
    trade_size: Decimal = Decimal("0.01")
    max_positions: int = 1
    stop_loss_pct: float = 0.02
    take_profit_pct: float = 0.03


class BollingerBandsStrategy(Strategy):
    """
    Bollinger Bands Strategy implementation.

    Trading signals:
    - Buy signal: Price touches lower band
    - Sell signal: Price touches upper band
    """

    def __init__(self, config: BollingerBandsConfig) -> None:
        super().__init__(config)

        # Configuration
        self.instrument_id = InstrumentId.from_str(config.instrument_id)
        self.bar_type = BarType.from_str(config.bar_type)
        self.bb_period = config.bb_period
        self.bb_std = config.bb_std
        self.trade_size = config.trade_size
        self.max_positions = config.max_positions
        self.stop_loss_pct = config.stop_loss_pct
        self.take_profit_pct = config.take_profit_pct

        # Indicators
        self.bb: Optional[BollingerBands] = None

        # State
        self.instrument: Optional[Instrument] = None
        self.position_count = 0

    def on_start(self) -> None:
        """Actions to be performed on strategy start."""
        self.instrument = self.cache.instrument(self.instrument_id)
        if self.instrument is None:
            self.log.error(f"Could not find instrument for {self.instrument_id}")
            self.stop()
            return

        # Initialize Bollinger Bands indicator
        self.bb = BollingerBands(self.bb_period, self.bb_std)

        # Subscribe to market data
        self.subscribe_bars(self.bar_type)

        self.log.info(
            f"Bollinger Bands Strategy started: period={self.bb_period}, std={self.bb_std}",
            color=LogColor.GREEN,
        )

    def on_stop(self) -> None:
        """Actions to be performed on strategy stop."""
        self.unsubscribe_bars(self.bar_type)
        self.close_all_positions(self.instrument_id)
        self.log.info("Bollinger Bands Strategy stopped", color=LogColor.RED)

    def on_reset(self) -> None:
        """Actions to be performed on strategy reset."""
        if self.bb:
            self.bb.reset()
        self.position_count = 0

    def on_bar(self, bar: Bar) -> None:
        """Handle bar data."""
        self.log.debug(f"Received bar: {bar}")

        # Update indicator
        self.bb.handle_bar(bar)

        # Check if indicator is ready
        if not self.bb.initialized:
            return

        # Get Bollinger Bands values
        upper_band = self.bb.upper
        middle_band = self.bb.middle
        lower_band = self.bb.lower
        current_price = float(bar.close)

        # Check position count
        positions = self.cache.positions_open(venue=None, instrument_id=self.instrument_id)
        self.position_count = len(positions)

        # Trading logic
        if self.position_count == 0:
            # Look for entry signals
            if current_price <= lower_band:
                # Price at lower band - buy signal
                self._enter_long()
                self.log.info(
                    f"Price at lower band ({current_price:.2f} <= {lower_band:.2f}), entering LONG",
                    color=LogColor.BLUE,
                )
            elif current_price >= upper_band:
                # Price at upper band - sell signal (for futures/margin)
                # Skip for spot trading
                self.log.debug(
                    f"Price at upper band ({current_price:.2f} >= {upper_band:.2f}), skipping SHORT in spot",
                )
        else:
            # Check exit conditions
            for position in positions:
                if position.is_long and current_price >= middle_band:
                    # Exit long at middle band
                    self._exit_position(position)
                    self.log.info(
                        f"Price at middle band ({current_price:.2f}), exiting LONG",
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
            f"Entering LONG position: size={self.trade_size}",
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
            f"Exiting position: size={position.quantity}",
            color=LogColor.YELLOW,
        )

    def on_data(self, data: Data) -> None:
        """Handle generic data."""
        pass

    def on_event(self, event: Event) -> None:
        """Handle generic events."""
        pass
