"""
Nautilus Trading Engine - Patched Version for WebSocket 404 Fix
Fixes the listen key WebSocket connection issue
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
from nautilus_trader.model.identifiers import TraderId, StrategyId, Venue
from nautilus_trader.model.data import QuoteTick, TradeTick, Bar
from nautilus_trader.model.events import OrderFilled
from nautilus_trader.trading.strategy import Strategy

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class SimpleStrategy(Strategy):
    """
    Simple Nautilus Trading Strategy - Best Practice Implementation
    """

    def __init__(self, strategy_config: Dict[str, Any] = None):
        """Initialize with Nautilus patterns"""
        super().__init__()
        # Store config separately, not as self.config
        self.strategy_config = strategy_config or {}
        self._is_running = False
        self.subscribed_instruments: Set[str] = set()

    def on_start(self):
        """Called when strategy starts"""
        self.log.info(f"Strategy {self.id} starting")
        self._is_running = True

        # Subscribe to instruments
        if "instruments" in self.strategy_config:
            for symbol in self.strategy_config["instruments"]:
                self.log.info(f"Subscribing to {symbol}")
                self.subscribed_instruments.add(symbol)

    def on_stop(self):
        """Called when strategy stops"""
        self.log.info(f"Strategy {self.id} stopping")
        self._is_running = False
        self.subscribed_instruments.clear()

    def on_reset(self):
        """Reset strategy state"""
        self.log.info(f"Strategy {self.id} resetting")
        self._is_running = False
        self.subscribed_instruments.clear()

    def on_dispose(self):
        """Dispose strategy resources"""
        self.log.info(f"Strategy {self.id} disposing")
        self.on_reset()

    def on_quote_tick(self, tick: QuoteTick):
        """Handle quote tick"""
        if not self._is_running:
            return
        self.log.debug(f"Quote: {tick.instrument_id} bid={tick.bid_price} ask={tick.ask_price}")

    def on_trade_tick(self, tick: TradeTick):
        """Handle trade tick"""
        if not self._is_running:
            return
        self.log.debug(f"Trade: {tick.instrument_id} price={tick.price} size={tick.size}")

    def on_bar(self, bar: Bar):
        """Handle bar"""
        if not self._is_running:
            return
        self.log.debug(f"Bar: {bar.bar_type} OHLCV={bar.open},{bar.high},{bar.low},{bar.close},{bar.volume}")

    def on_order_filled(self, event: OrderFilled):
        """Handle order fill"""
        self.log.info(f"Order filled: {event.client_order_id} qty={event.last_qty} price={event.last_px}")

    @property
    def is_running(self) -> bool:
        """Check if strategy is running"""
        return self._is_running


class NautilusEnginePatched:
    """
    Nautilus Trading Engine - Patched Implementation
    With WebSocket 404 fix
    """

    def __init__(self, config_path: Optional[str] = None):
        """Initialize engine"""
        self.node: Optional[TradingNode] = None
        self.strategies: Dict[str, Strategy] = {}
        self.is_running = False
        self.config_path = config_path or "config/live.yaml"
        self._config = None
        self._task: Optional[asyncio.Task] = None
        self._cache = None
        self._portfolio = None

    def _create_config(self) -> TradingNodeConfig:
        """Create Nautilus configuration with WebSocket fixes"""
        # Get environment variables
        testnet = os.getenv("BINANCE_TESTNET", "true").lower() == "true"
        api_key = os.getenv("BINANCE_API_KEY", "")
        api_secret = os.getenv("BINANCE_API_SECRET", "")
        use_redis = os.getenv("USE_REDIS", "false").lower() == "true"

        logger.info(f"Creating config - Testnet: {testnet}, Redis: {use_redis}")

        # Create data directories
        catalog_path = Path("./data/catalog")
        catalog_path.mkdir(parents=True, exist_ok=True)

        # Binance configuration with FIXED WebSocket URLs
        if testnet:
            base_url_http = "https://testnet.binance.vision"
            # CRITICAL FIX: For testnet, use stream endpoint
            base_url_ws = "wss://testnet.binance.vision/stream"
        else:
            base_url_http = "https://api.binance.com"
            # CRITICAL FIX: For mainnet, no port number and use /stream
            base_url_ws = "wss://stream.binance.com/stream"

        logger.info(f"WebSocket URL configured: {base_url_ws}")

        # Create configs without unsupported parameter
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

        # Trading node configuration
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
        """Initialize engine"""
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

            # Store references
            self._cache = self.node.cache
            self._portfolio = self.node.portfolio

            logger.info("Nautilus Engine initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize: {e}")
            raise

    async def start(self):
        """Start engine"""
        if not self.node:
            await self.initialize()

        try:
            # Start node in background
            self._task = asyncio.create_task(self._run_node())
            self.is_running = True
            logger.info("Nautilus Engine started")
            await asyncio.sleep(2)

        except Exception as e:
            logger.error(f"Failed to start: {e}")
            raise

    async def _run_node(self):
        """Run node"""
        try:
            logger.info("Running TradingNode")
            await self.node.run_async()
        except asyncio.CancelledError:
            logger.info("TradingNode cancelled")
        except Exception as e:
            logger.error(f"Error in TradingNode: {e}")
            raise

    async def stop(self):
        """Stop engine"""
        if not self.is_running:
            return

        try:
            logger.info("Stopping Nautilus Engine")

            if self.node:
                self.node.stop()

            if self._task and not self._task.done():
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass

            self.is_running = False
            logger.info("Nautilus Engine stopped")

        except Exception as e:
            logger.error(f"Error stopping: {e}")
            raise

    async def dispose(self):
        """Dispose engine"""
        try:
            if self.is_running:
                await self.stop()

            if self.node:
                self.node.dispose()
                self.node = None

            self._cache = None
            self._portfolio = None
            self.strategies.clear()

            logger.info("Nautilus Engine disposed")

        except Exception as e:
            logger.error(f"Error disposing: {e}")
            raise

    def add_strategy(self, strategy_type: str, strategy_id: str, config: Dict[str, Any]) -> str:
        """Add strategy"""
        if not self.node:
            raise RuntimeError("Engine not initialized")

        # Create strategy
        strategy = SimpleStrategy(config)

        # Add to trader
        self.node.trader.add_strategy(strategy)
        self.strategies[strategy_id] = strategy

        logger.info(f"Strategy {strategy_id} added")
        return strategy_id

    def remove_strategy(self, strategy_id: str) -> bool:
        """Remove strategy"""
        if strategy_id not in self.strategies:
            return False

        strategy = self.strategies[strategy_id]

        if self.node:
            if strategy.is_running:
                self.node.trader.stop_strategy(strategy)
            self.node.trader.remove_strategy(strategy)

        del self.strategies[strategy_id]
        logger.info(f"Strategy {strategy_id} removed")
        return True

    def start_strategy(self, strategy_id: str) -> bool:
        """Start strategy"""
        if strategy_id not in self.strategies:
            return False

        strategy = self.strategies[strategy_id]

        if self.node and self.is_running:
            self.node.trader.start_strategy(strategy)
            logger.info(f"Strategy {strategy_id} started")
            return True

        return False

    def stop_strategy(self, strategy_id: str) -> bool:
        """Stop strategy"""
        if strategy_id not in self.strategies:
            return False

        strategy = self.strategies[strategy_id]

        if self.node:
            self.node.trader.stop_strategy(strategy)
            logger.info(f"Strategy {strategy_id} stopped")
            return True

        return False

    def get_portfolio_status(self) -> Dict[str, Any]:
        """Get portfolio status"""
        if not self.node or not self._cache:
            return {"status": "not_initialized"}

        # Get account information
        balances = {}

        # Try different ways to access accounts
        try:
            # Method 1: Try cache.accounts()
            if hasattr(self._cache, 'accounts'):
                accounts = self._cache.accounts()
                for account in accounts:
                    if account:
                        account_balances = self._extract_account_balances(account)
                        if account_balances:
                            balances[str(account.id)] = account_balances

            # Method 2: Try portfolio.account
            elif hasattr(self._portfolio, 'account'):
                account = self._portfolio.account
                if account:
                    account_balances = self._extract_account_balances(account)
                    if account_balances:
                        balances["default"] = account_balances

        except Exception as e:
            logger.warning(f"Could not get account balances: {e}")

        # Get positions
        positions_data = []
        try:
            positions = self._cache.positions_open()
            for position in positions:
                positions_data.append({
                    "symbol": str(position.instrument_id),
                    "side": str(position.side),
                    "quantity": float(position.quantity.as_double()),
                    "entry_price": float(position.avg_px_open.as_double()) if position.avg_px_open else None,
                    "unrealized_pnl": float(position.unrealized_pnl.as_double()) if position.unrealized_pnl else 0.0,
                })
        except Exception as e:
            logger.warning(f"Could not get positions: {e}")

        return {
            "status": "running" if self.is_running else "stopped",
            "node_status": self.node.is_running if self.node else False,
            "strategies_count": len(self.strategies),
            "active_strategies": sum(1 for s in self.strategies.values() if s.is_running),
            "balances": balances,
            "positions": positions_data,
            "open_orders": len(list(self._cache.orders_open())) if self._cache else 0,
        }

    def _extract_account_balances(self, account) -> Dict[str, Any]:
        """Extract balances from account"""
        account_balances = {}
        try:
            for currency in account.currencies():
                balance = account.balance(currency)
                if balance:
                    account_balances[str(currency)] = {
                        "total": float(balance.total.as_double()),
                        "free": float(balance.free.as_double()) if balance.free else 0.0,
                        "locked": float(balance.locked.as_double()) if balance.locked else 0.0,
                    }
        except Exception as e:
            logger.warning(f"Could not extract balances: {e}")
        return account_balances

    def get_risk_metrics(self) -> Dict[str, Any]:
        """Get risk metrics"""
        if not self.node:
            return {}

        # Calculate portfolio metrics
        total_equity = 0.0

        return {
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

    def get_strategy_info(self, strategy_id: str) -> Dict[str, Any]:
        """Get strategy info"""
        if strategy_id not in self.strategies:
            return {"error": "Strategy not found"}

        strategy = self.strategies[strategy_id]

        return {
            "strategy_id": strategy_id,
            "is_running": strategy.is_running,
            "config": strategy.strategy_config,
            "subscribed_instruments": list(strategy.subscribed_instruments),
        }