"""
Strategy API Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Path, status
from typing import List, Optional
import logging

from app.core.strategy_manager import StrategyManager
from app.models.strategy import (
    CreateStrategyRequest, StartStrategyRequest, ModifyStrategyRequest,
    StrategyResponse, StrategyStatusResponse, PositionResponse,
    OrderResponse, PerformanceMetrics, StrategyStatus,
    RiskExposureResponse, EmergencyStopResponse
)
from app.core.exceptions import (
    StrategyNotFoundError, StrategyAlreadyExistsError,
    MaxStrategiesReachedError, InvalidParametersError
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/strategies", tags=["strategies"])

# Dependency to get strategy manager instance
async def get_strategy_manager() -> StrategyManager:
    """Get strategy manager instance"""
    # In production, this would be injected from app state
    from app.main import app
    return app.state.strategy_manager


@router.post("/", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
async def create_strategy(
    request: CreateStrategyRequest,
    manager: StrategyManager = Depends(get_strategy_manager)
):
    """
    Create a new trading strategy
    """
    try:
        strategy = await manager.create_strategy(
            name=request.name,
            strategy_type=request.strategy_type,
            symbol=request.symbol,
            parameters=request.parameters,
            capital=request.capital,
            leverage=request.leverage,
            testnet=request.testnet
        )
        return strategy
    except StrategyAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except MaxStrategiesReachedError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create strategy: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/", response_model=List[StrategyResponse])
async def list_strategies(
    status_filter: Optional[StrategyStatus] = Query(None, alias="status"),
    manager: StrategyManager = Depends(get_strategy_manager)
):
    """
    List all strategies
    """
    try:
        strategies = await manager.list_strategies(status=status_filter)
        return strategies
    except Exception as e:
        logger.error(f"Failed to list strategies: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{strategy_id}", response_model=StrategyResponse)
async def get_strategy(
    strategy_id: str = Path(..., description="Strategy ID"),
    manager: StrategyManager = Depends(get_strategy_manager)
):
    """
    Get strategy details
    """
    try:
        strategy = await manager.get_strategy(strategy_id)
        return strategy
    except StrategyNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get strategy {strategy_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{strategy_id}/start", response_model=StrategyResponse)
async def start_strategy(
    strategy_id: str = Path(..., description="Strategy ID"),
    request: Optional[StartStrategyRequest] = None,
    manager: StrategyManager = Depends(get_strategy_manager)
):
    """
    Start a trading strategy
    """
    try:
        strategy = await manager.start_strategy(
            strategy_id,
            force=request.force if request else False
        )
        return strategy
    except StrategyNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to start strategy {strategy_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{strategy_id}/stop")
async def stop_strategy(
    strategy_id: str = Path(..., description="Strategy ID"),
    manager: StrategyManager = Depends(get_strategy_manager)
):
    """
    Stop a running strategy
    """
    try:
        result = await manager.stop_strategy(strategy_id)
        return result
    except StrategyNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to stop strategy {strategy_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_strategy(
    strategy_id: str = Path(..., description="Strategy ID"),
    manager: StrategyManager = Depends(get_strategy_manager)
):
    """
    Delete a strategy
    """
    try:
        await manager.delete_strategy(strategy_id)
        return None
    except StrategyNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete strategy {strategy_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{strategy_id}/positions", response_model=List[PositionResponse])
async def get_strategy_positions(
    strategy_id: str = Path(..., description="Strategy ID"),
    manager: StrategyManager = Depends(get_strategy_manager)
):
    """
    Get positions for a strategy
    """
    try:
        positions = await manager.get_strategy_positions(strategy_id)
        return positions
    except StrategyNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get positions for strategy {strategy_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{strategy_id}/performance", response_model=PerformanceMetrics)
async def get_strategy_performance(
    strategy_id: str = Path(..., description="Strategy ID"),
    manager: StrategyManager = Depends(get_strategy_manager)
):
    """
    Get performance metrics for a strategy
    """
    try:
        metrics = await manager.get_strategy_performance(strategy_id)
        return metrics
    except StrategyNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get performance for strategy {strategy_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/risk/exposure", response_model=RiskExposureResponse)
async def get_risk_exposure(
    manager: StrategyManager = Depends(get_strategy_manager)
):
    """
    Get total risk exposure across all strategies
    """
    try:
        exposure = await manager.get_risk_exposure()
        return exposure
    except Exception as e:
        logger.error(f"Failed to calculate risk exposure: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/emergency-stop", response_model=EmergencyStopResponse)
async def emergency_stop_all(
    manager: StrategyManager = Depends(get_strategy_manager)
):
    """
    Emergency stop all strategies
    """
    try:
        result = await manager.emergency_stop_all()
        return EmergencyStopResponse(
            strategies_stopped=result["strategies_stopped"],
            positions_closed=0,  # Would need to implement
            total_pnl=0.0,  # Would need to calculate
            timestamp=result["timestamp"]
        )
    except Exception as e:
        logger.error(f"Failed to emergency stop: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))