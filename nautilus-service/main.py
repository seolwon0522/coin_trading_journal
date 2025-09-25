"""
Nautilus Trading Service - Main Application
완전히 재설계된 Nautilus Trader 서비스
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from app.core.nautilus_engine_v2 import NautilusEngineV2
from app.websocket.manager import WebSocketManager
from app.config import settings
from app.strategies.grid_trading import GridTradingStrategy

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# === Pydantic Models ===

class StrategyRequest(BaseModel):
    """전략 생성 요청"""
    strategy_type: str
    strategy_id: str
    config: Dict[str, Any]


class OrderRequest(BaseModel):
    """주문 요청"""
    strategy_id: str
    side: str  # "BUY" or "SELL"
    order_type: str  # "MARKET" or "LIMIT"
    quantity: float
    price: Optional[float] = None


# === Lifecycle Management ===

# Initialize global instances
nautilus_engine = NautilusEngineV2()
ws_manager = WebSocketManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    애플리케이션 생명주기 관리
    """
    # Startup
    logger.info("Starting Nautilus Trading Service...")

    try:
        await nautilus_engine.initialize()
        await nautilus_engine.start()
        logger.info("Nautilus Trading Service started successfully")
    except Exception as e:
        logger.error(f"Failed to start service: {e}")
        raise

    yield

    # Shutdown
    logger.info("Stopping Nautilus Trading Service...")

    try:
        await ws_manager.disconnect_all()
        await nautilus_engine.dispose()
        logger.info("Nautilus Trading Service stopped successfully")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


# === FastAPI Application ===

app = FastAPI(
    title="Nautilus Trading Service",
    version="2.0.0",
    description="Nautilus Trader Best Practice Implementation",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Health Check Endpoints ===

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "engine_running": nautilus_engine.is_running,
        "strategies_count": len(nautilus_engine.strategies),
        "websocket_connections": ws_manager.get_stats()
    }


@app.get("/status")
async def get_status():
    """상세 상태 조회"""
    return {
        "engine": {
            "running": nautilus_engine.is_running,
            "strategies": list(nautilus_engine.strategies.keys())
        },
        "portfolio": nautilus_engine.get_portfolio_status(),
        "risk": nautilus_engine.get_risk_metrics(),
        "websocket": ws_manager.get_stats()
    }


# === Strategy Management Endpoints ===

@app.post("/strategies")
async def create_strategy(request: StrategyRequest):
    """
    새 전략 생성
    """
    try:
        # 엔진에 전략 추가
        strategy_id = nautilus_engine.add_strategy(
            strategy_type=request.strategy_type,
            strategy_id=request.strategy_id,
            config=request.config
        )

        # WebSocket으로 알림
        await ws_manager.broadcast(
            {
                "type": "strategy_created",
                "strategy_id": strategy_id,
                "strategy_type": request.strategy_type
            },
            channel="strategies"
        )

        return {
            "status": "success",
            "strategy_id": strategy_id,
            "message": "Strategy created successfully"
        }

    except Exception as e:
        logger.error(f"Failed to create strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/strategies")
async def list_strategies():
    """
    전략 목록 조회
    """
    strategies = []

    for strategy_id, strategy in nautilus_engine.strategies.items():
        strategies.append({
            "strategy_id": strategy_id,
            "is_running": strategy.is_running,
            "config": strategy.config
        })

    return {"strategies": strategies}


@app.get("/strategies/{strategy_id}")
async def get_strategy(strategy_id: str):
    """
    특정 전략 상세 조회
    """
    return nautilus_engine.get_strategy_info(strategy_id)


@app.post("/strategies/{strategy_id}/start")
async def start_strategy(strategy_id: str):
    """
    전략 시작
    """
    if not nautilus_engine.start_strategy(strategy_id):
        raise HTTPException(status_code=404, detail="Strategy not found")

    # WebSocket 알림
    await ws_manager.broadcast(
        {
            "type": "strategy_started",
            "strategy_id": strategy_id
        },
        channel="strategies"
    )

    return {
        "status": "success",
        "message": f"Strategy {strategy_id} started"
    }


@app.post("/strategies/{strategy_id}/stop")
async def stop_strategy(strategy_id: str):
    """
    전략 중지
    """
    if not nautilus_engine.stop_strategy(strategy_id):
        raise HTTPException(status_code=404, detail="Strategy not found")

    # WebSocket 알림
    await ws_manager.broadcast(
        {
            "type": "strategy_stopped",
            "strategy_id": strategy_id
        },
        channel="strategies"
    )

    return {
        "status": "success",
        "message": f"Strategy {strategy_id} stopped"
    }


