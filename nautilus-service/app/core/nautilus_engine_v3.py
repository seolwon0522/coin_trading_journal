"""
Nautilus Trading Engine V3 - Best Practice Implementation
Following Nautilus Trader official patterns and standards
"""

import asyncio
import logging
from decimal import Decimal
from typing import Dict, Optional, List, Any, Set
from pathlib import Path
import os
from dotenv import load_dotenv

from nautilus_trader.adapters.binance.common.enums import BinanceAccountType
from nautilus_trader.adapters.binance.config import BinanceDataClientConfig, BinanceExecClientConfig
from nautilus_trader.adapters.binance.factories import BinanceLiveDataClientFactory, BinanceLiveExecClientFactory
from nautilus_trader.config import (
    TradingNodeConfig,
    LiveDataEngineConfig,
    LiveExecEngineConfig,
    LiveRiskEngineConfig,
    CacheConfig,
    MessageBusConfig,
    LoggingConfig,
    DatabaseConfig,
)
from nautilus_trader.live.node import TradingNode
from nautilus_trader.model.identifiers import TraderId, StrategyId, Venue, AccountId
from nautilus_trader.model.data import QuoteTick, TradeTick, Bar
from nautilus_trader.model.events import OrderFilled
from nautilus_trader.model.instruments import Instrument
from nautilus_trader.model.enums import AccountType
from nautilus_trader.trading.strategy import Strategy
from nautilus_trader.cache.cache import Cache
from nautilus_trader.portfolio.portfolio import Portfolio

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class NautilusStrategy(Strategy):
    """
    Best Practice Nautilus Trading Strategy Implementation
    """

    def __init__(self, strategy_id: str, config: Dict[str, Any]):
        """
        Initialize strategy with proper Nautilus patterns
        """
        super().__init__()
        self.config = config
        self._is_running = False
        self.subscribed_instruments: Set[str] = set()

    def on_start(self):
        """
        Called when strategy starts - Nautilus best practice
        """
        self.log.info(f"Strategy {self.id} starting")
        self._is_running = True

        # Subscribe to instruments using cache
        if "instruments" in self.config:
            for symbol in self.config["instruments"]:
                self.log.info(f"Strategy subscribing to {symbol}")
                self.subscribed_instruments.add(symbol)

    def on_stop(self):
        """
        Called when strategy stops - Nautilus best practice
        """
        self.log.info(f"Strategy {self.id} stopping")
        self._is_running = False

        # Cleanup subscriptions
        self.subscribed_instruments.clear()

    def on_reset(self):
        """
        Reset strategy state - Nautilus best practice
        """
        self.log.info(f"Strategy {self.id} resetting")
        self._is_running = False
        self.subscribed_instruments.clear()

    def on_dispose(self):
        """
        Dispose strategy resources - Nautilus best practice
        """
        self.log.info(f"Strategy {self.id} disposing")
        self.on_reset()

    def on_quote_tick(self, tick: QuoteTick):
        """Handle quote tick - best practice pattern"""
        if not self._is_running:
            return

        self.log.debug(f"Quote tick: {tick.instrument_id} bid={tick.bid_price} ask={tick.ask_price}")

    def on_trade_tick(self, tick: TradeTick):
        """Handle trade tick - best practice pattern"""
        if not self._is_running:
            return

        self.log.debug(f"Trade tick: {tick.instrument_id} price={tick.price} size={tick.size}")

    def on_bar(self, bar: Bar):
        """Handle bar - best practice pattern"""
        if not self._is_running:
            return

        self.log.debug(f"Bar: {bar.bar_type} OHLCV={bar.open},{bar.high},{bar.low},{bar.close},{bar.volume}")

    def on_order_filled(self, event: OrderFilled):
        """Handle order fill - best practice pattern"""
        self.log.info(f"Order filled: {event.client_order_id} qty={event.last_qty} price={event.last_px}")

    @property
    def is_running(self) -> bool:
        """Check if strategy is running"""
        return self._is_running


