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
            self._mode = None
            self._started_at = None
            self._strategies.clear()
            logger.info("Trading node stopped")

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
        await self.ensure_node_running()

        strategy_id = strategy_id or self._generate_strategy_id(strategy_type)
        if strategy_id in self._strategies:
            raise ValueError(f"Strategy {strategy_id} already exists")

        strategy = StrategyFactory.create(
            strategy_type=strategy_type,
            instrument_id=instrument_id,
            timeframe=timeframe,
            parameters=parameters,
            strategy_id=strategy_id,
        )

        self._engine.node.trader.add_strategy(strategy)
        record = StrategyRecord(
            strategy_id=strategy_id,
            strategy=strategy,
            strategy_type=strategy_type,
            instrument_id=instrument_id,
            timeframe=timeframe,
            parameters=parameters,
        )
        self._strategies[strategy_id] = record

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
        self._engine.node.trader.start_strategy(record.strategy)
        await self._emit_strategy_event("strategy_started", record)

    async def stop_strategy(self, strategy_id: str) -> None:
        record = self._strategies.get(strategy_id)
        if not record:
            raise ValueError(f"Strategy {strategy_id} not found")
        if not record.is_running:
            return
        self._engine.node.trader.stop_strategy(record.strategy)
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
        raise NotImplementedError("Backtesting is not implemented yet")

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

