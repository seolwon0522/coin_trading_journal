"""FastAPI application entrypoint for Nautilus service."""
from __future__ import annotations

from contextlib import asynccontextmanager
from copy import deepcopy
from datetime import datetime
import logging
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.models import NodeMode
from app.api.routes import backtest_router, node_router, portfolio_router, strategy_router
from app.config import settings
from app.core.node_manager import NodeManager
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)
logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))


@asynccontextmanager
async def lifespan(app: FastAPI):
    manager = NodeManager.get_instance()
    try:
        yield
    finally:
        await manager.shutdown()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# ------------------------------------------------------------------
# Routers
# ------------------------------------------------------------------
app.include_router(node_router, prefix=settings.api_prefix)
app.include_router(strategy_router, prefix=settings.api_prefix)
app.include_router(portfolio_router, prefix=settings.api_prefix)
app.include_router(backtest_router, prefix=settings.api_prefix)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/health")
async def health():
    manager = NodeManager.get_instance()
    status = await manager.get_node_status()
    return {
        "status": "ok" if status.is_running else "idle",
        "node": status.dict(),
        "websocket": ws_manager.get_stats(),
    }


# ------------------------------------------------------------------
# Internal endpoints (Spring backend compatibility)
# ------------------------------------------------------------------
@app.post("/internal/strategy/start")
async def internal_start_strategy(payload: Dict[str, Any]):
    manager = NodeManager.get_instance()

    strategy_id = str(payload.get("strategy_id") or "").strip() or None
    strategy_type = payload.get("type") or payload.get("strategy_type")
    if not strategy_type:
        raise HTTPException(status_code=400, detail="strategy type is required")

    instrument_id = payload.get("symbol", "BTCUSDT.BINANCE")
    params = deepcopy(payload.get("params") or {})
    timeframe = params.pop("timeframe", payload.get("timeframe", "1m"))
    testnet_enabled = bool(payload.get("testnet", True))
    mode = NodeMode.PAPER if testnet_enabled else NodeMode.LIVE

    await manager.ensure_node_running(mode=mode)

    existing = strategy_id and await manager.get_strategy(strategy_id)
    if existing:
        if not existing.is_running:
            await manager.start_strategy(existing.id)
        return {"status": "success", "strategy_id": existing.id}

    info = await manager.add_strategy(
        strategy_type=strategy_type,
        instrument_id=instrument_id,
        timeframe=timeframe,
        parameters=params,
        strategy_id=strategy_id,
        auto_start=True,
    )
    return {"status": "success", "strategy_id": info.id}


@app.post("/internal/strategy/stop")
async def internal_stop_strategy(strategy_id: str):
    manager = NodeManager.get_instance()
    info = await manager.get_strategy(strategy_id)
    if not info:
        raise HTTPException(status_code=404, detail="Strategy not found")
    await manager.stop_strategy(strategy_id)
    return {"status": "success", "strategy_id": strategy_id}


@app.get("/internal/strategy/status/{strategy_id}")
async def internal_strategy_status(strategy_id: str):
    manager = NodeManager.get_instance()
    info = await manager.get_strategy(strategy_id)
    if not info:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {
        "strategy_id": info.id,
        "active": info.is_running,
        "realized_pnl": info.total_pnl,
        "unrealized_pnl": 0.0,
        "total_trades": 0,
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }


# ------------------------------------------------------------------
# WebSocket endpoint
# ------------------------------------------------------------------
@app.websocket("/ws/trading")
async def websocket_trading(websocket: WebSocket):
    await ws_manager.connect(websocket, channel="system")
    try:
        while True:
            message = await websocket.receive_text()
            await ws_manager.handle_client_message(websocket, message)
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as exc:
        logger.error("WebSocket error: %s", exc)
        await ws_manager.disconnect(websocket)



