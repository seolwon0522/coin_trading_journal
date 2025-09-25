"""
Strategy Manager - Core business logic for managing trading strategies
"""
import asyncio
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime
from decimal import Decimal
import logging

from app.config.settings import settings
from app.models.strategy import (
    StrategyType, StrategyStatus, StrategyResponse,
    PositionResponse, OrderResponse, PerformanceMetrics,
    RiskExposureResponse
)
from app.core.exceptions import (
    StrategyNotFoundError, StrategyAlreadyExistsError,
    MaxStrategiesReachedError, InvalidParametersError,
    BinanceConnectionError, RiskLimitExceededError
)

# Nautilus Trader imports - will be properly configured later
try:
    from nautilus_trader.live.node import TradingNode
    from nautilus_trader.config import TradingNodeConfig
    from nautilus_trader.model.identifiers import TraderId
    from nautilus_trader.adapters.binance.common.enums import BinanceAccountType
    from nautilus_trader.adapters.binance.config import (
        BinanceDataClientConfig,
        BinanceExecClientConfig,
    )
    from nautilus_trader.adapters.binance.factories import (
        BinanceLiveDataClientFactory,
        BinanceLiveExecClientFactory
    )
    NAUTILUS_AVAILABLE = True
except ImportError:
    NAUTILUS_AVAILABLE = False
    logging.warning("Nautilus Trader not available. Running in mock mode.")

logger = logging.getLogger(__name__)


