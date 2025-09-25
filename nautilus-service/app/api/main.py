"""
Nautilus Trading Service - Direct Integration Pattern
공식 NautilusTrader 패턴을 그대로 사용하는 심플한 구조
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any, List
import asyncio
import logging
import json
from datetime import datetime
from decimal import Decimal

from nautilus_trader.live.node import TradingNode
from nautilus_trader.backtest.engine import BacktestEngine
from nautilus_trader.model.identifiers import InstrumentId
from nautilus_trader.model.data import BarType
from nautilus_trader.model.enums import OrderSide, TimeInForce

from app.api.models import *
# from app.api.routes import node_router, strategy_router, portfolio_router, backtest_router  # Routes defined inline
from app.core.configs import get_live_trading_config, get_backtest_config
from app.strategies.factory import StrategyFactory
from app.websocket.manager import WebSocketManager

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global state - 간단하고 직접적인 상태 관리
app_state = {
    "node": None,  # TradingNode or BacktestEngine
    "strategies": {},  # strategy_id: strategy instance
    "mode": None,  # "live", "backtest", "paper"
    "ws_manager": WebSocketManager()
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 생명주기 관리"""
    logger.info("Starting Nautilus Trading Service...")
    yield
    # Cleanup
    logger.info("Shutting down...")
    if app_state["node"]:
        if isinstance(app_state["node"], TradingNode) and app_state["node"].is_running:
            await app_state["node"].stop()
            await app_state["node"].dispose()
        app_state["node"] = None

    # Close all websocket connections
    await app_state["ws_manager"].disconnect_all()


# FastAPI app setup
app = FastAPI(
    title="Nautilus Trading API",
    version="2.0.0",
    description="Direct NautilusTrader Integration with FastAPI",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production에서는 구체적인 origins 설정
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers - 하지만 직접 구현으로 대체
# app.include_router(node_router)
# app.include_router(strategy_router)
# app.include_router(portfolio_router)
# app.include_router(backtest_router)


# ==================== Node Management ====================
@app.post("/api/node/start")
async def start_node(mode: str = "live"):
    """NautilusTrader 노드 직접 시작"""
    if app_state["node"]:
        raise HTTPException(400, "Node already running")

    try:
        if mode == "live":
            config = get_live_trading_config()
            node = TradingNode(config)
            node.build()
            await node.start()
        elif mode == "paper":
            # Paper trading은 live mode with sandbox flag
            config = get_live_trading_config()
            config.environment = "sandbox"  # Binance testnet
            node = TradingNode(config)
            node.build()
            await node.start()
        elif mode == "backtest":
            # Backtest는 별도 엔진
            config = get_backtest_config()
            node = BacktestEngine(config)
            node.build()
        else:
            raise ValueError(f"Invalid mode: {mode}")

        app_state["node"] = node
        app_state["mode"] = mode

        # Setup event handlers for WebSocket broadcasting
        if isinstance(node, TradingNode):
            _setup_event_handlers(node)

        return {
            "status": "started",
            "mode": mode,
            "trader_id": str(node.trader_id),
            "instance_id": str(node.instance_id)
        }

    except Exception as e:
        logger.error(f"Failed to start node: {e}")
        raise HTTPException(500, str(e))


@app.post("/api/node/stop")
async def stop_node():
    """노드 정지"""
    if not app_state["node"]:
        raise HTTPException(400, "Node not running")

    try:
        node = app_state["node"]

        # Close all positions before stopping
        if hasattr(node, 'portfolio'):
            for position in node.portfolio.positions_open():
                await _close_position(position)

        if isinstance(node, TradingNode):
            await node.stop()
        await node.dispose()

        app_state["node"] = None
        app_state["strategies"].clear()
        app_state["mode"] = None

        return {"status": "stopped"}

    except Exception as e:
        logger.error(f"Failed to stop node: {e}")
        raise HTTPException(500, str(e))


@app.get("/api/node/status")
async def get_node_status():
    """노드 상태 조회"""
    node = app_state["node"]

    if not node:
        return {
            "status": "idle",
            "is_running": False,
            "mode": None
        }

    return {
        "status": "running" if (isinstance(node, TradingNode) and node.is_running) else "ready",
        "is_running": node.is_running if isinstance(node, TradingNode) else False,
        "mode": app_state["mode"],
        "trader_id": str(node.trader_id),
        "machine_id": str(node.machine_id) if hasattr(node, 'machine_id') else None,
        "instance_id": str(node.instance_id),
        "strategy_count": len(app_state["strategies"]),
        "position_count": len(node.portfolio.positions_open()) if hasattr(node, 'portfolio') else 0
    }


# ==================== Strategy Management ====================
@app.post("/api/strategies/add")
async def add_strategy(request: StrategyAddRequest):
    """전략 추가 - Factory 패턴 사용"""
    node = app_state["node"]
    if not node:
        raise HTTPException(400, "Node not running")

    try:
        # StrategyFactory로 전략 생성
        strategy = StrategyFactory.create(
            strategy_type=request.strategy_type,
            instrument_id=request.instrument_id,
            timeframe=request.timeframe,
            parameters=request.parameters
        )

        # NautilusTrader에 직접 추가
        node.trader.add_strategy(strategy)
        app_state["strategies"][str(strategy.id)] = strategy

        # WebSocket으로 알림
        await app_state["ws_manager"].broadcast({
            "type": "strategy_added",
            "strategy_id": str(strategy.id),
            "strategy_type": request.strategy_type
        })

        return {
            "id": str(strategy.id),
            "type": request.strategy_type,
            "instrument_id": request.instrument_id,
            "is_running": strategy.is_running,
            "is_initialized": strategy.is_initialized,
            "parameters": request.parameters,
            "position_count": 0,
            "total_pnl": 0.0,
            "created_at": datetime.now()
        }

    except Exception as e:
        logger.error(f"Failed to add strategy: {e}")
        raise HTTPException(500, str(e))


@app.get("/api/strategies")
async def list_strategies():
    """전략 목록 - NautilusTrader 상태 직접 조회"""
    strategies = []

    for strategy_id, strategy in app_state["strategies"].items():
        # 직접 strategy 객체에서 정보 추출
        positions = []
        if hasattr(strategy, 'cache'):
            positions = strategy.cache.positions_open(
                venue=None,
                instrument_id=strategy.instrument_id
            )

        strategies.append({
            "id": strategy_id,
            "type": strategy.__class__.__name__,
            "instrument_id": str(strategy.instrument_id) if hasattr(strategy, 'instrument_id') else None,
            "is_running": strategy.is_running,
            "is_initialized": strategy.is_initialized,
            "position_count": len(positions),
            "parameters": strategy.config.__dict__ if hasattr(strategy, 'config') else {}
        })

    return strategies


@app.delete("/api/strategies/{strategy_id}")
async def remove_strategy(strategy_id: str):
    """전략 제거"""
    if strategy_id not in app_state["strategies"]:
        raise HTTPException(404, f"Strategy {strategy_id} not found")

    try:
        strategy = app_state["strategies"][strategy_id]
        node = app_state["node"]

        # 전략 정지 및 제거
        if strategy.is_running:
            strategy.stop()

        node.trader.remove_strategy(strategy)
        del app_state["strategies"][strategy_id]

        return {"status": "removed", "strategy_id": strategy_id}

    except Exception as e:
        logger.error(f"Failed to remove strategy: {e}")
        raise HTTPException(500, str(e))


# ==================== Portfolio Management ====================
@app.get("/api/portfolio")
async def get_portfolio():
    """포트폴리오 상태 - NautilusTrader Portfolio 직접 사용"""
    node = app_state["node"]
    if not node or not hasattr(node, 'portfolio'):
        raise HTTPException(400, "Node not running or no portfolio available")

    portfolio = node.portfolio

    # Positions
    positions = []
    for position in portfolio.positions_open():
        positions.append({
            "id": str(position.id),
            "symbol": str(position.instrument_id),
            "side": "LONG" if position.is_long else "SHORT",
            "quantity": float(position.quantity),
            "entry_price": float(position.avg_px_open) if position.avg_px_open else 0,
            "current_price": float(position.last_px) if position.last_px else 0,
            "unrealized_pnl": float(position.unrealized_pnl(position.last_px)) if position.last_px else 0,
            "realized_pnl": float(position.realized_pnl) if position.realized_pnl else 0
        })

    # Account balances
    balances = []
    for account in portfolio.accounts():
        for balance in account.balances():
            balances.append({
                "currency": str(balance.currency),
                "total": float(balance.total),
                "free": float(balance.free),
                "locked": float(balance.locked)
            })

    # Calculate total values
    total_unrealized_pnl = sum(p["unrealized_pnl"] for p in positions)
    total_realized_pnl = sum(p["realized_pnl"] for p in positions)

    # Estimate total value in USDT
    total_value_usdt = sum(
        b["total"] if b["currency"] == "USDT" else 0
        for b in balances
    ) + total_unrealized_pnl

    return {
        "total_value_usdt": total_value_usdt,
        "positions": positions,
        "balances": balances,
        "position_count": len(positions),
        "total_unrealized_pnl": total_unrealized_pnl,
        "total_realized_pnl": total_realized_pnl
    }


@app.get("/api/orders")
async def get_orders(status: Optional[str] = None):
    """주문 목록"""
    node = app_state["node"]
    if not node or not hasattr(node, 'cache'):
        raise HTTPException(400, "Node not running")

    orders = []
    for order in node.cache.orders():
        # Filter by status if provided
        if status and str(order.status) != status:
            continue

        orders.append({
            "id": str(order.client_order_id),
            "symbol": str(order.instrument_id),
            "side": str(order.side),
            "type": str(order.order_type),
            "quantity": float(order.quantity),
            "price": float(order.price) if order.price else None,
            "status": str(order.status),
            "filled_quantity": float(order.filled_qty) if order.filled_qty else 0,
            "avg_fill_price": float(order.avg_px) if order.avg_px else None,
            "created_at": order.ts_init.isoformat() if order.ts_init else None
        })

    return orders


# ==================== Backtesting ====================
@app.post("/api/backtest/run")
async def run_backtest(request: BacktestRequest):
    """백테스트 실행 - BacktestEngine 직접 사용"""
    try:
        # Create dedicated backtest engine
        config = get_backtest_config()
        engine = BacktestEngine(config)

        # Add strategy
        strategy = StrategyFactory.create(
            strategy_type=request.strategy_type,
            instrument_id=request.instrument_id,
            timeframe=request.timeframe,
            parameters=request.parameters
        )
        engine.add_strategy(strategy)

        # TODO: Load historical data into engine
        # This requires DataCatalog setup which we'll do in Unit 4

        # Run backtest
        engine.run()

        # Get results
        report = engine.trader.generate_order_fills_report()
        stats = engine.trader.generate_statistics()

        result = {
            "strategy_id": str(strategy.id),
            "status": "completed",
            "total_return": stats.get("total_return", 0),
            "sharpe_ratio": stats.get("sharpe_ratio", 0),
            "max_drawdown": stats.get("max_drawdown", 0),
            "win_rate": stats.get("win_rate", 0),
            "profit_factor": stats.get("profit_factor", 0),
            "total_trades": stats.get("total_trades", 0),
            "winning_trades": stats.get("winning_trades", 0),
            "losing_trades": stats.get("losing_trades", 0),
            "avg_win": stats.get("avg_win", 0),
            "avg_loss": stats.get("avg_loss", 0),
            "start_date": request.start_date,
            "end_date": request.end_date,
            "initial_balance": request.initial_balance,
            "final_balance": stats.get("ending_balance", request.initial_balance)
        }

        # Cleanup
        engine.dispose()

        return result

    except Exception as e:
        logger.error(f"Backtest failed: {e}")
        raise HTTPException(500, str(e))


# ==================== WebSocket Endpoints ====================
@app.websocket("/ws/market-data")
async def websocket_market_data(websocket: WebSocket):
    """실시간 시장 데이터 스트리밍"""
    await app_state["ws_manager"].connect(websocket, "market_data")
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            # Could handle subscription requests here
    except WebSocketDisconnect:
        await app_state["ws_manager"].disconnect(websocket, "market_data")


@app.websocket("/ws/orders")
async def websocket_orders(websocket: WebSocket):
    """실시간 주문 업데이트"""
    await app_state["ws_manager"].connect(websocket, "orders")
    try:
        while True:
            await asyncio.sleep(0.1)  # Keep alive
    except WebSocketDisconnect:
        await app_state["ws_manager"].disconnect(websocket, "orders")


@app.websocket("/ws/positions")
async def websocket_positions(websocket: WebSocket):
    """실시간 포지션 업데이트"""
    await app_state["ws_manager"].connect(websocket, "positions")
    try:
        while True:
            await asyncio.sleep(0.1)  # Keep alive
    except WebSocketDisconnect:
        await app_state["ws_manager"].disconnect(websocket, "positions")


# ==================== Helper Functions ====================
def _setup_event_handlers(node: TradingNode):
    """NautilusTrader 이벤트를 WebSocket으로 브로드캐스트"""

    def on_order_event(event):
        asyncio.create_task(app_state["ws_manager"].broadcast({
            "type": "order_update",
            "data": {
                "order_id": str(event.client_order_id) if hasattr(event, 'client_order_id') else None,
                "status": str(event.order_status) if hasattr(event, 'order_status') else None,
                "timestamp": datetime.now().isoformat()
            }
        }, channel="orders"))

    def on_position_event(event):
        asyncio.create_task(app_state["ws_manager"].broadcast({
            "type": "position_update",
            "data": {
                "position_id": str(event.position_id) if hasattr(event, 'position_id') else None,
                "action": event.__class__.__name__,
                "timestamp": datetime.now().isoformat()
            }
        }, channel="positions"))

    # Subscribe to events
    if hasattr(node, 'msgbus'):
        node.msgbus.subscribe("OrderAccepted", on_order_event)
        node.msgbus.subscribe("OrderFilled", on_order_event)
        node.msgbus.subscribe("OrderCanceled", on_order_event)
        node.msgbus.subscribe("PositionOpened", on_position_event)
        node.msgbus.subscribe("PositionClosed", on_position_event)


async def _close_position(position):
    """포지션 종료 헬퍼"""
    node = app_state["node"]

    if position.is_long:
        order = node.trader.order_factory.market(
            instrument_id=position.instrument_id,
            order_side=OrderSide.SELL,
            quantity=position.quantity,
            time_in_force=TimeInForce.IOC
        )
    else:
        order = node.trader.order_factory.market(
            instrument_id=position.instrument_id,
            order_side=OrderSide.BUY,
            quantity=position.quantity,
            time_in_force=TimeInForce.IOC
        )

    node.trader.submit_order(order)


# ==================== Health Check ====================
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Nautilus Trading API",
        "version": "2.0.0",
        "status": "healthy",
        "node_running": app_state["node"] is not None,
        "mode": app_state["mode"],
        "strategy_count": len(app_state["strategies"]),
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002, reload=True)