class NautilusEngineV3:
    """
    Nautilus Trading Engine V3 - Following Best Practices
    """

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize with Nautilus best practices
        """
        self.node: Optional[TradingNode] = None
        self.strategies: Dict[str, Strategy] = {}
        self.is_running = False
        self.config_path = config_path or "config/live.yaml"
        self._config = None
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

        # Cache references for best practice access
        self._cache: Optional[Cache] = None
        self._portfolio: Optional[Portfolio] = None

    def _create_config(self) -> TradingNodeConfig:
        """
        Create Nautilus configuration following best practices
        """
        # Get environment variables
        testnet = os.getenv("BINANCE_TESTNET", "true").lower() == "true"
        api_key = os.getenv("BINANCE_API_KEY", "")
        api_secret = os.getenv("BINANCE_API_SECRET", "")
        use_redis = os.getenv("USE_REDIS", "false").lower() == "true"  # Default to false for simplicity

        logger.info(f"Creating Nautilus config - Testnet: {testnet}, Redis: {use_redis}")

        # Create data directories
        catalog_path = Path("./data/catalog")
        catalog_path.mkdir(parents=True, exist_ok=True)

        # Binance configuration - best practice for testnet
        if testnet:
            base_url_http = "https://testnet.binance.vision"
            base_url_ws = "wss://testnet.binance.vision"
        else:
            base_url_http = "https://api.binance.com"
            base_url_ws = "wss://stream.binance.com:9443"

        binance_data_config = BinanceDataClientConfig(
            api_key=api_key,
            api_secret=api_secret,
            account_type=BinanceAccountType.SPOT,
            base_url_http=base_url_http,
            base_url_ws=base_url_ws,
            us=False,
            testnet=testnet,
        )

        binance_exec_config = BinanceExecClientConfig(
            api_key=api_key,
            api_secret=api_secret,
            account_type=BinanceAccountType.SPOT,
            base_url_http=base_url_http,
            base_url_ws=base_url_ws,
            us=False,
            testnet=testnet,
        )

        # Database configuration
        cache_database = None
        message_bus_database = None

        if use_redis:
            redis_host = os.getenv("REDIS_HOST", "localhost")
            redis_port = int(os.getenv("REDIS_PORT", "6379"))

            cache_database = DatabaseConfig(
                type="redis",
                host=redis_host,
                port=redis_port,
            )

            message_bus_database = DatabaseConfig(
                type="redis",
                host=redis_host,
                port=redis_port,
            )

        # Trading node configuration - best practice settings
        return TradingNodeConfig(
            trader_id=TraderId(os.getenv("TRADER_ID", "TRADER-001")),

            logging=LoggingConfig(
                log_level=os.getenv("LOG_LEVEL", "INFO"),
                log_colors=True,
            ),

            cache=CacheConfig(
                database=cache_database,
                flush_on_start=False,
            ),

            message_bus=MessageBusConfig(
                database=message_bus_database,
                encoding="msgpack",
            ),

            data_engine=LiveDataEngineConfig(
                debug=os.getenv("DEBUG", "false").lower() == "true",
            ),

            exec_engine=LiveExecEngineConfig(
                reconciliation=True,
                load_cache=True,
            ),

            risk_engine=LiveRiskEngineConfig(
                bypass=False,
                debug=os.getenv("DEBUG", "false").lower() == "true",
            ),

            data_clients={
                "BINANCE": binance_data_config,
            },

            exec_clients={
                "BINANCE": binance_exec_config,
            },

            timeout_connection=30.0,
            timeout_reconciliation=10.0,
            timeout_portfolio=10.0,
            timeout_disconnection=10.0,
            timeout_post_stop=5.0,
        )

    async def initialize(self):
        """
        Initialize following Nautilus best practices
        """
        try:
            # Create configuration
            self._config = self._create_config()

            # Create trading node
            self.node = TradingNode(config=self._config)

            # Add client factories
            self.node.add_data_client_factory("BINANCE", BinanceLiveDataClientFactory)
            self.node.add_exec_client_factory("BINANCE", BinanceLiveExecClientFactory)

            # Build the node
            self.node.build()

            # Store references for best practice access
            self._cache = self.node.cache
            self._portfolio = self.node.portfolio

            logger.info("Nautilus Trading Node initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Nautilus: {e}")
            raise

    async def start(self):
        """
        Start engine following best practices
        """
        if not self.node:
            await self.initialize()

        try:
            self._stop_event.clear()

            # Start node in background
            self._task = asyncio.create_task(self._run_node())

            # Mark as running
            self.is_running = True

            logger.info("Nautilus Engine started")

            # Wait for startup
            await asyncio.sleep(2)

        except Exception as e:
            logger.error(f"Failed to start engine: {e}")
            raise

    async def _run_node(self):
        """
        Run node with proper async handling
        """
        try:
            logger.info("Running TradingNode")
            await self.node.run_async()
        except asyncio.CancelledError:
            logger.info("TradingNode task cancelled")
        except Exception as e:
            logger.error(f"Error in TradingNode: {e}")
            raise

    async def stop(self):
        """
        Stop engine following best practices
        """
        if not self.is_running:
            return

        try:
            logger.info("Stopping Nautilus Engine")

            # Stop the node
            if self.node:
                self.node.stop()

            # Cancel background task
            if self._task and not self._task.done():
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass

            self.is_running = False
            logger.info("Nautilus Engine stopped")

        except Exception as e:
            logger.error(f"Error stopping engine: {e}")
            raise

    async def dispose(self):
        """
        Dispose engine following best practices
        """
        try:
            # Stop if running
            if self.is_running:
                await self.stop()

            # Dispose node
            if self.node:
                self.node.dispose()
                self.node = None

            # Clear references
            self._cache = None
            self._portfolio = None
            self.strategies.clear()

            logger.info("Nautilus Engine disposed")

        except Exception as e:
            logger.error(f"Error disposing engine: {e}")
            raise

    def add_strategy(self, strategy_type: str, strategy_id: str, config: Dict[str, Any]) -> str:
        """
        Add strategy following best practices
        """
        if not self.node:
            raise RuntimeError("Engine not initialized")

        # Create strategy instance
        strategy = NautilusStrategy(strategy_id, config)

        # Add to trader
        self.node.trader.add_strategy(strategy)
        self.strategies[strategy_id] = strategy

        logger.info(f"Strategy {strategy_id} added")
        return strategy_id

    def remove_strategy(self, strategy_id: str) -> bool:
        """
        Remove strategy following best practices
        """
        if strategy_id not in self.strategies:
            return False

        strategy = self.strategies[strategy_id]

        if self.node:
            # Stop strategy first
            if strategy.is_running:
                self.node.trader.stop_strategy(strategy)

            # Remove from trader
            self.node.trader.remove_strategy(strategy)

        del self.strategies[strategy_id]
        logger.info(f"Strategy {strategy_id} removed")
        return True

    def start_strategy(self, strategy_id: str) -> bool:
        """
        Start strategy following best practices
        """
        if strategy_id not in self.strategies:
            return False

        strategy = self.strategies[strategy_id]

        if self.node and self.is_running:
            self.node.trader.start_strategy(strategy)
            logger.info(f"Strategy {strategy_id} started")
            return True

        return False

    def stop_strategy(self, strategy_id: str) -> bool:
        """
        Stop strategy following best practices
        """
        if strategy_id not in self.strategies:
            return False

        strategy = self.strategies[strategy_id]

        if self.node:
            self.node.trader.stop_strategy(strategy)
            logger.info(f"Strategy {strategy_id} stopped")
            return True

        return False

    def get_portfolio_status(self) -> Dict[str, Any]:
        """
        Get portfolio status following Nautilus best practices
        """
        if not self.node or not self._cache:
            return {"status": "not_initialized"}

        # Use cache to get accounts
        balances = {}
        accounts = self._cache.accounts() if hasattr(self._cache, 'accounts') else []

        for account in accounts:
            if not account:
                continue

            account_balances = {}

            # Get balances for each currency
            for currency in account.currencies():
                balance = account.balance(currency)
                if balance:
                    account_balances[str(currency)] = {
                        "total": float(balance.total.as_double()),
                        "free": float(balance.free.as_double()) if balance.free else 0.0,
                        "locked": float(balance.locked.as_double()) if balance.locked else 0.0,
                    }

            if account_balances:
                balances[str(account.id)] = account_balances

        # Get positions from cache
        positions_data = []
        positions = self._cache.positions_open()
        for position in positions:
            positions_data.append({
                "symbol": str(position.instrument_id),
                "side": str(position.side),
                "quantity": float(position.quantity.as_double()),
                "entry_price": float(position.avg_px_open.as_double()) if position.avg_px_open else None,
                "unrealized_pnl": float(position.unrealized_pnl.as_double()) if position.unrealized_pnl else 0.0,
            })

        return {
            "status": "running" if self.is_running else "stopped",
            "node_status": self.node.is_running if self.node else False,
            "strategies_count": len(self.strategies),
            "active_strategies": sum(1 for s in self.strategies.values() if s.is_running),
            "accounts": [str(acc.id) for acc in accounts] if accounts else [],
            "balances": balances,
            "positions": positions_data,
            "open_orders": len(list(self._cache.orders_open())) if self._cache else 0,
        }

    def get_risk_metrics(self) -> Dict[str, Any]:
        """
        Get risk metrics following best practices
        """
        if not self.node:
            return {}

        # Get risk engine from trader
        risk_engine = self.node.trader.risk_engine if hasattr(self.node.trader, 'risk_engine') else None

        # Calculate portfolio metrics
        total_equity = 0.0

        if self._cache:
            accounts = self._cache.accounts() if hasattr(self._cache, 'accounts') else []
            for account in accounts:
                if account:
                    for currency in account.currencies():
                        balance = account.balance(currency)
                        if balance:
                            total_equity += float(balance.total.as_double())

        metrics = {
            "engine_config": {
                "bypass_mode": risk_engine.config.bypass if risk_engine and hasattr(risk_engine.config, 'bypass') else False,
            },
            "portfolio_metrics": {
                "total_equity": total_equity,
                "position_count": len(list(self._cache.positions_open())) if self._cache else 0,
                "order_count": len(list(self._cache.orders_open())) if self._cache else 0,
            },
            "risk_limits": {
                "max_position_size": float(os.getenv("MAX_POSITION_SIZE", "10000")),
                "max_order_size": float(os.getenv("MAX_ORDER_SIZE", "1000")),
                "max_drawdown": float(os.getenv("MAX_DRAWDOWN", "0.20")),
            }
        }

        return metrics

    def get_strategy_info(self, strategy_id: str) -> Dict[str, Any]:
        """
        Get strategy info following best practices
        """
        if strategy_id not in self.strategies:
            return {"error": "Strategy not found"}

        strategy = self.strategies[strategy_id]

        return {
            "strategy_id": strategy_id,
            "is_running": strategy.is_running,
            "config": strategy.config,
            "subscribed_instruments": list(strategy.subscribed_instruments),
        }

    def get_active_orders(self, strategy_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get active orders following best practices
        """
        if not self._cache:
            return []

        orders = []
        for order in self._cache.orders_open():
            # Filter by strategy if specified
            if strategy_id and str(order.strategy_id) != strategy_id:
                continue

            orders.append({
                "order_id": str(order.client_order_id),
                "strategy_id": str(order.strategy_id) if order.strategy_id else None,
                "symbol": str(order.instrument_id),
                "side": str(order.side),
                "type": str(order.order_type),
                "quantity": float(order.quantity.as_double()),
                "price": float(order.price.as_double()) if hasattr(order, 'price') and order.price else None,
                "status": str(order.status),
            })

        return orders

    def get_positions(self, strategy_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get positions following best practices
        """
        if not self._cache:
            return []

        positions = []
        for position in self._cache.positions_open():
            # Filter by strategy if specified
            if strategy_id and str(position.strategy_id) != strategy_id:
                continue

            positions.append({
                "position_id": str(position.id),
                "strategy_id": str(position.strategy_id) if position.strategy_id else None,
                "symbol": str(position.instrument_id),
                "side": str(position.side),
                "quantity": float(position.quantity.as_double()),
                "entry_price": float(position.avg_px_open.as_double()) if position.avg_px_open else None,
                "unrealized_pnl": float(position.unrealized_pnl.as_double()) if position.unrealized_pnl else 0.0,
            })

        return positions