class StrategyManager:
    """
    Manages trading strategies lifecycle and execution
    """

    def __init__(self):
        self.strategies: Dict[str, Dict[str, Any]] = {}
        self.trading_nodes: Dict[str, Any] = {}
        self.performance_cache: Dict[str, PerformanceMetrics] = {}
        self._lock = asyncio.Lock()
        self._is_initialized = False

    async def initialize(self):
        """Initialize the strategy manager"""
        async with self._lock:
            if self._is_initialized:
                return

            # Validate configuration
            if not settings.has_credentials and not settings.is_testnet:
                logger.warning("No Binance credentials configured. Running in testnet mode.")

            # Check Nautilus availability
            if not NAUTILUS_AVAILABLE:
                logger.error("Nautilus Trader is not available")
                # In production, you might want to raise an exception here

            self._is_initialized = True
            logger.info("Strategy Manager initialized")

    async def create_strategy(
        self,
        name: str,
        strategy_type: StrategyType,
        symbol: str,
        parameters: Dict[str, Any],
        capital: float,
        leverage: int,
        testnet: bool = True
    ) -> StrategyResponse:
        """
        Create a new strategy
        """
        async with self._lock:
            # Check max strategies limit
            if len(self.strategies) >= settings.max_strategies:
                raise MaxStrategiesReachedError(settings.max_strategies)

            # Generate unique ID
            strategy_id = str(uuid.uuid4())

            # Check if name already exists
            if any(s['name'] == name for s in self.strategies.values()):
                raise StrategyAlreadyExistsError(name)

            # Validate parameters based on strategy type
            validated_params = await self._validate_strategy_parameters(strategy_type, parameters)

            # Create strategy record
            strategy_data = {
                "id": strategy_id,
                "name": name,
                "strategy_type": strategy_type,
                "symbol": symbol,
                "status": StrategyStatus.IDLE,
                "parameters": validated_params,
                "capital": capital,
                "leverage": leverage,
                "testnet": testnet,
                "created_at": datetime.utcnow(),
                "started_at": None,
                "stopped_at": None,
                "error_message": None,
                "trading_node": None
            }

            self.strategies[strategy_id] = strategy_data

            logger.info(f"Created strategy {strategy_id} ({name}) of type {strategy_type}")

            return StrategyResponse(**strategy_data)

    async def start_strategy(self, strategy_id: str, force: bool = False) -> StrategyResponse:
        """
        Start a trading strategy
        """
        async with self._lock:
            strategy = self.strategies.get(strategy_id)
            if not strategy:
                raise StrategyNotFoundError(strategy_id)

            # Check if already running
            if strategy["status"] == StrategyStatus.RUNNING and not force:
                return StrategyResponse(**strategy)

            try:
                # Update status
                strategy["status"] = StrategyStatus.STARTING

                # Create and start trading node
                if NAUTILUS_AVAILABLE:
                    trading_node = await self._create_trading_node(strategy)
                    await self._start_trading_node(trading_node, strategy)
                    strategy["trading_node"] = trading_node
                    self.trading_nodes[strategy_id] = trading_node
                else:
                    # Mock mode for development
                    logger.warning(f"Starting strategy {strategy_id} in mock mode")

                # Update strategy record
                strategy["status"] = StrategyStatus.RUNNING
                strategy["started_at"] = datetime.utcnow()
                strategy["error_message"] = None

                logger.info(f"Started strategy {strategy_id}")

                return StrategyResponse(**strategy)

            except Exception as e:
                strategy["status"] = StrategyStatus.ERROR
                strategy["error_message"] = str(e)
                logger.error(f"Failed to start strategy {strategy_id}: {e}")
                raise

    async def stop_strategy(self, strategy_id: str) -> Dict[str, Any]:
        """
        Stop a running strategy
        """
        async with self._lock:
            strategy = self.strategies.get(strategy_id)
            if not strategy:
                raise StrategyNotFoundError(strategy_id)

            try:
                # Update status
                strategy["status"] = StrategyStatus.STOPPING

                # Get final statistics
                final_stats = await self._get_strategy_statistics(strategy_id)

                # Stop trading node
                if NAUTILUS_AVAILABLE and strategy_id in self.trading_nodes:
                    trading_node = self.trading_nodes[strategy_id]
                    await self._stop_trading_node(trading_node)
                    del self.trading_nodes[strategy_id]

                # Update strategy record
                strategy["status"] = StrategyStatus.STOPPED
                strategy["stopped_at"] = datetime.utcnow()
                strategy["trading_node"] = None

                logger.info(f"Stopped strategy {strategy_id}")

                return {
                    "strategy_id": strategy_id,
                    "final_stats": final_stats,
                    "run_time": (strategy["stopped_at"] - strategy["started_at"]).total_seconds()
                        if strategy["started_at"] else 0
                }

            except Exception as e:
                strategy["status"] = StrategyStatus.ERROR
                strategy["error_message"] = str(e)
                logger.error(f"Failed to stop strategy {strategy_id}: {e}")
                raise

    async def delete_strategy(self, strategy_id: str) -> None:
        """
        Delete a strategy
        """
        async with self._lock:
            strategy = self.strategies.get(strategy_id)
            if not strategy:
                raise StrategyNotFoundError(strategy_id)

            # Cannot delete running strategy
            if strategy["status"] == StrategyStatus.RUNNING:
                await self.stop_strategy(strategy_id)

            del self.strategies[strategy_id]
            logger.info(f"Deleted strategy {strategy_id}")

    async def get_strategy(self, strategy_id: str) -> StrategyResponse:
        """
        Get strategy details
        """
        strategy = self.strategies.get(strategy_id)
        if not strategy:
            raise StrategyNotFoundError(strategy_id)

        return StrategyResponse(**strategy)

    async def list_strategies(self, status: Optional[StrategyStatus] = None) -> List[StrategyResponse]:
        """
        List all strategies
        """
        strategies = []
        for strategy in self.strategies.values():
            if status is None or strategy["status"] == status:
                strategies.append(StrategyResponse(**strategy))

        return strategies

    async def get_strategy_positions(self, strategy_id: str) -> List[PositionResponse]:
        """
        Get positions for a strategy
        """
        strategy = self.strategies.get(strategy_id)
        if not strategy:
            raise StrategyNotFoundError(strategy_id)

        positions = []

        if NAUTILUS_AVAILABLE and strategy_id in self.trading_nodes:
            trading_node = self.trading_nodes[strategy_id]
            if trading_node and hasattr(trading_node, 'portfolio'):
                for position in trading_node.portfolio.positions_open():
                    positions.append(PositionResponse(
                        id=str(position.id),
                        strategy_id=strategy_id,
                        symbol=position.symbol.value,
                        side="long" if position.quantity > 0 else "short",
                        quantity=float(abs(position.quantity)),
                        entry_price=float(position.avg_px_open),
                        current_price=float(position.last_px or position.avg_px_open),
                        unrealized_pnl=float(position.unrealized_pnl or 0),
                        realized_pnl=float(position.realized_pnl or 0),
                        created_at=datetime.utcnow()  # Would need proper timestamp
                    ))

        return positions

    async def get_strategy_performance(self, strategy_id: str) -> PerformanceMetrics:
        """
        Get performance metrics for a strategy
        """
        strategy = self.strategies.get(strategy_id)
        if not strategy:
            raise StrategyNotFoundError(strategy_id)

        # Check cache first
        if strategy_id in self.performance_cache:
            # In production, add cache expiration logic
            return self.performance_cache[strategy_id]

        metrics = await self._calculate_performance_metrics(strategy_id)
        self.performance_cache[strategy_id] = metrics

        return metrics

    async def get_risk_exposure(self) -> RiskExposureResponse:
        """
        Calculate total risk exposure across all strategies
        """
        total_exposure = 0.0
        long_exposure = 0.0
        short_exposure = 0.0
        position_count = 0

        for strategy_id in self.strategies:
            positions = await self.get_strategy_positions(strategy_id)
            for position in positions:
                exposure = position.quantity * position.current_price
                total_exposure += abs(exposure)
                position_count += 1

                if position.side == "long":
                    long_exposure += exposure
                else:
                    short_exposure += abs(exposure)

        return RiskExposureResponse(
            total_exposure=total_exposure,
            position_count=position_count,
            long_exposure=long_exposure,
            short_exposure=short_exposure,
            max_position_size=settings.max_position_size,
            current_drawdown=0.0,  # Would need to calculate from equity curve
            var_95=None,  # Would need historical data
            cvar_95=None,  # Would need historical data
            timestamp=datetime.utcnow()
        )

    async def emergency_stop_all(self) -> Dict[str, Any]:
        """
        Emergency stop all strategies
        """
        strategies_stopped = []
        errors = []

        for strategy_id in list(self.strategies.keys()):
            try:
                if self.strategies[strategy_id]["status"] == StrategyStatus.RUNNING:
                    await self.stop_strategy(strategy_id)
                    strategies_stopped.append(strategy_id)
            except Exception as e:
                errors.append({
                    "strategy_id": strategy_id,
                    "error": str(e)
                })

        return {
            "strategies_stopped": strategies_stopped,
            "errors": errors,
            "timestamp": datetime.utcnow()
        }

    # Private helper methods
    async def _validate_strategy_parameters(
        self,
        strategy_type: StrategyType,
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate strategy parameters based on type
        """
        # In production, use proper validation with Pydantic models
        # For now, just return the parameters
        return parameters

    async def _create_trading_node(self, strategy: Dict[str, Any]) -> Any:
        """
        Create a Nautilus trading node for the strategy
        """
        if not NAUTILUS_AVAILABLE:
            return None

        # Create node configuration
        config = TradingNodeConfig(
            trader_id=TraderId(strategy["id"]),
            logging={
                "log_level": settings.log_level,
                "log_to_console": True,
            },
        )

        # Create trading node
        node = TradingNode(config)

        # Configure Binance adapters
        http_url, ws_url = settings.get_binance_urls()

        data_config = BinanceDataClientConfig(
            api_key=settings.binance_api_key or "",
            api_secret=settings.binance_api_secret or "",
            account_type=BinanceAccountType.USDT_FUTURE,
            base_url_http=http_url,
            base_url_ws=ws_url,
            testnet=strategy["testnet"],
        )

        exec_config = BinanceExecClientConfig(
            api_key=settings.binance_api_key or "",
            api_secret=settings.binance_api_secret or "",
            account_type=BinanceAccountType.USDT_FUTURE,
            base_url_http=http_url,
            base_url_ws=ws_url,
            testnet=strategy["testnet"],
        )

        # Add to node
        node.add_data_client_factory("BINANCE", BinanceLiveDataClientFactory)
        node.add_exec_client_factory("BINANCE", BinanceLiveExecClientFactory)
        node.add_data_client_config(data_config)
        node.add_exec_client_config(exec_config)

        return node

    async def _start_trading_node(self, node: Any, strategy: Dict[str, Any]) -> None:
        """
        Start the trading node
        """
        if not node:
            return

        # Add strategy to node (would need actual strategy implementation)
        # node.trader.add_strategy(strategy_instance)

        # Build and start
        node.build()
        node.start()

    async def _stop_trading_node(self, node: Any) -> None:
        """
        Stop the trading node
        """
        if not node:
            return

        node.stop()
        node.dispose()

    async def _get_strategy_statistics(self, strategy_id: str) -> Dict[str, Any]:
        """
        Get statistics for a strategy
        """
        # In production, would gather real statistics from trading node
        return {
            "total_trades": 0,
            "realized_pnl": 0.0,
            "unrealized_pnl": 0.0
        }

    async def _calculate_performance_metrics(self, strategy_id: str) -> PerformanceMetrics:
        """
        Calculate performance metrics for a strategy
        """
        # In production, would calculate real metrics from trading history
        return PerformanceMetrics()