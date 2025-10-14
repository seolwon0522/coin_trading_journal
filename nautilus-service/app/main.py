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
from app.api.validation import validate_strategy_params, translate_validation_error, get_strategy_schema
from app.config import settings
from app.core.node_manager import NodeManager
from app.websocket.manager import ws_manager
from pydantic import ValidationError

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
    try:
        manager = NodeManager.get_instance()
        # Timeout 추가하여 무한 대기 방지
        import asyncio
        status = await asyncio.wait_for(manager.get_node_status(), timeout=1.0)
        return {
            "status": "ok" if status.is_running else "idle",
            "node": status.dict(),
            "websocket": ws_manager.get_stats(),
        }
    except asyncio.TimeoutError:
        # Timeout 시 기본 응답 반환
        return {
            "status": "idle",
            "node": {"status": "idle", "is_running": False},
            "websocket": ws_manager.get_stats(),
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "error",
            "error": str(e),
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

    # ✨ NEW: 파라미터 검증
    try:
        validated_params = validate_strategy_params(strategy_type, params)
        logger.info(f"Strategy params validated: {strategy_type}")
    except ValidationError as e:
        error_msg = translate_validation_error(e)
        logger.warning(f"Strategy validation failed: {error_msg}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "파라미터 검증 실패",
                "message": error_msg,
                "strategy_type": strategy_type,
                "params": params
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Check if strategy already exists
    existing = strategy_id and await manager.get_strategy(strategy_id)
    if existing:
        # Ensure node is running before starting strategy
        await manager.ensure_node_running(mode=mode)
        if not existing.is_running:
            await manager.start_strategy(existing.id)
        return {"status": "success", "strategy_id": existing.id}

    # Add new strategy (this will handle node initialization/restart internally)
    # Set the mode via environment variable before adding strategy
    if mode == NodeMode.PAPER:
        import os
        os.environ["BINANCE_TESTNET"] = "true"
    elif mode == NodeMode.LIVE:
        import os
        os.environ["BINANCE_TESTNET"] = "false"
    
    info = await manager.add_strategy(
        strategy_type=strategy_type,
        instrument_id=instrument_id,
        timeframe=timeframe,
        parameters=validated_params,  # ✨ 검증된 파라미터 사용
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
# Validation endpoints
# ------------------------------------------------------------------
@app.get("/api/strategies/schema/{strategy_type}")
async def get_strategy_param_schema(strategy_type: str):
    """
    전략 파라미터 스키마 조회
    Frontend에서 동적 폼 생성에 사용
    """
    try:
        schema = get_strategy_schema(strategy_type)
        return {
            "strategy_type": strategy_type,
            "schema": schema,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/strategies/validate")
async def validate_strategy_parameters(payload: Dict[str, Any]):
    """
    전략 파라미터 검증 테스트
    실제 전략 실행 없이 파라미터만 검증
    """
    strategy_type = payload.get("strategy_type")
    params = payload.get("params", {})
    
    if not strategy_type:
        raise HTTPException(status_code=400, detail="strategy_type is required")
    
    try:
        validated_params = validate_strategy_params(strategy_type, params)
        return {
            "valid": True,
            "strategy_type": strategy_type,
            "validated_params": validated_params,
            "message": "파라미터 검증 성공"
        }
    except ValidationError as e:
        error_msg = translate_validation_error(e)
        return {
            "valid": False,
            "strategy_type": strategy_type,
            "errors": error_msg,
            "message": "파라미터 검증 실패"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ------------------------------------------------------------------
# WebSocket endpoints
# ------------------------------------------------------------------
@app.websocket("/ws/trading")
async def websocket_trading(websocket: WebSocket):
    """WebSocket endpoint for real-time trading updates"""
    client_ip = websocket.client.host if websocket.client else "unknown"
    logger.info("WebSocket connection attempt from %s", client_ip)
    
    try:
        await ws_manager.connect(websocket, channel="system")
        logger.info("WebSocket connected successfully from %s", client_ip)
        
        while True:
            try:
                message = await websocket.receive_text()
                logger.debug("Received message from %s: %s", client_ip, message[:100])
                await ws_manager.handle_client_message(websocket, message)
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected by client %s", client_ip)
                break
            except Exception as exc:
                logger.error("Error processing message from %s: %s", client_ip, exc)
                # Continue processing other messages instead of breaking
                continue
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected during connection from %s", client_ip)
    except Exception as exc:
        logger.error("WebSocket connection error from %s: %s", client_ip, exc)
    finally:
        await ws_manager.disconnect(websocket)
        logger.info("WebSocket cleanup completed for %s", client_ip)


@app.websocket("/ws/backtest")
async def websocket_backtest(websocket: WebSocket):
    """WebSocket endpoint for backtest progress updates"""
    await ws_manager.connect(websocket, channel="backtest")
    try:
        while True:
            message = await websocket.receive_text()
            await ws_manager.handle_client_message(websocket, message)
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, channel="backtest")
    except Exception as exc:
        logger.error("WebSocket backtest error: %s", exc)
        await ws_manager.disconnect(websocket, channel="backtest")


@app.websocket("/ws")
async def websocket_main(websocket: WebSocket):
    """Main WebSocket endpoint - clients can subscribe to multiple channels"""
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



