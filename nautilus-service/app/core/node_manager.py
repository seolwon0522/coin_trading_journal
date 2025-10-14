"""Node manager orchestrating Nautilus Trader lifecycle."""
from __future__ import annotations

import asyncio
import logging
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Awaitable, Dict, List, Optional

from nautilus_trader.trading.strategy import Strategy

from app.api.models import (
    AccountBalance,
    NodeMode,
    NodeStatus,
    OrderInfo,
    PortfolioSummary,
    PositionInfo,
    StrategyInfo,
)
from app.config import settings
from app.core.nautilus_engine import NautilusEngine
from app.redis_bridge import RedisEventBridge
from app.strategies.factory import StrategyFactory
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)


@dataclass
class StrategyRecord:
    """Runtime metadata for a deployed strategy."""

    strategy_id: str
    strategy: Strategy
    strategy_type: str
    instrument_id: str
    timeframe: str
    parameters: Dict[str, Any]
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def is_running(self) -> bool:
        return bool(getattr(self.strategy, "is_running", False))

    @property
    def is_initialized(self) -> bool:
        return bool(getattr(self.strategy, "initialized", False))


class NodeManager:
    """Singleton controller for Nautilus Trader nodes and strategies."""

    _instance: Optional["NodeManager"] = None

    def __init__(self) -> None:
        self._engine = NautilusEngine()
        self._mode: Optional[NodeMode] = None
        self._started_at: Optional[datetime] = None
        self._lock = asyncio.Lock()
        self._strategies: Dict[str, StrategyRecord] = {}
        self._redis_bridge = RedisEventBridge(settings.redis_url)
        self._redis_connected = False

    # ------------------------------------------------------------------
    # Factory helpers
    # ------------------------------------------------------------------
    @classmethod
    def get_instance(cls) -> "NodeManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def shutdown(self) -> None:
        """Stop node and release external resources."""
        await self.stop_node()
        if self._redis_connected:
            await self._redis_bridge.disconnect()
            self._redis_connected = False

    # ------------------------------------------------------------------
    # Node lifecycle
    # ------------------------------------------------------------------
    async def ensure_node_running(
        self,
        mode: Optional[NodeMode] = None,
        config_overrides: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Idempotently start the trading node."""
        target_mode = mode or self._mode or (
            NodeMode.PAPER if settings.binance_testnet else NodeMode.LIVE
        )
        if self._engine.is_running:
            return
        await self.start_node(target_mode, config_overrides)

    async def start_node(
        self,
        mode: NodeMode = NodeMode.LIVE,
        config_overrides: Optional[Dict[str, Any]] = None,
    ) -> None:
        async with self._lock:
            if self._engine.is_running:
                logger.info("Trading node already running")
                self._mode = mode
                return

            self._apply_mode(mode, config_overrides)
            await self._engine.initialize()
            await self._engine.start()
            self._mode = mode
            self._started_at = datetime.now(timezone.utc)

            if not self._redis_connected:
                await self._redis_bridge.connect()
                self._redis_connected = True

            logger.info("Trading node started in %s mode", mode.value)

    async def stop_node(self) -> None:
        async with self._lock:
            if not self._engine.is_running:
                return

            await self._engine.stop()
            await self._engine.dispose()
            # Keep mode for restart
            # self._mode = None
            self._started_at = None
            # Don't clear strategies - we'll re-add them on restart
            # self._strategies.clear()
            logger.info("Trading node stopped (keeping strategies for restart)")

    # ------------------------------------------------------------------
    # Strategy management
    # ------------------------------------------------------------------
    async def add_strategy(
        self,
        strategy_type: str,
        instrument_id: str,
        timeframe: str,
        parameters: Dict[str, Any],
        strategy_id: Optional[str] = None,
        auto_start: bool = False,
    ) -> StrategyInfo:
        strategy_id = strategy_id or self._generate_strategy_id(strategy_type)
        if strategy_id in self._strategies:
            raise ValueError(f"Strategy {strategy_id} already exists")

        # If node is running, we need to stop it first to add strategies
        was_running = self._engine.is_running
        if was_running:
            logger.info("Stopping node to add new strategy...")
            await self.stop_node()
            # Wait a moment for clean shutdown
            await asyncio.sleep(0.5)
        
        # Initialize node (will create new node after disposal)
        await self._engine.initialize()

        # Re-add all existing strategies first
        for existing_strategy_id, existing_record in self._strategies.items():
            existing_strategy = StrategyFactory.create(
                strategy_type=existing_record.strategy_type,
                instrument_id=existing_record.instrument_id,
                timeframe=existing_record.timeframe,
                parameters=existing_record.parameters,
                strategy_id=existing_strategy_id,
            )
            self._engine.node.trader.add_strategy(existing_strategy)
            # Update the record with new strategy instance
            existing_record.strategy = existing_strategy
            logger.info(f"Re-added existing strategy {existing_strategy_id}")

        # Create and add the new strategy
        strategy = StrategyFactory.create(
            strategy_type=strategy_type,
            instrument_id=instrument_id,
            timeframe=timeframe,
            parameters=parameters,
            strategy_id=strategy_id,
        )

        # Add strategy to trader (trader must not be running)
        self._engine.node.trader.add_strategy(strategy)
        logger.info(f"Added strategy {strategy_id} to trader (Nautilus ID: {strategy.id})")
        
        record = StrategyRecord(
            strategy_id=strategy_id,
            strategy=strategy,
            strategy_type=strategy_type,
            instrument_id=instrument_id,
            timeframe=timeframe,
            parameters=parameters,
        )
        self._strategies[strategy_id] = record

        # Start the node with all strategies
        logger.info(f"Starting node with {len(self._strategies)} strategies...")
        await self._engine.start()
        
        if auto_start:
            await self.start_strategy(strategy_id)

        await self._emit_strategy_event("strategy_added", record)
        return self._build_strategy_info(record)

    async def list_strategies(self) -> List[StrategyInfo]:
        return [self._build_strategy_info(record) for record in self._strategies.values()]

    async def get_strategy(self, strategy_id: str) -> Optional[StrategyInfo]:
        record = self._strategies.get(strategy_id)
        if not record:
            return None
        return self._build_strategy_info(record)

    async def update_strategy(
        self,
        strategy_id: str,
        parameters: Dict[str, Any],
        restart: bool = False,
    ) -> StrategyInfo:
        record = self._strategies.get(strategy_id)
        if not record:
            raise ValueError(f"Strategy {strategy_id} not found")

        was_running = record.is_running
        await self.stop_strategy(strategy_id)
        self._engine.node.trader.remove_strategy(record.strategy)

        strategy = StrategyFactory.create(
            strategy_type=record.strategy_type,
            instrument_id=record.instrument_id,
            timeframe=record.timeframe,
            parameters=parameters,
            strategy_id=strategy_id,
        )
        self._engine.node.trader.add_strategy(strategy)
        record.strategy = strategy
        record.parameters = parameters
        self._strategies[strategy_id] = record

        if restart or was_running:
            await self.start_strategy(strategy_id)

        await self._emit_strategy_event("strategy_updated", record)
        return self._build_strategy_info(record)

    async def remove_strategy(self, strategy_id: str) -> None:
        record = self._strategies.get(strategy_id)
        if not record:
            raise ValueError(f"Strategy {strategy_id} not found")

        await self.stop_strategy(strategy_id)
        self._engine.node.trader.remove_strategy(record.strategy)
        del self._strategies[strategy_id]
        await self._emit_strategy_event("strategy_removed", record)

    async def start_strategy(self, strategy_id: str) -> None:
        record = self._strategies.get(strategy_id)
        if not record:
            raise ValueError(f"Strategy {strategy_id} not found")
        if record.is_running:
            return
        await self.ensure_node_running()
        # Use the strategy object's id attribute (which is a StrategyId)
        # Convert to string to ensure proper matching
        nautilus_strategy_id = record.strategy.id
        logger.info(f"Starting strategy with Nautilus ID: {nautilus_strategy_id}")
        self._engine.node.trader.start_strategy(nautilus_strategy_id)
        await self._emit_strategy_event("strategy_started", record)

    async def stop_strategy(self, strategy_id: str) -> None:
        record = self._strategies.get(strategy_id)
        if not record:
            raise ValueError(f"Strategy {strategy_id} not found")
        if not record.is_running:
            return
        # Use the strategy object's id attribute
        nautilus_strategy_id = record.strategy.id
        logger.info(f"Stopping strategy with Nautilus ID: {nautilus_strategy_id}")
        self._engine.node.trader.stop_strategy(nautilus_strategy_id)
        await self._emit_strategy_event("strategy_stopped", record)

    # ------------------------------------------------------------------
    # Read models
    # ------------------------------------------------------------------
    async def get_node_status(self) -> NodeStatus:
        node = self._engine.node
        uptime = (
            (datetime.now(timezone.utc) - self._started_at).total_seconds()
            if self._started_at
            else None
        )
        return NodeStatus(
            status="running" if self._engine.is_running else "idle",
            is_running=self._engine.is_running,
            mode=self._mode.value if self._mode else None,
            trader_id=str(getattr(node, "trader_id", "")) if node else None,
            machine_id=str(getattr(node, "machine_id", "")) if node else None,
            instance_id=str(getattr(node, "instance_id", "")) if node else None,
            uptime_seconds=uptime,
            memory_usage_mb=None,
        )

    async def get_portfolio_summary(self) -> PortfolioSummary:
        snapshot = self._engine.get_portfolio_status()
        balances_payload = snapshot.get("balances", {})
        account_balances: List[AccountBalance] = []
        total_value = 0.0
        for currencies in balances_payload.values():
            for currency, payload in currencies.items():
                total = float(payload.get("total", 0.0))
                total_value += total
                account_balances.append(
                    AccountBalance(
                        currency=currency,
                        total=total,
                        free=float(payload.get("free", 0.0)),
                        locked=float(payload.get("locked", 0.0)),
                    )
                )

        positions_payload = snapshot.get("positions", [])
        positions: List[PositionInfo] = []
        total_unrealized = 0.0
        opened_at = self._started_at or datetime.now(timezone.utc)
        for position in positions_payload:
            unrealized = float(position.get("unrealized_pnl", 0.0))
            total_unrealized += unrealized
            positions.append(
                PositionInfo(
                    id=position.get("position_id", position.get("symbol", "unknown")),
                    symbol=position.get("symbol", ""),
                    side=position.get("side", ""),
                    quantity=float(position.get("quantity", 0.0)),
                    entry_price=float(position.get("entry_price", 0.0) or 0.0),
                    current_price=float(position.get("current_price", 0.0) or 0.0),
                    unrealized_pnl=unrealized,
                    realized_pnl=float(position.get("realized_pnl", 0.0) or 0.0),
                    opened_at=opened_at,
                )
            )

        return PortfolioSummary(
            total_value_usdt=total_value,
            positions=positions,
            balances=account_balances,
            position_count=len(positions),
            total_unrealized_pnl=total_unrealized,
            total_realized_pnl=0.0,
        )

    async def get_positions(self) -> List[PositionInfo]:
        positions_payload = self._engine.get_positions()
        opened_at = self._started_at or datetime.now(timezone.utc)
        result: List[PositionInfo] = []
        for position in positions_payload:
            result.append(
                PositionInfo(
                    id=position.get("position_id", ""),
                    symbol=position.get("symbol", ""),
                    side=position.get("side", ""),
                    quantity=float(position.get("quantity", 0.0)),
                    entry_price=float(position.get("entry_price", 0.0) or 0.0),
                    current_price=float(position.get("current_price", 0.0) or 0.0),
                    unrealized_pnl=float(position.get("unrealized_pnl", 0.0) or 0.0),
                    realized_pnl=float(position.get("realized_pnl", 0.0) or 0.0),
                    opened_at=opened_at,
                )
            )
        return result

    async def get_orders(self, status: Optional[str] = None) -> List[OrderInfo]:
        orders_payload = self._engine.get_active_orders()
        now = datetime.now(timezone.utc)
        result: List[OrderInfo] = []
        for order in orders_payload:
            if status and order.get("status") != status:
                continue
            result.append(
                OrderInfo(
                    id=order.get("order_id", ""),
                    symbol=order.get("symbol", ""),
                    side=order.get("side", ""),
                    type=order.get("type", ""),
                    quantity=float(order.get("quantity", 0.0)),
                    price=float(order.get("price", 0.0) or 0.0),
                    status=order.get("status", ""),
                    filled_quantity=float(order.get("filled_qty", 0.0) or 0.0),
                    avg_fill_price=float(order.get("avg_fill_price", 0.0) or 0.0),
                    created_at=now,
                )
            )
        return result

    async def close_position(self, position_id: str) -> None:
        raise NotImplementedError("Explicit position close not implemented yet")

    async def close_all_positions(self) -> int:
        raise NotImplementedError("Bulk position close not implemented yet")

    async def run_backtest(
        self,
        strategy_type: str,
        instrument_id: str,
        timeframe: str,
        start_date: str,
        end_date: str,
        parameters: Dict[str, Any],
        initial_balance: float,
    ) -> Any:
        """Run backtest with historical data."""
        from datetime import datetime
        import time
        from app.core.backtest_runner import download_binance_data, run_backtest_with_data

        logger.info(f"Running backtest: {strategy_type} from {start_date} to {end_date}")
        start_time = time.time()

        # Progress callback for WebSocket updates
        async def progress_callback(progress_data: Dict[str, Any]):
            """Send progress updates via WebSocket."""
            payload = {
                "type": "backtest_progress",
                "strategy_type": strategy_type,
                "symbol": instrument_id,
                **progress_data,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            await ws_manager.broadcast(payload, "backtest")
            logger.debug(f"Backtest progress: {progress_data.get('stage')} - {progress_data.get('progress')}%")

        try:
            # Parse dates
            start = datetime.fromisoformat(start_date)
            end = datetime.fromisoformat(end_date)
            days = (end - start).days

            if days <= 0:
                raise ValueError("End date must be after start date")

            # Extract symbol from instrument_id (e.g., "BTCUSDT.BINANCE" -> "BTCUSDT")
            symbol = instrument_id.split(".")[0] if "." in instrument_id else instrument_id

            # Send initial progress
            await progress_callback({
                "stage": "downloading_data",
                "progress": 5,
                "message": f"Downloading {days} days of historical data..."
            })

            # Download historical data
            df = await download_binance_data(
                symbol=symbol,
                interval=timeframe,
                days=min(days, 365)  # Limit to 1 year maximum
            )

            # Run backtest with progress callback
            results = run_backtest_with_data(
                df=df,
                symbol=symbol,
                strategy_type=strategy_type,
                parameters=parameters,
                initial_balance=initial_balance,
                timeframe=timeframe,
                progress_callback=lambda data: asyncio.create_task(progress_callback(data))
            )

            # Calculate execution time
            execution_time = time.time() - start_time

            # Extract metrics from results
            winning_trades = results.get('winning_trades', 0)
            losing_trades = results.get('losing_trades', 0)
            total_trades = results.get('total_trades', 0)
            total_pnl = results.get('total_pnl', 0.0)
            
            # Calculate averages and profit factor
            avg_win = 0.0
            avg_loss = 0.0
            largest_win = 0.0
            largest_loss = 0.0
            profit_factor = 0.0
            
            if total_pnl > 0 and winning_trades > 0:
                # Approximate avg_win: distribute positive PnL across winning trades
                avg_win = abs(total_pnl) / winning_trades
                largest_win = avg_win * 2.5  # Approximation
            elif total_pnl < 0 and losing_trades > 0:
                # If net loss, approximate based on win rate
                win_rate = results.get('win_rate', 0.0) / 100.0
                if win_rate > 0 and winning_trades > 0:
                    # Estimate wins needed to reach current PnL
                    total_losses = abs(total_pnl)
                    avg_loss = total_losses / (losing_trades + winning_trades * 0.5)
                    avg_win = avg_loss * 0.8  # Conservative estimate
                else:
                    avg_loss = abs(total_pnl) / losing_trades
                largest_loss = avg_loss * 2.5  # Approximation
            
            # Calculate profit factor
            if total_trades > 0:
                total_wins = avg_win * winning_trades if winning_trades > 0 else 0
                total_losses = abs(avg_loss * losing_trades) if losing_trades > 0 else 1  # Avoid division by zero
                profit_factor = total_wins / total_losses if total_losses > 0 else 0.0

            # Convert to BacktestResult format
            backtest_result = {
                "strategy_id": self._generate_strategy_id(strategy_type),
                "status": "completed",
                "total_return": results.get('total_return', 0.0),
                "sharpe_ratio": results.get('sharpe_ratio') or 0.0,
                "max_drawdown": results.get('max_drawdown', 0.0),
                "win_rate": results.get('win_rate', 0.0),
                "profit_factor": profit_factor,
                "total_trades": total_trades,
                "winning_trades": winning_trades,
                "losing_trades": losing_trades,
                "long_trades": results.get('long_trades', 0),
                "short_trades": results.get('short_trades', 0),
                "avg_win": round(avg_win, 2),
                "avg_loss": round(avg_loss, 2),
                "largest_win": round(largest_win, 2),
                "largest_loss": round(largest_loss, 2),
                "start_date": start_date,
                "end_date": end_date,
                "initial_balance": initial_balance,
                "final_balance": results.get('final_balance', initial_balance),
                "execution_time_seconds": round(execution_time, 2),
            }

            logger.info(f"Backtest completed: {total_trades} trades, " +
                       f"{backtest_result['total_return']:.2f}% return")

            return backtest_result

        except Exception as e:
            logger.error(f"Backtest failed: {e}")
            raise

    async def get_backtest_result(self, backtest_id: str) -> Any:
        raise NotImplementedError("Backtesting is not implemented yet")

    async def get_backtest_history(self, limit: int = 10) -> List[Any]:
        raise NotImplementedError("Backtesting is not implemented yet")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _generate_strategy_id(self, strategy_type: str) -> str:
        return f"{strategy_type.upper()}_{uuid.uuid4().hex[:8]}"

    def _apply_mode(
        self,
        mode: NodeMode,
        config_overrides: Optional[Dict[str, Any]] = None,
    ) -> None:
        if mode == NodeMode.PAPER:
            os.environ["BINANCE_TESTNET"] = "true"
        elif mode == NodeMode.LIVE:
            os.environ["BINANCE_TESTNET"] = "false"
        elif mode == NodeMode.BACKTEST:
            logger.info("Configured for backtest mode")
        if config_overrides:
            for key, value in config_overrides.items():
                os.environ[str(key).upper()] = str(value)

    def _build_strategy_info(self, record: StrategyRecord) -> StrategyInfo:
        return StrategyInfo(
            id=record.strategy_id,
            type=record.strategy_type,
            instrument_id=record.instrument_id,
            is_running=record.is_running,
            is_initialized=record.is_initialized,
            parameters=record.parameters,
            position_count=0,
            total_pnl=0.0,
            created_at=record.created_at,
        )

    async def _emit_strategy_event(self, event_type: str, record: StrategyRecord) -> None:
        payload = {
            "strategy_id": record.strategy_id,
            "type": record.strategy_type,
            "instrument_id": record.instrument_id,
            "timeframe": record.timeframe,
            "event": event_type,
            "is_running": record.is_running,
            "parameters": record.parameters,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._fire_and_forget(
            ws_manager.broadcast(
                {"channel": "strategies", "type": event_type, "data": payload},
                "strategies",
            )
        )
        if self._redis_connected:
            self._fire_and_forget(
                self._redis_bridge.publish_event(
                    channel="strategies",
                    event_type=event_type,
                    data=payload,
                )
            )

    @staticmethod
    def _fire_and_forget(task: Optional[Awaitable[Any]]) -> None:
        if task is None:
            return
        try:
            asyncio.create_task(task)
        except RuntimeError:
            # Event loop not running (e.g. during shutdown); ignore
            pass


__all__ = ["NodeManager"]

