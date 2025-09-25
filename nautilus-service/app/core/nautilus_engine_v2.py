"""
Nautilus Trading Engine V2 - Production Ready Implementation
Proper async execution with Binance integration
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
from nautilus_trader.model.instruments import Instrument
from nautilus_trader.trading.strategy import Strategy

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class NautilusTradingStrategy(Strategy):
    """
    Base Trading Strategy with Nautilus Event Handlers
    """

    def __init__(self, strategy_id: str, config: Dict[str, Any]):
        super().__init__(strategy_id=StrategyId(strategy_id))
        self.config = config
        self.is_running = False
        self.subscribed_instruments: Set[str] = set()

    def on_start(self):
        """Called when strategy starts"""
        self.log.info(f"Strategy {self.id} starting with config: {self.config}")
        self.is_running = True

        # Subscribe to instruments if configured
        if "instruments" in self.config:
            for instrument_id in self.config["instruments"]:
                self.log.info(f"Subscribing to {instrument_id}")
                # Subscribe logic will be implemented with instrument provider
                self.subscribed_instruments.add(instrument_id)

    def on_stop(self):
        """Called when strategy stops"""
        self.log.info(f"Strategy {self.id} stopping")
        self.is_running = False

    def on_quote_tick(self, tick: QuoteTick):
        """Handle quote tick updates"""
        self.log.debug(f"Received quote: {tick}")

    def on_trade_tick(self, tick: TradeTick):
        """Handle trade tick updates"""
        self.log.debug(f"Received trade: {tick}")

    def on_bar(self, bar: Bar):
        """Handle bar updates"""
        self.log.debug(f"Received bar: {bar}")

    def on_order_filled(self, event: OrderFilled):
        """Handle order fill events"""
        self.log.info(f"Order filled: {event}")


class NautilusEngineV2:
    """
    Production-Ready Nautilus Trading Engine with Proper Async Execution
    """

    def __init__(self, config_path: Optional[str] = None):
        self.node: Optional[TradingNode] = None
        self.strategies: Dict[str, Strategy] = {}
        self.is_running = False
        self.config_path = config_path or "config/live.yaml"
        self._config = None
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

    def _create_config(self) -> TradingNodeConfig:
        """
        Create comprehensive Nautilus Trading Node configuration
        """
        # Get environment variables with proper defaults
        testnet = os.getenv("BINANCE_TESTNET", "true").lower() == "true"
        api_key = os.getenv("BINANCE_API_KEY", "")
        api_secret = os.getenv("BINANCE_API_SECRET", "")
        use_redis = os.getenv("USE_REDIS", "true").lower() == "true"
        enable_streaming = os.getenv("ENABLE_STREAMING", "true").lower() == "true"

        # Log environment
        logger.info(f"Configuring Nautilus Engine - Testnet: {testnet}, Redis: {use_redis}")

        # Create data directories
        catalog_path = Path("./data/catalog")
        catalog_path.mkdir(parents=True, exist_ok=True)

        # Binance configuration for testnet/spot
        # Testnet SPOT trading uses the main API endpoint for user data stream
        binance_data_config = BinanceDataClientConfig(
            api_key=api_key,
            api_secret=api_secret,
            account_type=BinanceAccountType.SPOT,  # Use SPOT for testnet
            base_url_http="https://testnet.binance.vision" if testnet else "https://api.binance.com",
            base_url_ws="wss://testnet.binance.vision" if testnet else "wss://stream.binance.com:9443",
            us=False,
            testnet=testnet,
        )

        binance_exec_config = BinanceExecClientConfig(
            api_key=api_key,
            api_secret=api_secret,
            account_type=BinanceAccountType.SPOT,  # Use SPOT for testnet
            base_url_http="https://testnet.binance.vision" if testnet else "https://api.binance.com",
            base_url_ws="wss://testnet.binance.vision" if testnet else "wss://stream.binance.com:9443",
            us=False,
            testnet=testnet,
        )

        # Redis configuration if enabled - use proper DatabaseConfig
        cache_database = None
        message_bus_database = None

        if use_redis:
            redis_host = os.getenv("REDIS_HOST", "localhost")
            redis_port = int(os.getenv("REDIS_PORT", "6379"))

            # Use proper DatabaseConfig for Redis
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

        # Note: Streaming will be configured separately if needed

        return TradingNodeConfig(
            trader_id=TraderId(os.getenv("TRADER_ID", "TRADER-001")),

            # Logging configuration - use only basic parameters
            logging=LoggingConfig(
                log_level=os.getenv("LOG_LEVEL", "INFO"),
                log_colors=True,
            ),

            # Cache configuration with optional Redis backend
            cache=CacheConfig(
                database=cache_database,
                flush_on_start=False,
            ),

            # Message bus with optional Redis
            message_bus=MessageBusConfig(
                database=message_bus_database,
                encoding="msgpack",
            ),

            # Data engine configuration for live trading - minimal config
            data_engine=LiveDataEngineConfig(
                debug=os.getenv("DEBUG", "false").lower() == "true",
            ),

            # Execution engine configuration - minimal config
            exec_engine=LiveExecEngineConfig(
                reconciliation=True,
                load_cache=True,
            ),

            # Risk engine configuration - minimal config
            risk_engine=LiveRiskEngineConfig(
                bypass=False,
                debug=os.getenv("DEBUG", "false").lower() == "true",
            ),

            # Data clients configuration
            data_clients={
                "BINANCE": binance_data_config,
            },

            # Execution clients configuration
            exec_clients={
                "BINANCE": binance_exec_config,
            },

            # Timeout configuration
            timeout_connection=30.0,
            timeout_reconciliation=10.0,
            timeout_portfolio=10.0,
            timeout_disconnection=10.0,
            timeout_post_stop=5.0,
        )

    async def initialize(self):
        """
        Initialize the Nautilus Trading Node
        """
        try:
            # Create configuration
            self._config = self._create_config()

            # Create trading node
            self.node = TradingNode(config=self._config)

            # Add data client factory
            self.node.add_data_client_factory("BINANCE", BinanceLiveDataClientFactory)

            # Add execution client factory
            self.node.add_exec_client_factory("BINANCE", BinanceLiveExecClientFactory)

            # Build the node (prepare components)
            self.node.build()

            logger.info("Nautilus Trading Node initialized and built successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Nautilus: {e}")
            raise

    async def start(self):
        """
        Start the trading engine with proper async execution
        """
        if not self.node:
            await self.initialize()

        try:
            # Clear stop event
            self._stop_event.clear()

            # Start the node in background task
            self._task = asyncio.create_task(self._run_node())

            # Mark as running
            self.is_running = True

            logger.info("Nautilus Trading Engine started successfully")

            # Give node time to start up
            await asyncio.sleep(1)

        except Exception as e:
            logger.error(f"Failed to start engine: {e}")
            raise

    async def _run_node(self):
        """
        Run the trading node with proper async handling
        """
        try:
            logger.info("Starting TradingNode.run() in background task")

            # Run the node (this will run indefinitely)
            await self.node.run_async()

        except asyncio.CancelledError:
            logger.info("TradingNode task cancelled")
        except Exception as e:
            logger.error(f"Error in TradingNode execution: {e}")
            raise

    async def stop(self):
        """
        Stop the trading engine gracefully
        """
        if not self.is_running:
            logger.warning("Engine is not running")
            return

        try:
            logger.info("Stopping Nautilus Trading Engine...")

            # Stop the node
            if self.node:
                self.node.stop()

            # Cancel the task
            if self._task and not self._task.done():
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass

            # Mark as stopped
            self.is_running = False

            logger.info("Nautilus Trading Engine stopped successfully")

        except Exception as e:
            logger.error(f"Failed to stop engine: {e}")
            raise

    async def dispose(self):
        """
        Dispose of the trading engine and cleanup resources
        """
        try:
            # Stop if running
            if self.is_running:
                await self.stop()

            # Dispose node
            if self.node:
                self.node.dispose()
                self.node = None

            # Clear strategies
            self.strategies.clear()

            logger.info("Nautilus Trading Engine disposed successfully")

        except Exception as e:
            logger.error(f"Failed to dispose engine: {e}")
            raise

    def add_strategy(self, strategy_type: str, strategy_id: str, config: Dict[str, Any]) -> str:
        """
        Add a strategy to the engine
        """
        if not self.node:
            raise RuntimeError("Engine not initialized")

        # Create strategy instance based on type
        if strategy_type in ["simple", "nautilus"]:
            strategy = NautilusTradingStrategy(strategy_id, config)
        elif strategy_type == "grid":
            # Import grid strategy when ready
            strategy = NautilusTradingStrategy(strategy_id, config)
        else:
            raise ValueError(f"Unknown strategy type: {strategy_type}")

        # Add to trader
        self.node.trader.add_strategy(strategy)
        self.strategies[strategy_id] = strategy

        logger.info(f"Strategy {strategy_id} ({strategy_type}) added to engine")
        return strategy_id

    def remove_strategy(self, strategy_id: str) -> bool:
        """
        Remove a strategy from the engine
        """
        if strategy_id not in self.strategies:
            return False

        strategy = self.strategies[strategy_id]

        if self.node:
            # Stop strategy first if running
            if strategy.is_running:
                self.node.trader.stop_strategy(strategy)

            # Remove from trader
            self.node.trader.remove_strategy(strategy)

        del self.strategies[strategy_id]
        logger.info(f"Strategy {strategy_id} removed")
        return True

    def start_strategy(self, strategy_id: str) -> bool:
        """
        Start a strategy
        """
        if strategy_id not in self.strategies:
            return False

        strategy = self.strategies[strategy_id]

        if self.node and self.is_running:
            self.node.trader.start_strategy(strategy)
            logger.info(f"Strategy {strategy_id} started")
            return True
        else:
            logger.warning(f"Cannot start strategy {strategy_id} - engine not running")
            return False

    def stop_strategy(self, strategy_id: str) -> bool:
        """
        Stop a strategy
        """
        if strategy_id not in self.strategies:
            return False

        strategy = self.strategies[strategy_id]

        if self.node:
            self.node.trader.stop_strategy(strategy)
            logger.info(f"Strategy {strategy_id} stopped")
            return True
        return False

    async def subscribe_market_data(self, instrument_id: str, data_types: List[str]):
        """
        Subscribe to market data for an instrument
        """
        if not self.node or not self.is_running:
            raise RuntimeError("Engine not running")

        # This will be implemented with instrument provider
        logger.info(f"Subscribing to {data_types} for {instrument_id}")

    def get_portfolio_status(self) -> Dict[str, Any]:
        """
        Get comprehensive portfolio status
        """
        if not self.node:
            return {"status": "not_initialized"}

        portfolio = self.node.portfolio

        # Get account balances
        balances = {}
        for account in portfolio.accounts():
            account_balances = {}
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

        # Get positions
        positions_data = []
        for position in self.node.cache.positions_open():
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
            "accounts": list(balances.keys()),
            "balances": balances,
            "positions": positions_data,
            "open_orders": len(list(self.node.cache.orders_open())) if self.node else 0,
        }

    def get_strategy_info(self, strategy_id: str) -> Dict[str, Any]:
        """
        Get detailed strategy information
        """
        if strategy_id not in self.strategies:
            return {"error": "Strategy not found"}

        strategy = self.strategies[strategy_id]

        info = {
            "strategy_id": strategy_id,
            "is_running": strategy.is_running,
            "config": strategy.config,
            "subscribed_instruments": list(strategy.subscribed_instruments),
        }

        # Add performance metrics if available
        if self.node and hasattr(strategy, "portfolio"):
            info["performance"] = {
                "realized_pnl": 0.0,  # Will implement with portfolio tracking
                "unrealized_pnl": 0.0,
                "total_trades": 0,
            }

        return info

    def get_active_orders(self, strategy_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get active orders, optionally filtered by strategy
        """
        if not self.node:
            return []

        orders = []
        for order in self.node.cache.orders_open():
            # Filter by strategy if specified
            if strategy_id and str(order.strategy_id) != strategy_id:
                continue

            orders.append({
                "order_id": str(order.client_order_id),
                "strategy_id": str(order.strategy_id),
                "symbol": str(order.instrument_id),
                "side": str(order.side),
                "type": str(order.order_type),
                "quantity": float(order.quantity.as_double()),
                "price": float(order.price.as_double()) if hasattr(order, 'price') and order.price else None,
                "status": str(order.status),
                "filled_qty": float(order.filled_qty.as_double()) if order.filled_qty else 0.0,
            })

        return orders

    def get_positions(self, strategy_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get open positions, optionally filtered by strategy
        """
        if not self.node:
            return []

        positions = []
        for position in self.node.cache.positions_open():
            # Filter by strategy if specified
            if strategy_id and str(position.strategy_id) != strategy_id:
                continue

            positions.append({
                "position_id": str(position.id),
                "strategy_id": str(position.strategy_id),
                "symbol": str(position.instrument_id),
                "side": str(position.side),
                "quantity": float(position.quantity.as_double()),
                "entry_price": float(position.avg_px_open.as_double()) if position.avg_px_open else None,
                "current_price": None,  # Will be populated with market data
                "unrealized_pnl": float(position.unrealized_pnl.as_double()) if position.unrealized_pnl else 0.0,
                "realized_pnl": float(position.realized_pnl.as_double()) if position.realized_pnl else 0.0,
            })

        return positions

    def get_risk_metrics(self) -> Dict[str, Any]:
        """
        Get comprehensive risk metrics
        """
        if not self.node:
            return {}

        risk_engine = self.node.risk_engine
        portfolio = self.node.portfolio

        # Calculate portfolio metrics
        total_equity = 0.0
        total_margin_used = 0.0

        for account in portfolio.accounts():
            for currency in account.currencies():
                balance = account.balance(currency)
                if balance:
                    total_equity += float(balance.total.as_double())
                    # Margin calculation would be exchange-specific

        metrics = {
            "engine_config": {
                "max_order_submit_rate": risk_engine.config.max_order_submit_rate,
                "max_order_modify_rate": risk_engine.config.max_order_modify_rate,
                "bypass_mode": risk_engine.config.bypass,
            },
            "portfolio_metrics": {
                "total_equity": total_equity,
                "margin_used": total_margin_used,
                "margin_available": total_equity - total_margin_used,
                "position_count": len(list(self.node.cache.positions_open())),
                "order_count": len(list(self.node.cache.orders_open())),
            },
            "risk_limits": {
                "max_position_size": float(os.getenv("MAX_POSITION_SIZE", "10000")),
                "max_order_size": float(os.getenv("MAX_ORDER_SIZE", "1000")),
                "max_drawdown": float(os.getenv("MAX_DRAWDOWN", "0.20")),
                "daily_loss_limit": float(os.getenv("DAILY_LOSS_LIMIT", "1000")),
                "position_limit": int(os.getenv("POSITION_LIMIT", "10")),
            }
        }

        return metrics


# Export the new engine class
NautilusEngine = NautilusEngineV2