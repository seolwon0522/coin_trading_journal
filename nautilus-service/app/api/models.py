"""
API Request/Response Models for Nautilus Trading Service
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime
from enum import Enum


class NodeMode(str, Enum):
    """Trading node operation modes"""
    LIVE = "live"
    BACKTEST = "backtest"
    PAPER = "paper"


class StrategyType(str, Enum):
    """Available strategy types"""
    EMA_CROSS = "ema_cross"
    GRID = "grid"
    ORDERBOOK_IMBALANCE = "orderbook_imbalance"
    MOMENTUM = "momentum"
    VOLATILITY_MM = "volatility_mm"
    RSI = "rsi"
    BOLLINGER_BANDS = "bollinger_bands"


class TimeFrame(str, Enum):
    """Supported timeframes"""
    ONE_MIN = "1m"
    FIVE_MIN = "5m"
    FIFTEEN_MIN = "15m"
    THIRTY_MIN = "30m"
    ONE_HOUR = "1h"
    FOUR_HOUR = "4h"
    ONE_DAY = "1d"


# Request Models
class NodeStartRequest(BaseModel):
    """Request to start a trading node"""
    mode: NodeMode = NodeMode.LIVE
    config_overrides: Optional[Dict[str, Any]] = None


class StrategyAddRequest(BaseModel):
    """Request to add a strategy"""
    strategy_type: StrategyType
    instrument_id: str = Field(default="BTCUSDT.BINANCE")
    timeframe: TimeFrame = Field(default=TimeFrame.ONE_MIN)
    parameters: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "example": {
                "strategy_type": "ema_cross",
                "instrument_id": "BTCUSDT.BINANCE",
                "timeframe": "1m",
                "parameters": {
                    "fast_period": 10,
                    "slow_period": 20,
                    "trade_size": "0.01",
                    "max_positions": 1,
                    "stop_loss_pct": 0.02,
                    "take_profit_pct": 0.03
                }
            }
        }


class StrategyUpdateRequest(BaseModel):
    """Request to update strategy parameters"""
    parameters: Dict[str, Any]
    restart: bool = Field(default=False, description="Restart strategy after update")


class BacktestRequest(BaseModel):
    """Request to run a backtest"""
    strategy_type: StrategyType
    instrument_id: str = Field(default="BTCUSDT.BINANCE")
    timeframe: TimeFrame = Field(default=TimeFrame.ONE_MIN)
    start_date: str = Field(description="Start date in YYYY-MM-DD format")
    end_date: str = Field(description="End date in YYYY-MM-DD format")
    parameters: Dict[str, Any] = Field(default_factory=dict)
    initial_balance: float = Field(default=10000.0)

    class Config:
        json_schema_extra = {
            "example": {
                "strategy_type": "ema_cross",
                "instrument_id": "BTCUSDT.BINANCE",
                "timeframe": "1m",
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
                "parameters": {
                    "fast_period": 10,
                    "slow_period": 20,
                    "trade_size": "0.01"
                },
                "initial_balance": 10000
            }
        }


# Response Models
class NodeStatus(BaseModel):
    """Node status response"""
    status: str
    is_running: bool
    mode: Optional[str] = None
    trader_id: Optional[str] = None
    machine_id: Optional[str] = None
    instance_id: Optional[str] = None
    uptime_seconds: Optional[float] = None
    memory_usage_mb: Optional[float] = None


class StrategyInfo(BaseModel):
    """Strategy information"""
    id: str
    type: str
    instrument_id: str
    is_running: bool
    is_initialized: bool
    parameters: Dict[str, Any]
    position_count: int = 0
    total_pnl: float = 0.0
    created_at: datetime


class PositionInfo(BaseModel):
    """Position information"""
    id: str
    symbol: str
    side: str
    quantity: float
    entry_price: float
    current_price: Optional[float] = None
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0
    opened_at: datetime


class OrderInfo(BaseModel):
    """Order information"""
    id: str
    symbol: str
    side: str
    type: str
    quantity: float
    price: Optional[float] = None
    status: str
    filled_quantity: float = 0.0
    avg_fill_price: Optional[float] = None
    created_at: datetime


class AccountBalance(BaseModel):
    """Account balance information"""
    currency: str
    total: float
    free: float
    locked: float


class PortfolioSummary(BaseModel):
    """Portfolio summary"""
    total_value_usdt: float
    positions: List[PositionInfo]
    balances: List[AccountBalance]
    position_count: int
    total_unrealized_pnl: float
    total_realized_pnl: float


class BacktestResult(BaseModel):
    """Backtest result summary"""
    strategy_id: str
    status: str
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    avg_win: float
    avg_loss: float
    largest_win: float
    largest_loss: float
    start_date: str
    end_date: str
    initial_balance: float
    final_balance: float
    execution_time_seconds: float


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class SuccessResponse(BaseModel):
    """Success response"""
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.now)


# WebSocket Messages
class WSMessage(BaseModel):
    """Base WebSocket message"""
    type: str
    timestamp: datetime = Field(default_factory=datetime.now)
    data: Dict[str, Any]


class MarketDataMessage(WSMessage):
    """Market data WebSocket message"""
    type: str = "market_data"
    symbol: str
    bid: float
    ask: float
    last: float
    volume: float


class OrderUpdateMessage(WSMessage):
    """Order update WebSocket message"""
    type: str = "order_update"
    order: OrderInfo


class PositionUpdateMessage(WSMessage):
    """Position update WebSocket message"""
    type: str = "position_update"
    position: PositionInfo


class TradeExecutionMessage(WSMessage):
    """Trade execution WebSocket message"""
    type: str = "trade_execution"
    trade_id: str
    symbol: str
    side: str
    quantity: float
    price: float
    commission: float
    commission_asset: str