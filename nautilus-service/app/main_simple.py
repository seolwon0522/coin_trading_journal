"""
Nautilus Trading Service - Simple API Gateway
NautilusTrader가 모든 걸 다 해주므로 우리는 API만 제공
"""

from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any, List
import asyncio
import logging

from nautilus_trader.live.node import TradingNode
from nautilus_trader.backtest.node import BacktestNode

from app.core.configs import get_live_trading_config, get_backtest_config, EMACrossConfig
from app.strategies.ema_cross import EMACrossStrategy

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 글로벌 노드 인스턴스
node: Optional[TradingNode] = None
strategies: Dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 생명주기 관리"""
    logger.info("Starting Nautilus Trading Service...")
    yield
    # Shutdown
    logger.info("Shutting down...")
    if node and node.is_running:
        await node.stop()
        await node.dispose()


app = FastAPI(title="Nautilus Trading API", lifespan=lifespan)


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "service": "Nautilus Trading API",
        "status": "running" if node and node.is_running else "idle",
        "mode": "live" if isinstance(node, TradingNode) else "backtest" if node else None,
    }


@app.post("/node/start")
async def start_node(mode: str = "live"):
    """
    노드 시작 - NautilusTrader가 다 처리
    """
    global node

    if node and node.is_running:
        raise HTTPException(400, "Node already running")

    try:
        if mode == "live":
            config = get_live_trading_config()
            node = TradingNode(config)
        elif mode == "backtest":
            config = get_backtest_config()
            node = BacktestNode(config)
        else:
            raise ValueError(f"Invalid mode: {mode}")

        # Build and start
        node.build()

        if mode == "live":
            await node.start()

        return {"status": "started", "mode": mode}

    except Exception as e:
        logger.error(f"Failed to start node: {e}")
        raise HTTPException(500, str(e))


@app.post("/node/stop")
async def stop_node():
    """노드 정지"""
    global node

    if not node:
        raise HTTPException(400, "Node not running")

    try:
        if isinstance(node, TradingNode):
            await node.stop()
        await node.dispose()
        node = None

        return {"status": "stopped"}

    except Exception as e:
        logger.error(f"Failed to stop node: {e}")
        raise HTTPException(500, str(e))


@app.get("/node/status")
async def get_node_status():
    """노드 상태 조회"""
    if not node:
        return {"status": "idle", "is_running": False}

    return {
        "status": "running" if node.is_running else "stopped",
        "is_running": node.is_running,
        "mode": "live" if isinstance(node, TradingNode) else "backtest",
        "trader_id": str(node.trader_id),
        "machine_id": str(node.machine_id),
        "instance_id": str(node.instance_id),
    }


@app.post("/strategies/add")
async def add_strategy(
    strategy_type: str = "ema_cross",
    instrument_id: str = "BTCUSDT.BINANCE",
    bar_type: str = "BTCUSDT.BINANCE-1-MINUTE-LAST-EXTERNAL"
):
    """
    전략 추가 - NautilusTrader의 Strategy를 직접 사용
    """
    global strategies

    if not node:
        raise HTTPException(400, "Node not running")

    try:
        # Strategy config 생성
        if strategy_type == "ema_cross":
            config = EMACrossConfig(
                instrument_id=instrument_id,
                bar_type=bar_type,
            )
            strategy = EMACrossStrategy(config)
        else:
            raise ValueError(f"Unknown strategy type: {strategy_type}")

        # NautilusTrader에 전략 추가
        node.trader.add_strategy(strategy)
        strategies[str(strategy.id)] = strategy

        return {
            "strategy_id": str(strategy.id),
            "strategy_type": strategy_type,
            "status": "added"
        }

    except Exception as e:
        logger.error(f"Failed to add strategy: {e}")
        raise HTTPException(500, str(e))


@app.get("/strategies")
async def list_strategies():
    """전략 목록"""
    return [
        {
            "id": str(s.id),
            "class": s.__class__.__name__,
            "is_running": s.is_running,
            "is_initialized": s.is_initialized,
        }
        for s in strategies.values()
    ]


@app.delete("/strategies/{strategy_id}")
async def remove_strategy(strategy_id: str):
    """전략 제거"""
    if not node:
        raise HTTPException(400, "Node not running")

    strategy = strategies.get(strategy_id)
    if not strategy:
        raise HTTPException(404, "Strategy not found")

    try:
        node.trader.remove_strategy(strategy)
        del strategies[strategy_id]

        return {"status": "removed", "strategy_id": strategy_id}

    except Exception as e:
        logger.error(f"Failed to remove strategy: {e}")
        raise HTTPException(500, str(e))


@app.get("/portfolio")
async def get_portfolio():
    """포트폴리오 상태 - Nautilus Portfolio 직접 사용"""
    if not node:
        raise HTTPException(400, "Node not running")

    portfolio = node.portfolio

    # 포지션
    positions = []
    for position in portfolio.positions_open():
        positions.append({
            "id": str(position.id),
            "symbol": str(position.instrument_id),
            "side": "LONG" if position.is_long else "SHORT",
            "quantity": float(position.quantity),
            "entry_price": float(position.avg_px_open),
            "unrealized_pnl": float(position.unrealized_pnl(position.last_px)) if position.last_px else 0,
        })

    # 계좌 잔고
    accounts = {}
    for account in portfolio.accounts():
        balances = {}
        for balance in account.balances():
            balances[str(balance.currency)] = {
                "total": float(balance.total),
                "free": float(balance.free),
                "locked": float(balance.locked),
            }

        accounts[str(account.id)] = {
            "type": str(account.type),
            "balances": balances,
        }

    return {
        "positions": positions,
        "accounts": accounts,
        "position_count": len(positions),
    }


@app.get("/orders")
async def get_orders():
    """주문 목록 - Nautilus Cache 직접 사용"""
    if not node:
        raise HTTPException(400, "Node not running")

    orders = []
    for order in node.cache.orders():
        if order.is_open:
            orders.append({
                "id": str(order.client_order_id),
                "symbol": str(order.instrument_id),
                "side": str(order.side),
                "type": str(order.order_type),
                "quantity": float(order.quantity),
                "price": float(order.price) if order.price else None,
                "status": str(order.status),
            })

    return orders


@app.post("/backtest/run")
async def run_backtest(
    strategy_type: str = "ema_cross",
    start_date: str = "2024-01-01",
    end_date: str = "2024-01-02"
):
    """
    백테스트 실행 - NautilusTrader BacktestNode 사용
    """
    if node and isinstance(node, TradingNode):
        raise HTTPException(400, "Live node running. Stop it first.")

    try:
        # BacktestNode 생성
        config = get_backtest_config()
        backtest_node = BacktestNode(config)

        # 전략 추가
        if strategy_type == "ema_cross":
            strategy_config = EMACrossConfig(
                instrument_id="BTCUSDT.BINANCE",
                bar_type="BTCUSDT.BINANCE-1-MINUTE-LAST-EXTERNAL",
            )
            strategy = EMACrossStrategy(strategy_config)
            backtest_node.trader.add_strategy(strategy)

        # 데이터는 이미 catalog에 있다고 가정
        # 실제로는 DataCatalog에서 로드하는 로직 필요

        # 백테스트 실행
        backtest_node.build()
        await backtest_node.run()

        # 결과 가져오기
        results = backtest_node.analyzer.get_performance_stats()

        await backtest_node.dispose()

        return {
            "status": "completed",
            "results": results
        }

    except Exception as e:
        logger.error(f"Backtest failed: {e}")
        raise HTTPException(500, str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)