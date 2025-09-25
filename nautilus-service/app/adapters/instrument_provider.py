"""
Instrument Provider - Binance to Nautilus Instrument Mapping
Handles instrument loading and symbol mapping
"""

import asyncio
import logging
from typing import Dict, List, Optional, Set
from decimal import Decimal

from nautilus_trader.adapters.binance.spot.providers import BinanceSpotInstrumentProvider
from nautilus_trader.adapters.binance.futures.providers import BinanceFuturesInstrumentProvider
from nautilus_trader.adapters.binance.common.enums import BinanceAccountType
from nautilus_trader.model.identifiers import InstrumentId, Symbol, Venue
from nautilus_trader.model.instruments import CurrencyPair, CryptoFuture
from nautilus_trader.model.objects import Price, Quantity, Money
from nautilus_trader.model.currencies import Currency
from nautilus_trader.model.enums import AssetClass

logger = logging.getLogger(__name__)


class BinanceInstrumentManager:
    """
    Manages Binance instruments and provides mapping between
    Binance symbols and Nautilus InstrumentIds
    """

    def __init__(self, account_type: BinanceAccountType = BinanceAccountType.SPOT, testnet: bool = True):
        self.account_type = account_type
        self.testnet = testnet
        self.venue = Venue("BINANCE")

        # Symbol mappings
        self._binance_to_nautilus: Dict[str, InstrumentId] = {}
        self._nautilus_to_binance: Dict[InstrumentId, str] = {}

        # Instrument cache
        self._instruments: Dict[InstrumentId, Any] = {}

        # Popular trading pairs for quick access
        self.popular_symbols = [
            "BTCUSDT",
            "ETHUSDT",
            "BNBUSDT",
            "SOLUSDT",
            "XRPUSDT",
            "DOGEUSDT",
            "ADAUSDT",
            "AVAXUSDT",
            "DOTUSDT",
            "MATICUSDT",
        ]

        # Provider instance
        self._provider = None

    async def initialize(self, client=None):
        """
        Initialize the instrument provider
        """
        try:
            if self.account_type == BinanceAccountType.SPOT:
                self._provider = BinanceSpotInstrumentProvider(
                    client=client,
                    config=None,
                )
            else:
                self._provider = BinanceFuturesInstrumentProvider(
                    client=client,
                    config=None,
                )

            logger.info(f"Instrument provider initialized for {self.account_type.value}")

        except Exception as e:
            logger.error(f"Failed to initialize instrument provider: {e}")
            raise

    async def load_all_instruments(self):
        """
        Load all available instruments from Binance
        """
        if not self._provider:
            raise RuntimeError("Provider not initialized")

        try:
            # Load instruments from provider
            await self._provider.load_all_async()

            # Get all instruments
            instruments = self._provider.get_all()

            for instrument in instruments:
                self._instruments[instrument.id] = instrument

                # Create symbol mappings
                binance_symbol = str(instrument.id.symbol)
                self._binance_to_nautilus[binance_symbol] = instrument.id
                self._nautilus_to_binance[instrument.id] = binance_symbol

            logger.info(f"Loaded {len(self._instruments)} instruments from Binance")

        except Exception as e:
            logger.error(f"Failed to load instruments: {e}")
            raise

    async def load_popular_instruments(self):
        """
        Load only popular trading instruments for faster startup
        """
        if not self._provider:
            raise RuntimeError("Provider not initialized")

        try:
            loaded_count = 0

            for symbol in self.popular_symbols:
                try:
                    # Load specific instrument
                    instrument_id = self.symbol_to_instrument_id(symbol)
                    await self._provider.load_async(instrument_id)

                    instrument = self._provider.find(instrument_id)
                    if instrument:
                        self._instruments[instrument.id] = instrument
                        self._binance_to_nautilus[symbol] = instrument.id
                        self._nautilus_to_binance[instrument.id] = symbol
                        loaded_count += 1

                except Exception as e:
                    logger.warning(f"Failed to load {symbol}: {e}")

            logger.info(f"Loaded {loaded_count} popular instruments")

        except Exception as e:
            logger.error(f"Failed to load popular instruments: {e}")
            raise

    def symbol_to_instrument_id(self, binance_symbol: str) -> InstrumentId:
        """
        Convert Binance symbol to Nautilus InstrumentId

        Args:
            binance_symbol: Binance symbol (e.g., "BTCUSDT")

        Returns:
            InstrumentId for Nautilus
        """
        # Check cache first
        if binance_symbol in self._binance_to_nautilus:
            return self._binance_to_nautilus[binance_symbol]

        # Create new InstrumentId
        instrument_id = InstrumentId(
            symbol=Symbol(binance_symbol),
            venue=self.venue,
        )

        # Cache the mapping
        self._binance_to_nautilus[binance_symbol] = instrument_id
        self._nautilus_to_binance[instrument_id] = binance_symbol

        return instrument_id

    def instrument_id_to_symbol(self, instrument_id: InstrumentId) -> str:
        """
        Convert Nautilus InstrumentId to Binance symbol

        Args:
            instrument_id: Nautilus InstrumentId

        Returns:
            Binance symbol string
        """
        if instrument_id in self._nautilus_to_binance:
            return self._nautilus_to_binance[instrument_id]

        # Extract symbol from InstrumentId
        return str(instrument_id.symbol)

    def get_instrument(self, instrument_id: InstrumentId):
        """
        Get instrument by InstrumentId
        """
        return self._instruments.get(instrument_id)

    def get_instrument_by_symbol(self, binance_symbol: str):
        """
        Get instrument by Binance symbol
        """
        instrument_id = self.symbol_to_instrument_id(binance_symbol)
        return self._instruments.get(instrument_id)

    def list_available_symbols(self) -> List[str]:
        """
        List all available Binance symbols
        """
        return list(self._binance_to_nautilus.keys())

    def list_available_instruments(self) -> List[InstrumentId]:
        """
        List all available Nautilus InstrumentIds
        """
        return list(self._instruments.keys())

    def create_test_instrument(self, symbol: str = "BTCUSDT") -> CurrencyPair:
        """
        Create a test instrument for development
        """
        # Parse symbol (assumes format like BTCUSDT)
        if symbol.endswith("USDT"):
            base_currency = symbol[:-4]
            quote_currency = "USDT"
        elif symbol.endswith("BUSD"):
            base_currency = symbol[:-4]
            quote_currency = "BUSD"
        elif symbol.endswith("BTC"):
            base_currency = symbol[:-3]
            quote_currency = "BTC"
        else:
            raise ValueError(f"Cannot parse symbol: {symbol}")

        # Use existing common currencies or get from string
        # Nautilus has pre-defined common currencies
        try:
            base = Currency.from_str(base_currency)
        except:
            # If not found, use a simple currency code
            base = Currency.from_str(f"{base_currency}=8")  # 8 decimal precision

        try:
            quote = Currency.from_str(quote_currency)
        except:
            # If not found, use a simple currency code
            quote = Currency.from_str(f"{quote_currency}=8")  # 8 decimal precision

        # Create instrument
        instrument = CurrencyPair(
            instrument_id=InstrumentId(
                symbol=Symbol(symbol),
                venue=self.venue,
            ),
            raw_symbol=Symbol(symbol),
            base_currency=base,
            quote_currency=quote,
            price_precision=2,
            size_precision=5,
            price_increment=Price.from_str("0.01"),
            size_increment=Quantity.from_str("0.00001"),
            lot_size=None,
            max_quantity=Quantity.from_str("9000.00000"),
            min_quantity=Quantity.from_str("0.00001"),
            max_notional=None,
            min_notional=Money(10.0, quote) if quote_currency == "USDT" else None,
            max_price=Price.from_str("1000000.00"),
            min_price=Price.from_str("0.01"),
            margin_init=Decimal("0"),
            margin_maint=Decimal("0"),
            maker_fee=Decimal("0.001"),
            taker_fee=Decimal("0.001"),
            ts_event=0,
            ts_init=0,
        )

        # Cache the instrument
        self._instruments[instrument.id] = instrument
        self._binance_to_nautilus[symbol] = instrument.id
        self._nautilus_to_binance[instrument.id] = symbol

        return instrument

    def get_price_precision(self, instrument_id: InstrumentId) -> int:
        """
        Get price precision for an instrument
        """
        instrument = self.get_instrument(instrument_id)
        if instrument and hasattr(instrument, "price_precision"):
            return instrument.price_precision
        return 2  # Default

    def get_size_precision(self, instrument_id: InstrumentId) -> int:
        """
        Get size precision for an instrument
        """
        instrument = self.get_instrument(instrument_id)
        if instrument and hasattr(instrument, "size_precision"):
            return instrument.size_precision
        return 5  # Default

    def get_min_notional(self, instrument_id: InstrumentId) -> Optional[Money]:
        """
        Get minimum notional value for an instrument
        """
        instrument = self.get_instrument(instrument_id)
        if instrument and hasattr(instrument, "min_notional"):
            return instrument.min_notional
        return None

    def validate_order_quantity(self, instrument_id: InstrumentId, quantity: Decimal) -> bool:
        """
        Validate if order quantity meets instrument requirements
        """
        instrument = self.get_instrument(instrument_id)
        if not instrument:
            return True  # Allow if instrument not found

        # Check min/max quantity
        if hasattr(instrument, "min_quantity") and instrument.min_quantity:
            if quantity < instrument.min_quantity.as_decimal():
                return False

        if hasattr(instrument, "max_quantity") and instrument.max_quantity:
            if quantity > instrument.max_quantity.as_decimal():
                return False

        return True

    def validate_order_price(self, instrument_id: InstrumentId, price: Decimal) -> bool:
        """
        Validate if order price meets instrument requirements
        """
        instrument = self.get_instrument(instrument_id)
        if not instrument:
            return True  # Allow if instrument not found

        # Check min/max price
        if hasattr(instrument, "min_price") and instrument.min_price:
            if price < instrument.min_price.as_decimal():
                return False

        if hasattr(instrument, "max_price") and instrument.max_price:
            if price > instrument.max_price.as_decimal():
                return False

        return True


# Global instance
instrument_manager = BinanceInstrumentManager()