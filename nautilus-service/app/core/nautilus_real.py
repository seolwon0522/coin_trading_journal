"""
Real Nautilus Trading Engine - Best Practice Implementation
실제 작동하는 Nautilus Trader 구현
"""

import asyncio
import logging
from decimal import Decimal
from typing import Dict, Optional, List, Any

from nautilus_trader.config import (
    TradingNodeConfig,
    LoggingConfig,
    LiveDataEngineConfig,
    LiveExecEngineConfig,
    LiveRiskEngineConfig,
    CacheConfig,
)
from nautilus_trader.common.config import DatabaseConfig
from nautilus_trader.live.node import TradingNode
from nautilus_trader.model.identifiers import TraderId, StrategyId
from nautilus_trader.trading.strategy import Strategy

logger = logging.getLogger(__name__)


class SimpleTradingStrategy(Strategy):
    """
    Simple Trading Strategy for Nautilus
    """

    def __init__(self, strategy_id: str, config: Dict[str, Any]):
        super().__init__(strategy_id=StrategyId(strategy_id))
        self.config = config
        self.is_running = False

    def on_start(self):
        """Called when strategy starts"""
        self.log.info(f"Strategy {self.id} starting")
        self.is_running = True

    def on_stop(self):
        """Called when strategy stops"""
        self.log.info(f"Strategy {self.id} stopping")
        self.is_running = False


class RealNautilusEngine:
    """
    Real Nautilus Trader Engine using Best Practices
    """

    def __init__(self):
        self.node: Optional[TradingNode] = None
        self.strategies: Dict[str, Strategy] = {}
        self.is_running = False
        self._config = None

    def _create_config(self) -> TradingNodeConfig:
        """
        Create Nautilus Trading Node configuration
        """
        return TradingNodeConfig(
            trader_id=TraderId("TRADER-001"),

            # Logging configuration
            logging=LoggingConfig(
                log_level="INFO",
                log_colors=True,
            ),

            # Data engine configuration for live trading
            data_engine=LiveDataEngineConfig(
                time_bars_build_with_no_updates=True,
                time_bars_timestamp_on_close=True,
                validate_data_sequence=True,
            ),

            # Execution engine configuration for live trading
            exec_engine=LiveExecEngineConfig(
                load_cache=True,
            ),

            # Risk engine configuration for live trading
            risk_engine=LiveRiskEngineConfig(
                bypass=False,
                max_order_submit_rate="100/00:00:01",
                max_order_modify_rate="100/00:00:01",
                max_notional_per_order={},  # Empty dict for now, will configure per instrument
            ),

            # Cache configuration
            cache=CacheConfig(
                database=None,  # In-memory cache
                flush_on_start=True,
            ),

            # Timeouts
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

            # Build the node
            self.node.build()

            logger.info("Nautilus Trading Node initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Nautilus: {e}")
            raise

    async def start(self):
        """
        Start the trading engine
        """
        if not self.node:
            await self.initialize()

        try:
            # For TradingNode, it's already running after build()
            # We just need to mark it as running
            self.is_running = True
            logger.info("Nautilus Trading Engine started")

        except Exception as e:
            logger.error(f"Failed to start engine: {e}")
            raise

    async def stop(self):
        """
        Stop the trading engine
        """
        if self.node and self.is_running:
            try:
                self.node.stop()
                self.is_running = False
                logger.info("Nautilus Trading Engine stopped")

            except Exception as e:
                logger.error(f"Failed to stop engine: {e}")
                raise

    async def dispose(self):
        """
        Dispose of the trading engine
        """
        if self.node:
            try:
                if self.is_running:
                    await self.stop()

                self.node.dispose()
                self.node = None
                logger.info("Nautilus Trading Engine disposed")

            except Exception as e:
                logger.error(f"Failed to dispose engine: {e}")
                raise

    def add_strategy(self, strategy_type: str, strategy_id: str, config: Dict[str, Any]) -> str:
        """
        Add a strategy to the engine
        """
        if not self.node:
            raise RuntimeError("Engine not initialized")

        # Create strategy instance
        if strategy_type == "simple":
            strategy = SimpleTradingStrategy(strategy_id, config)
        elif strategy_type == "grid":
            # For now use simple strategy
            strategy = SimpleTradingStrategy(strategy_id, config)
        else:
            raise ValueError(f"Unknown strategy type: {strategy_type}")

        # Add to trader
        self.node.trader.add_strategy(strategy)
        self.strategies[strategy_id] = strategy

        logger.info(f"Strategy {strategy_id} added to engine")
        return strategy_id

    def remove_strategy(self, strategy_id: str) -> bool:
        """
        Remove a strategy from the engine
        """
        if strategy_id not in self.strategies:
            return False

        strategy = self.strategies[strategy_id]

        if self.node:
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

        if self.node:
            self.node.trader.start_strategy(strategy)

        logger.info(f"Strategy {strategy_id} started")
        return True

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

    def get_portfolio_status(self) -> Dict[str, Any]:
        """
        Get portfolio status
        """
        if not self.node:
            return {"status": "not_initialized"}

        portfolio = self.node.portfolio

        # Get balances
        balances = {}
        for account in portfolio.accounts():
            account_balances = {}
            for currency in account.currencies():
                balance = account.balance(currency)
                if balance:
                    account_balances[str(currency)] = float(balance.total.as_double())
            if account_balances:
                balances[str(account.id)] = account_balances

        return {
            "status": "healthy",
            "is_running": self.is_running,
            "strategies_count": len(self.strategies),
            "balances": balances
        }

    def get_strategy_info(self, strategy_id: str) -> Dict[str, Any]:
        """
        Get strategy information
        """
        if strategy_id not in self.strategies:
            return {"error": "Strategy not found"}

        strategy = self.strategies[strategy_id]

        return {
            "strategy_id": strategy_id,
            "is_running": strategy.is_running if hasattr(strategy, 'is_running') else False,
            "config": strategy.config if hasattr(strategy, 'config') else {}
        }

    def get_active_orders(self) -> List[Dict[str, Any]]:
        """
        Get active orders
        """
        if not self.node:
            return []

        orders = []
        for order in self.node.cache.orders_open():
            orders.append({
                "order_id": str(order.client_order_id),
                "symbol": str(order.instrument_id),
                "side": str(order.side),
                "quantity": float(order.quantity.as_double()),
                "price": float(order.price.as_double()) if hasattr(order, 'price') else None,
            })

        return orders

    def get_positions(self) -> List[Dict[str, Any]]:
        """
        Get open positions
        """
        if not self.node:
            return []

        positions = []
        for position in self.node.cache.positions_open():
            positions.append({
                "position_id": str(position.id),
                "symbol": str(position.instrument_id),
                "side": str(position.side),
                "quantity": float(position.quantity.as_double()),
                "entry_price": float(position.avg_px_open.as_double()) if position.avg_px_open else None,
                "unrealized_pnl": float(position.unrealized_pnl.as_double()) if position.unrealized_pnl else 0.0,
            })

        return positions

    def get_risk_metrics(self) -> Dict[str, Any]:
        """
        Get risk metrics
        """
        if not self.node:
            return {}

        risk_engine = self.node.risk_engine

        return {
            "max_order_submit_rate": risk_engine.config.max_order_submit_rate,
            "max_order_modify_rate": risk_engine.config.max_order_modify_rate,
            "max_notional_per_order": risk_engine.config.max_notional_per_order,
            "bypass_mode": risk_engine.config.bypass,
        }


# Singleton instance
nautilus_engine = RealNautilusEngine()