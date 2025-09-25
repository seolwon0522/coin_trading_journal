"""
Nautilus Trader Microservice
FastAPI server that provides Nautilus Trader functionality to Spring Boot backend
"""
import os
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
from decimal import Decimal

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

from nautilus_integration import NautilusService

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(
    title="Nautilus Trader Service",
    version="1.0.0",
    description="Microservice for automated trading strategies using Nautilus Trader"
)

# Configure CORS for Spring Boot
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000"],  # Spring Boot and Next.js
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Nautilus Service
nautilus_service = NautilusService()


# Pydantic models for request/response
class StrategyConfig(BaseModel):
    strategy_id: str
    user_id: int
    type: str  # 'ema_cross', 'market_maker', 'orderbook_imbalance'
    symbol: str
    params: Dict[str, Any]
    testnet: bool = True


class BacktestRequest(BaseModel):
    strategy_config: StrategyConfig
    start_date: str
    end_date: str
    initial_balance: float = 10000.0


class StrategyStatus(BaseModel):
    strategy_id: str
    is_active: bool
    start_time: Optional[datetime]
    positions: list
    unrealized_pnl: float
    realized_pnl: float
    total_trades: int


class BacktestResult(BaseModel):
    strategy_id: str
    start_date: str
    end_date: str
    total_return: float
    win_rate: float
    max_drawdown: float
    sharpe_ratio: float
    total_trades: int
    trades: list
    equity_curve: list


# Health check
@app.get("/health")
async def health_check():
    """Check if service is running"""
    return {"status": "healthy", "service": "nautilus-trader"}


# Strategy Management Endpoints
@app.post("/internal/strategy/start")
async def start_strategy(config: StrategyConfig, background_tasks: BackgroundTasks):
    """Start a trading strategy"""
    try:
        # Start strategy in background to avoid blocking
        background_tasks.add_task(
            nautilus_service.start_strategy,
            strategy_id=config.strategy_id,
            strategy_type=config.type,
            symbol=config.symbol,
            params=config.params,
            testnet=config.testnet
        )

        return {
            "status": "starting",
            "strategy_id": config.strategy_id,
            "message": f"Strategy {config.strategy_id} is being started"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/internal/strategy/stop")
async def stop_strategy(strategy_id: str):
    """Stop a running strategy"""
    try:
        result = await nautilus_service.stop_strategy(strategy_id)
        return {
            "status": "stopped",
            "strategy_id": strategy_id,
            "message": f"Strategy {strategy_id} has been stopped",
            "final_stats": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/internal/strategy/status/{strategy_id}")
async def get_strategy_status(strategy_id: str):
    """Get current status of a strategy"""
    try:
        status = await nautilus_service.get_strategy_status(strategy_id)
        if not status:
            raise HTTPException(status_code=404, detail=f"Strategy {strategy_id} not found")

        return StrategyStatus(**status)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/internal/strategy/list")
async def list_strategies():
    """List all active strategies"""
    try:
        strategies = await nautilus_service.list_active_strategies()
        return {"strategies": strategies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Backtesting Endpoints
@app.post("/internal/backtest/run")
async def run_backtest(request: BacktestRequest):
    """Run a backtest for a strategy"""
    try:
        result = await nautilus_service.run_backtest(
            strategy_type=request.strategy_config.type,
            symbol=request.strategy_config.symbol,
            params=request.strategy_config.params,
            start_date=request.start_date,
            end_date=request.end_date,
            initial_balance=request.initial_balance
        )

        return BacktestResult(
            strategy_id=request.strategy_config.strategy_id,
            start_date=request.start_date,
            end_date=request.end_date,
            **result
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/internal/backtest/progress/{task_id}")
async def get_backtest_progress(task_id: str):
    """Get backtest progress for long-running backtests"""
    try:
        progress = await nautilus_service.get_backtest_progress(task_id)
        if not progress:
            raise HTTPException(status_code=404, detail=f"Backtest task {task_id} not found")
        return progress
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Real-time Data Endpoints
@app.get("/internal/market/ticker/{symbol}")
async def get_ticker(symbol: str):
    """Get current ticker data for a symbol"""
    try:
        ticker = await nautilus_service.get_ticker(symbol)
        return ticker
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/internal/market/orderbook/{symbol}")
async def get_orderbook(symbol: str, limit: int = 20):
    """Get orderbook data for a symbol"""
    try:
        orderbook = await nautilus_service.get_orderbook(symbol, limit)
        return orderbook
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Position Management
@app.get("/internal/positions/active")
async def get_active_positions():
    """Get all active positions across strategies"""
    try:
        positions = await nautilus_service.get_all_positions()
        return {"positions": positions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/internal/positions/close/{position_id}")
async def close_position(position_id: str):
    """Manually close a position"""
    try:
        result = await nautilus_service.close_position(position_id)
        return {
            "status": "closed",
            "position_id": position_id,
            "pnl": result.get("pnl")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Risk Management
@app.post("/internal/risk/emergency-stop")
async def emergency_stop_all():
    """Emergency stop all strategies and close all positions"""
    try:
        result = await nautilus_service.emergency_stop_all()
        return {
            "status": "emergency_stopped",
            "strategies_stopped": result.get("strategies_stopped"),
            "positions_closed": result.get("positions_closed"),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/internal/risk/exposure")
async def get_risk_exposure():
    """Get current risk exposure across all strategies"""
    try:
        exposure = await nautilus_service.calculate_risk_exposure()
        return exposure
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# WebSocket endpoint for real-time updates
from fastapi import WebSocket, WebSocketDisconnect
from typing import Set

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                # Connection might be closed
                pass

manager = ConnectionManager()


@app.websocket("/ws/trading")
async def websocket_trading_updates(websocket: WebSocket):
    """WebSocket for real-time trading updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and send updates
            data = await websocket.receive_text()

            # Subscribe to specific strategy updates
            if data.startswith("subscribe:"):
                strategy_id = data.split(":")[1]
                # Register subscription for specific strategy
                await nautilus_service.subscribe_to_strategy(strategy_id, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


# Startup and Shutdown Events
@app.on_event("startup")
async def startup_event():
    """Initialize Nautilus Trader on startup"""
    print("Starting Nautilus Trader Service...")
    await nautilus_service.initialize()
    print("Nautilus Trader Service started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Clean shutdown of all strategies"""
    print("Shutting down Nautilus Trader Service...")
    await nautilus_service.shutdown()
    print("Nautilus Trader Service shut down successfully")


if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8001)),
        reload=os.getenv("ENV", "development") == "development"
    )