@app.delete("/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str):
    """
    전략 삭제
    """
    if not nautilus_engine.remove_strategy(strategy_id):
        raise HTTPException(status_code=404, detail="Strategy not found")

    # WebSocket 알림
    await ws_manager.broadcast(
        {
            "type": "strategy_deleted",
            "strategy_id": strategy_id
        },
        channel="strategies"
    )

    return {
        "status": "success",
        "message": f"Strategy {strategy_id} deleted"
    }


# === Portfolio & Risk Endpoints ===

@app.get("/portfolio")
async def get_portfolio():
    """
    포트폴리오 상태 조회
    """
    return nautilus_engine.get_portfolio_status()


@app.get("/portfolio/performance/{strategy_id}")
async def get_strategy_performance(strategy_id: str):
    """
    전략 성과 조회
    """
    return nautilus_engine.get_strategy_info(strategy_id)


@app.get("/orders")
async def get_orders(strategy_id: Optional[str] = None):
    """
    활성 주문 조회
    """
    return {
        "orders": nautilus_engine.get_active_orders(strategy_id)
    }


@app.get("/positions")
async def get_positions(strategy_id: Optional[str] = None):
    """
    포지션 조회
    """
    return {
        "positions": nautilus_engine.get_positions(strategy_id)
    }


# === Market Data Endpoints ===

@app.post("/market/subscribe")
async def subscribe_market_data(
    instrument_id: str,
    data_types: list[str]
):
    """
    시장 데이터 구독
    """
    try:
        await nautilus_engine.subscribe_market_data(instrument_id, data_types)

        return {
            "status": "success",
            "message": f"Subscribed to {data_types} for {instrument_id}"
        }

    except Exception as e:
        logger.error(f"Failed to subscribe market data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# === WebSocket Endpoint ===

@app.websocket("/ws/trading")
async def websocket_trading(websocket: WebSocket):
    """
    실시간 거래 업데이트 WebSocket
    """
    await ws_manager.connect(websocket, "system")

    try:
        while True:
            # 클라이언트 메시지 처리
            data = await websocket.receive_text()
            await ws_manager.handle_client_message(websocket, data)

    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await ws_manager.disconnect(websocket)


# === Internal API Endpoints (for Backend) ===

@app.post("/internal/strategy/start")
async def internal_start_strategy(request: Dict[str, Any]):
    """
    내부 API - 전략 시작 (Spring Boot에서 호출)
    """
    try:
        strategy_id = request["strategy_id"]
        strategy_type = request["type"]
        config = request.get("params", {})

        # 기본 설정 추가
        config.update({
            "symbol": request.get("symbol", "BTCUSDT.BINANCE"),
            "testnet": request.get("testnet", True)
        })

        # 전략 생성 및 시작
        created_strategy_id = nautilus_engine.add_strategy(
            strategy_type=strategy_type,
            strategy_id=strategy_id,
            config=config
        )
        nautilus_engine.start_strategy(created_strategy_id)

        return {
            "status": "success",
            "strategy_id": strategy_id
        }

    except Exception as e:
        logger.error(f"Failed to start strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/internal/strategy/stop")
async def internal_stop_strategy(strategy_id: str):
    """
    내부 API - 전략 중지 (Spring Boot에서 호출)
    """
    try:
        if not nautilus_engine.stop_strategy(strategy_id):
            raise HTTPException(status_code=404, detail="Strategy not found")

        return {
            "status": "success",
            "strategy_id": strategy_id
        }

    except Exception as e:
        logger.error(f"Failed to stop strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/internal/strategy/status/{strategy_id}")
async def internal_get_strategy_status(strategy_id: str):
    """
    내부 API - 전략 상태 조회 (Spring Boot에서 호출)
    """
    if strategy_id not in nautilus_engine.strategies:
        raise HTTPException(status_code=404, detail="Strategy not found")

    strategy = nautilus_engine.strategies[strategy_id]

    return {
        "strategy_id": strategy_id,
        "active": strategy.is_running if hasattr(strategy, 'is_running') else False,
        "realized_pnl": 0.0,  # TODO: Implement PnL calculation
        "total_trades": 0,  # TODO: Implement trade counting
        "unrealized_pnl": 0.0  # TODO: Calculate unrealized PnL
    }


# === Main Entry Point ===

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_config={
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                },
            },
            "handlers": {
                "default": {
                    "formatter": "default",
                    "class": "logging.StreamHandler",
                    "stream": "ext://sys.stdout",
                },
            },
            "root": {
                "level": "INFO",
                "handlers": ["default"],
            },
        },
    )