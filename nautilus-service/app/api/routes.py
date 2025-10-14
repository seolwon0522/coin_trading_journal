"""
API Routes for Nautilus Trading Service
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
import logging
from datetime import datetime
import asyncio

from app.api.models import (
    NodeStartRequest, NodeStatus,
    StrategyAddRequest, StrategyUpdateRequest, StrategyInfo,
    BacktestRequest, BacktestResult,
    PortfolioSummary, PositionInfo, OrderInfo,
    ErrorResponse, SuccessResponse
)
from app.core.node_manager import NodeManager

logger = logging.getLogger(__name__)

# Create router instances
node_router = APIRouter(prefix="/node", tags=["Node Management"])
strategy_router = APIRouter(prefix="/strategies", tags=["Strategy Management"])
portfolio_router = APIRouter(prefix="/portfolio", tags=["Portfolio"])
backtest_router = APIRouter(prefix="/backtest", tags=["Backtesting"])

# Dependency to get node manager
async def get_node_manager():
    """Get the singleton NodeManager instance"""
    return NodeManager.get_instance()


# Node Management Routes
@node_router.post("/start", response_model=SuccessResponse)
async def start_node(
    request: NodeStartRequest,
    manager: NodeManager = Depends(get_node_manager)
):
    """Start the trading node with specified configuration"""
    try:
        await manager.start_node(request.mode, request.config_overrides)
        return SuccessResponse(
            message=f"Node started in {request.mode} mode",
            data={"mode": request.mode, "started_at": datetime.now().isoformat()}
        )
    except Exception as e:
        logger.error(f"Failed to start node: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@node_router.post("/stop", response_model=SuccessResponse)
async def stop_node(manager: NodeManager = Depends(get_node_manager)):
    """Stop the running trading node"""
    try:
        await manager.stop_node()
        return SuccessResponse(message="Node stopped successfully")
    except Exception as e:
        logger.error(f"Failed to stop node: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@node_router.get("/status", response_model=NodeStatus)
async def get_node_status(manager: NodeManager = Depends(get_node_manager)):
    """Get current node status"""
    try:
        return await manager.get_node_status()
    except Exception as e:
        logger.error(f"Failed to get node status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@node_router.post("/restart", response_model=SuccessResponse)
async def restart_node(manager: NodeManager = Depends(get_node_manager)):
    """Restart the trading node"""
    try:
        current_status = await manager.get_node_status()
        if current_status.is_running:
            await manager.stop_node()
            await asyncio.sleep(2)  # Brief pause before restart

        await manager.start_node(current_status.mode)
        return SuccessResponse(message="Node restarted successfully")
    except Exception as e:
        logger.error(f"Failed to restart node: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Strategy Management Routes
@strategy_router.post("/add", response_model=StrategyInfo)
async def add_strategy(
    request: StrategyAddRequest,
    manager: NodeManager = Depends(get_node_manager)
):
    """Add a new strategy to the trading node"""
    try:
        strategy_info = await manager.add_strategy(
            strategy_type=request.strategy_type,
            instrument_id=request.instrument_id,
            timeframe=request.timeframe,
            parameters=request.parameters,
            strategy_id=request.strategy_id,
        )
        return strategy_info
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to add strategy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@strategy_router.get("/", response_model=List[StrategyInfo])
async def list_strategies(manager: NodeManager = Depends(get_node_manager)):
    """List all active strategies"""
    try:
        return await manager.list_strategies()
    except Exception as e:
        logger.error(f"Failed to list strategies: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@strategy_router.get("/{strategy_id}", response_model=StrategyInfo)
async def get_strategy(
    strategy_id: str,
    manager: NodeManager = Depends(get_node_manager)
):
    """Get details of a specific strategy"""
    try:
        strategy = await manager.get_strategy(strategy_id)
        if not strategy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Strategy {strategy_id} not found"
            )
        return strategy
    except HTTPException:
        raise
    except NotImplementedError as e:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get strategy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@strategy_router.patch("/{strategy_id}", response_model=StrategyInfo)
async def update_strategy(
    strategy_id: str,
    request: StrategyUpdateRequest,
    manager: NodeManager = Depends(get_node_manager)
):
    """Update strategy parameters"""
    try:
        updated_strategy = await manager.update_strategy(
            strategy_id=strategy_id,
            parameters=request.parameters,
            restart=request.restart
        )
        return updated_strategy
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update strategy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@strategy_router.delete("/{strategy_id}", response_model=SuccessResponse)
async def remove_strategy(
    strategy_id: str,
    manager: NodeManager = Depends(get_node_manager)
):
    """Remove a strategy from the trading node"""
    try:
        await manager.remove_strategy(strategy_id)
        return SuccessResponse(
            message=f"Strategy {strategy_id} removed successfully"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to remove strategy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@strategy_router.post("/{strategy_id}/start", response_model=SuccessResponse)
async def start_strategy(
    strategy_id: str,
    manager: NodeManager = Depends(get_node_manager)
):
    """Start a specific strategy"""
    try:
        await manager.start_strategy(strategy_id)
        return SuccessResponse(
            message=f"Strategy {strategy_id} started successfully"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to start strategy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@strategy_router.post("/{strategy_id}/stop", response_model=SuccessResponse)
async def stop_strategy(
    strategy_id: str,
    manager: NodeManager = Depends(get_node_manager)
):
    """Stop a specific strategy"""
    try:
        await manager.stop_strategy(strategy_id)
        return SuccessResponse(
            message=f"Strategy {strategy_id} stopped successfully"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to stop strategy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Portfolio Routes
@portfolio_router.get("/summary", response_model=PortfolioSummary)
async def get_portfolio_summary(manager: NodeManager = Depends(get_node_manager)):
    """Get portfolio summary including positions and balances"""
    try:
        return await manager.get_portfolio_summary()
    except Exception as e:
        logger.error(f"Failed to get portfolio summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@portfolio_router.get("/positions", response_model=List[PositionInfo])
async def get_positions(manager: NodeManager = Depends(get_node_manager)):
    """Get all open positions"""
    try:
        return await manager.get_positions()
    except Exception as e:
        logger.error(f"Failed to get positions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@portfolio_router.get("/orders", response_model=List[OrderInfo])
async def get_orders(
    status: Optional[str] = None,
    manager: NodeManager = Depends(get_node_manager)
):
    """Get orders with optional status filter"""
    try:
        return await manager.get_orders(status=status)
    except Exception as e:
        logger.error(f"Failed to get orders: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@portfolio_router.post("/positions/{position_id}/close", response_model=SuccessResponse)
async def close_position(
    position_id: str,
    manager: NodeManager = Depends(get_node_manager)
):
    """Close a specific position"""
    try:
        await manager.close_position(position_id)
        return SuccessResponse(
            message=f"Position {position_id} closed successfully"
        )
    except NotImplementedError as e:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to close position: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@portfolio_router.post("/positions/close-all", response_model=SuccessResponse)
async def close_all_positions(manager: NodeManager = Depends(get_node_manager)):
    """Close all open positions"""
    try:
        count = await manager.close_all_positions()
        return SuccessResponse(
            message=f"Closed {count} positions successfully",
            data={"closed_count": count}
        )
    except NotImplementedError as e:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to close all positions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Backtesting Routes
@backtest_router.post("/run", response_model=BacktestResult)
async def run_backtest(
    request: BacktestRequest,
    manager: NodeManager = Depends(get_node_manager)
):
    """Run a backtest with specified parameters and real-time progress updates via WebSocket"""
    from app.websocket.manager import ws_manager

    # Progress callback for WebSocket updates
    async def progress_callback(progress_data: dict):
        """Send progress updates to WebSocket clients"""
        try:
            await ws_manager.broadcast(
                {
                    "type": "backtest_progress",
                    "stage": progress_data.get("stage", "running"),
                    "progress": progress_data.get("progress", 0),
                    "message": progress_data.get("message", ""),
                    "long_trades": progress_data.get("long_trades", 0),
                    "short_trades": progress_data.get("short_trades", 0),
                    "total_trades": progress_data.get("total_trades", 0),
                    "win_rate": progress_data.get("win_rate", 0),
                },
                channel="backtest"
            )
        except Exception as e:
            logger.error(f"Failed to send progress update: {e}")

    try:
        result = await manager.run_backtest(
            strategy_type=request.strategy_type,
            instrument_id=request.instrument_id,
            timeframe=request.timeframe,
            start_date=request.start_date,
            end_date=request.end_date,
            parameters=request.parameters,
            initial_balance=request.initial_balance,
        )
        return result
    except NotImplementedError as e:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to run backtest: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@backtest_router.get("/results/{backtest_id}", response_model=BacktestResult)
async def get_backtest_result(
    backtest_id: str,
    manager: NodeManager = Depends(get_node_manager)
):
    """Get results of a completed backtest"""
    try:
        result = await manager.get_backtest_result(backtest_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backtest {backtest_id} not found"
            )
        return result
    except HTTPException:
        raise
    except NotImplementedError as e:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get backtest result: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@backtest_router.get("/history", response_model=List[BacktestResult])
async def get_backtest_history(
    limit: int = 10,
    manager: NodeManager = Depends(get_node_manager)
):
    """Get history of recent backtests"""
    try:
        return await manager.get_backtest_history(limit=limit)
    except NotImplementedError as e:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get backtest history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )