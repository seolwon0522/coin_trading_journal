"""
Backtest API Router for Nautilus Trading Service
Provides endpoints for running backtests using Nautilus Trader engine
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import pandas as pd

from nautilus_trader.backtest.engine import BacktestEngine, BacktestEngineConfig
from nautilus_trader.backtest.data import BacktestDataConfig
from nautilus_trader.backtest.modules import FXRolloverInterestModule
from nautilus_trader.model.currencies import USD
from nautilus_trader.model.enums import AccountType, OmsType
from nautilus_trader.model.identifiers import TraderId, StrategyId, Venue
from nautilus_trader.model.objects import Money

from app.redis_bridge import get_redis_bridge

router = APIRouter(prefix="/api/v1/backtest", tags=["backtest"])


class BacktestRequest(BaseModel):
    """Request model for running a backtest"""
    strategy_type: str = Field(..., description="Strategy type (ema_cross, market_maker, etc.)")
    symbol: str = Field(..., description="Trading symbol (e.g., BTCUSDT)")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD)")
    initial_balance: float = Field(10000.0, description="Initial balance in USDT")
    parameters: Dict[str, Any] = Field({}, description="Strategy parameters")

    # Advanced options
    use_tick_data: bool = Field(False, description="Use tick data instead of bars")
    include_fees: bool = Field(True, description="Include trading fees")
    slippage_model: Optional[str] = Field(None, description="Slippage model to use")
    risk_free_rate: float = Field(0.0, description="Risk-free rate for Sharpe ratio")


class BacktestResult(BaseModel):
    """Result model for backtest"""
    backtest_id: str
    status: str
    strategy_type: str
    symbol: str
    period: str

    # Performance metrics
    total_return: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float

    # Risk metrics
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    max_drawdown_duration_days: int

    # Trade statistics
    avg_win: float
    avg_loss: float
    profit_factor: float
    expectancy: float

    # Additional metrics
    total_pnl: float
    commission_paid: float
    positions_closed: int
    final_balance: float

    # Equity curve
    equity_curve: List[Dict[str, Any]]
    trades: List[Dict[str, Any]]


class BacktestStatus(BaseModel):
    """Status model for ongoing backtest"""
    backtest_id: str
    status: str  # "pending", "running", "completed", "failed"
    progress: float  # 0.0 to 100.0
    message: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


# Store for backtest results (should use database in production)
backtest_store: Dict[str, Any] = {}


async def run_nautilus_backtest(
    request: BacktestRequest,
    backtest_id: str
) -> BacktestResult:
    """
    Run backtest using Nautilus Trader engine
    """
    try:
        # Update status
        backtest_store[backtest_id]["status"] = "running"

        # Configure backtest engine
        config = BacktestEngineConfig(
            trader_id=TraderId("BACKTESTER-001"),
            log_level="INFO",
            cache_database=None,  # Use in-memory cache
            bypass_logging=False,
        )

        # Create engine
        engine = BacktestEngine(config)

        # Add venue
        engine.add_venue(
            venue=Venue("BINANCE"),
            oms_type=OmsType.NETTING,
            account_type=AccountType.MARGIN,
            base_currency=USD,
            starting_balances=[Money(request.initial_balance, USD)],
        )

        # Load historical data
        data_config = BacktestDataConfig(
            data_cls="BinanceBar",
            catalog_path="./data/catalog",
            catalog_fs_protocol="file",
            instrument_id=f"{request.symbol}.BINANCE",
            start_time=datetime.strptime(request.start_date, "%Y-%m-%d"),
            end_time=datetime.strptime(request.end_date, "%Y-%m-%d"),
        )

        # Add data to engine
        engine.add_data(data_config)

        # Create and add strategy based on type
        strategy = create_strategy(
            request.strategy_type,
            request.symbol,
            request.parameters
        )
        engine.add_strategy(strategy)

        # Run backtest
        engine.run()

        # Process results
        result = process_backtest_results(engine, request, backtest_id)

        # Update store
        backtest_store[backtest_id]["status"] = "completed"
        backtest_store[backtest_id]["result"] = result

        # Publish to Redis
        redis_bridge = await get_redis_bridge()
        await redis_bridge.publish_event(
            channel="backtest",
            event_type="backtest_completed",
            data=result.dict(),
            metadata={"backtest_id": backtest_id}
        )

        return result

    except Exception as e:
        # Update status
        backtest_store[backtest_id]["status"] = "failed"
        backtest_store[backtest_id]["error"] = str(e)
        raise


def create_strategy(strategy_type: str, symbol: str, parameters: dict):
    """Create strategy instance based on type"""

    if strategy_type == "ema_cross":
        from nautilus_trader.examples.strategies.ema_cross import EMACross, EMACrossConfig

        config = EMACrossConfig(
            instrument_id=f"{symbol}.BINANCE",
            bar_type=f"{symbol}.BINANCE-1-MINUTE-LAST-INTERNAL",
            fast_ema_period=parameters.get("fast_ema_period", 10),
            slow_ema_period=parameters.get("slow_ema_period", 20),
            trade_size=Decimal(str(parameters.get("trade_size", 0.001))),
        )
        return EMACross(config)

    elif strategy_type == "market_maker":
        # Import and configure market maker strategy
        pass

    else:
        raise ValueError(f"Unknown strategy type: {strategy_type}")


def process_backtest_results(
    engine: BacktestEngine,
    request: BacktestRequest,
    backtest_id: str
) -> BacktestResult:
    """Process and format backtest results"""

    # Get portfolio
    portfolio = engine.trader.portfolio

    # Get account
    account = engine.trader.accounts[0]

    # Get positions
    positions = list(engine.cache.positions())
    closed_positions = [p for p in positions if p.is_closed]

    # Calculate metrics
    returns = calculate_returns(closed_positions)

    # Calculate win rate
    winning = len([p for p in closed_positions if p.realized_pnl > 0])
    losing = len([p for p in closed_positions if p.realized_pnl < 0])
    win_rate = (winning / len(closed_positions) * 100) if closed_positions else 0

    # Get equity curve
    equity_curve = get_equity_curve(engine)

    # Get trade list
    trades = format_trades(closed_positions)

    # Calculate additional metrics
    metrics = calculate_advanced_metrics(returns, request.risk_free_rate)

    return BacktestResult(
        backtest_id=backtest_id,
        status="completed",
        strategy_type=request.strategy_type,
        symbol=request.symbol,
        period=f"{request.start_date} to {request.end_date}",
        total_return=metrics["total_return"],
        total_trades=len(closed_positions),
        winning_trades=winning,
        losing_trades=losing,
        win_rate=win_rate,
        sharpe_ratio=metrics["sharpe_ratio"],
        sortino_ratio=metrics["sortino_ratio"],
        max_drawdown=metrics["max_drawdown"],
        max_drawdown_duration_days=metrics["max_drawdown_days"],
        avg_win=metrics["avg_win"],
        avg_loss=metrics["avg_loss"],
        profit_factor=metrics["profit_factor"],
        expectancy=metrics["expectancy"],
        total_pnl=float(account.balance_total()),
        commission_paid=metrics["commission_paid"],
        positions_closed=len(closed_positions),
        final_balance=float(account.balance_total()),
        equity_curve=equity_curve,
        trades=trades
    )


def calculate_returns(positions):
    """Calculate returns from closed positions"""
    returns = []
    for position in positions:
        if position.is_closed:
            returns.append(float(position.realized_pnl))
    return returns


def calculate_advanced_metrics(returns: List[float], risk_free_rate: float) -> dict:
    """Calculate advanced performance metrics"""

    if not returns:
        return {
            "total_return": 0.0,
            "sharpe_ratio": 0.0,
            "sortino_ratio": 0.0,
            "max_drawdown": 0.0,
            "max_drawdown_days": 0,
            "avg_win": 0.0,
            "avg_loss": 0.0,
            "profit_factor": 0.0,
            "expectancy": 0.0,
            "commission_paid": 0.0
        }

    # Convert to pandas series for easier calculation
    returns_series = pd.Series(returns)

    # Calculate metrics
    total_return = returns_series.sum()
    avg_return = returns_series.mean()
    std_return = returns_series.std()

    # Sharpe ratio
    sharpe = ((avg_return - risk_free_rate) / std_return *
              (252 ** 0.5)) if std_return > 0 else 0

    # Sortino ratio (downside deviation)
    downside_returns = returns_series[returns_series < 0]
    downside_std = downside_returns.std() if len(downside_returns) > 0 else 0
    sortino = ((avg_return - risk_free_rate) / downside_std *
               (252 ** 0.5)) if downside_std > 0 else 0

    # Win/Loss statistics
    wins = returns_series[returns_series > 0]
    losses = returns_series[returns_series < 0]

    avg_win = wins.mean() if len(wins) > 0 else 0
    avg_loss = abs(losses.mean()) if len(losses) > 0 else 0

    # Profit factor
    gross_profit = wins.sum() if len(wins) > 0 else 0
    gross_loss = abs(losses.sum()) if len(losses) > 0 else 0
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0

    # Expectancy
    win_rate = len(wins) / len(returns) if len(returns) > 0 else 0
    loss_rate = len(losses) / len(returns) if len(returns) > 0 else 0
    expectancy = (win_rate * avg_win) - (loss_rate * avg_loss)

    # Drawdown calculation
    cumulative = returns_series.cumsum()
    running_max = cumulative.cummax()
    drawdown = (cumulative - running_max) / running_max
    max_drawdown = abs(drawdown.min()) * 100 if len(drawdown) > 0 else 0

    # Max drawdown duration calculation
    max_drawdown_days = 0
    if len(drawdown) > 0:
        in_drawdown = False
        current_duration = 0
        for dd_value in drawdown:
            if dd_value < -0.001:  # In drawdown (more than 0.1%)
                in_drawdown = True
                current_duration += 1
                max_drawdown_days = max(max_drawdown_days, current_duration)
            else:
                in_drawdown = False
                current_duration = 0

    # Commission calculation from account state
    commission_paid = 0.0
    try:
        account = engine.cache.account(account_id=engine.engine.portfolio.account.id)
        if account:
            # Calculate total commission from filled orders
            for event in account.events:
                if hasattr(event, 'commission') and event.commission:
                    commission_paid += float(event.commission.as_double())
    except Exception as e:
        logger.warning(f"Could not extract commission: {e}")

    return {
        "total_return": float(total_return),
        "sharpe_ratio": float(sharpe),
        "sortino_ratio": float(sortino),
        "max_drawdown": float(max_drawdown),
        "max_drawdown_days": int(max_drawdown_days),
        "avg_win": float(avg_win),
        "avg_loss": float(avg_loss),
        "profit_factor": float(profit_factor),
        "expectancy": float(expectancy),
        "commission_paid": float(commission_paid)
    }


def get_equity_curve(engine: BacktestEngine) -> List[Dict[str, Any]]:
    """Extract equity curve from backtest engine"""
    try:
        account = engine.cache.account(account_id=engine.engine.portfolio.account.id)
        if not account:
            return []

        # Extract balance snapshots over time
        equity_curve = []
        last_balance = float(account.balance_total().as_double())

        # Get all position events to build equity curve
        positions = engine.cache.positions()
        for position in positions:
            if position.is_closed and position.ts_closed:
                # Calculate equity at each position close
                equity_point = {
                    "timestamp": position.ts_closed.isoformat(),
                    "equity": last_balance + float(position.realized_pnl),
                    "pnl": float(position.realized_pnl)
                }
                equity_curve.append(equity_point)
                last_balance = equity_point["equity"]

        # If no closed positions, return initial balance
        if not equity_curve:
            equity_curve.append({
                "timestamp": engine.engine.clock.timestamp.isoformat(),
                "equity": last_balance,
                "pnl": 0.0
            })

        return equity_curve

    except Exception as e:
        logger.warning(f"Could not extract equity curve: {e}")
        return []


def format_trades(positions) -> List[Dict[str, Any]]:
    """Format closed positions as trade list"""
    trades = []
    for position in positions:
        if position.is_closed:
            trades.append({
                "id": str(position.id),
                "symbol": str(position.instrument_id),
                "side": position.entry.name,
                "entry_price": float(position.avg_open_px),
                "exit_price": float(position.avg_close_px),
                "quantity": float(position.quantity),
                "pnl": float(position.realized_pnl),
                "entry_time": position.ts_opened.isoformat(),
                "exit_time": position.ts_closed.isoformat() if position.ts_closed else None,
            })
    return trades


# API Endpoints

@router.post("/run", response_model=BacktestStatus)
async def start_backtest(
    request: BacktestRequest,
    background_tasks: BackgroundTasks
):
    """
    Start a new backtest
    """
    # Generate backtest ID
    backtest_id = str(uuid4())

    # Initialize status
    backtest_store[backtest_id] = {
        "status": "pending",
        "request": request,
        "started_at": datetime.utcnow().isoformat()
    }

    # Run backtest in background
    background_tasks.add_task(
        run_nautilus_backtest,
        request,
        backtest_id
    )

    return BacktestStatus(
        backtest_id=backtest_id,
        status="pending",
        progress=0.0,
        message="Backtest queued for execution",
        started_at=datetime.utcnow().isoformat()
    )


@router.get("/{backtest_id}/status", response_model=BacktestStatus)
async def get_backtest_status(backtest_id: str):
    """
    Get status of a backtest
    """
    if backtest_id not in backtest_store:
        raise HTTPException(status_code=404, detail="Backtest not found")

    data = backtest_store[backtest_id]

    return BacktestStatus(
        backtest_id=backtest_id,
        status=data["status"],
        progress=100.0 if data["status"] == "completed" else 50.0,
        message=data.get("error") if data["status"] == "failed" else None,
        started_at=data.get("started_at"),
        completed_at=data.get("completed_at")
    )


@router.get("/{backtest_id}/result", response_model=BacktestResult)
async def get_backtest_result(backtest_id: str):
    """
    Get result of a completed backtest
    """
    if backtest_id not in backtest_store:
        raise HTTPException(status_code=404, detail="Backtest not found")

    data = backtest_store[backtest_id]

    if data["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Backtest is {data['status']}, not completed"
        )

    return data["result"]


@router.get("/history", response_model=List[BacktestStatus])
async def get_backtest_history(
    limit: int = 10,
    strategy_type: Optional[str] = None
):
    """
    Get history of backtests
    """
    results = []

    for backtest_id, data in backtest_store.items():
        if strategy_type and data["request"].strategy_type != strategy_type:
            continue

        results.append(BacktestStatus(
            backtest_id=backtest_id,
            status=data["status"],
            progress=100.0 if data["status"] == "completed" else 50.0,
            started_at=data.get("started_at")
        ))

    # Sort by start time and limit
    results.sort(key=lambda x: x.started_at or "", reverse=True)
    return results[:limit]


@router.delete("/{backtest_id}")
async def delete_backtest(backtest_id: str):
    """
    Delete a backtest result
    """
    if backtest_id not in backtest_store:
        raise HTTPException(status_code=404, detail="Backtest not found")

    del backtest_store[backtest_id]
    return {"message": "Backtest deleted successfully"}