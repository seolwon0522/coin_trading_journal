"""
Strategy Models and DTOs
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
from decimal import Decimal


class StrategyType(str, Enum):
    """Available strategy types"""
    EMA_CROSS = "ema_cross"
    MARKET_MAKER = "market_maker"
    ORDERBOOK_IMBALANCE = "orderbook_imbalance"


class StrategyStatus(str, Enum):
    """Strategy status"""
    IDLE = "idle"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error"


class OrderSide(str, Enum):
    """Order side"""
    BUY = "buy"
    SELL = "sell"


class OrderType(str, Enum):
    """Order type"""
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"


class OrderStatus(str, Enum):
    """Order status"""
    NEW = "new"
    PARTIALLY_FILLED = "partially_filled"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"


class PositionSide(str, Enum):
    """Position side"""
    LONG = "long"
    SHORT = "short"


# Base Models
class EMAParameters(BaseModel):
    """EMA Cross strategy parameters"""
    fast_ema_period: int = Field(default=10, ge=1, le=50)
    slow_ema_period: int = Field(default=20, ge=2, le=200)
    trade_size: float = Field(default=0.001, gt=0)
    use_bracket_orders: bool = True
    stop_loss_pct: float = Field(default=0.02, ge=0, le=0.1)
    take_profit_pct: float = Field(default=0.05, ge=0, le=0.2)

    @validator('slow_ema_period')
    def validate_ema_periods(cls, v, values):
        if 'fast_ema_period' in values and v <= values['fast_ema_period']:
            raise ValueError('Slow EMA period must be greater than fast EMA period')
        return v


class MarketMakerParameters(BaseModel):
    """Market Maker strategy parameters"""
    trade_size: float = Field(default=0.01, gt=0)
    atr_period: int = Field(default=20, ge=1, le=100)
    atr_multiple: float = Field(default=6.0, ge=1, le=20)
    max_inventory: float = Field(default=0.1, gt=0)
    spread_multiplier: float = Field(default=1.5, ge=0.1, le=5)
    skew_factor: float = Field(default=0.5, ge=0, le=1)


class OrderbookImbalanceParameters(BaseModel):
    """Orderbook Imbalance strategy parameters"""
    trade_size: float = Field(default=0.001, gt=0)
    book_depth: int = Field(default=10, ge=1, le=50)
    imbalance_threshold: float = Field(default=0.6, ge=0.5, le=0.9)
    min_volume_ratio: float = Field(default=2.0, ge=1, le=10)
    lookback_period: int = Field(default=20, ge=5, le=100)


# Request/Response Models
class CreateStrategyRequest(BaseModel):
    """Request to create a new strategy"""
    name: str = Field(..., min_length=1, max_length=100)
    strategy_type: StrategyType
    symbol: str = Field(..., pattern="^[A-Z]+USDT$")
    parameters: Dict[str, Any]
    capital: float = Field(default=10000.0, gt=0)
    leverage: int = Field(default=1, ge=1, le=20)
    testnet: bool = True

    class Config:
        schema_extra = {
            "example": {
                "name": "EMA Cross BTC",
                "strategy_type": "ema_cross",
                "symbol": "BTCUSDT",
                "parameters": {
                    "fast_ema_period": 10,
                    "slow_ema_period": 20,
                    "trade_size": 0.001
                },
                "capital": 10000,
                "leverage": 1,
                "testnet": True
            }
        }


class StartStrategyRequest(BaseModel):
    """Request to start a strategy"""
    capital: Optional[float] = Field(default=None, gt=0)
    leverage: Optional[int] = Field(default=None, ge=1, le=20)
    force: bool = False  # Force start even if already running


class ModifyStrategyRequest(BaseModel):
    """Request to modify strategy parameters"""
    parameters: Dict[str, Any]
    restart: bool = True  # Restart strategy after modification


class StrategyResponse(BaseModel):
    """Strategy response"""
    id: str
    name: str
    strategy_type: StrategyType
    symbol: str
    status: StrategyStatus
    parameters: Dict[str, Any]
    capital: float
    leverage: int
    created_at: datetime
    started_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    error_message: Optional[str] = None


class PositionResponse(BaseModel):
    """Position response"""
    id: str
    strategy_id: str
    symbol: str
    side: PositionSide
    quantity: float
    entry_price: float
    current_price: float
    unrealized_pnl: float
    realized_pnl: float
    created_at: datetime


class OrderResponse(BaseModel):
    """Order response"""
    id: str
    strategy_id: str
    symbol: str
    type: OrderType
    side: OrderSide
    quantity: float
    price: Optional[float]
    status: OrderStatus
    filled_quantity: float
    average_price: Optional[float]
    created_at: datetime
    updated_at: datetime


class PerformanceMetrics(BaseModel):
    """Performance metrics for a strategy"""
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate: float = 0.0
    realized_pnl: float = 0.0
    unrealized_pnl: float = 0.0
    total_pnl: float = 0.0
    max_drawdown: float = 0.0
    sharpe_ratio: Optional[float] = None
    sortino_ratio: Optional[float] = None
    calmar_ratio: Optional[float] = None
    average_win: float = 0.0
    average_loss: float = 0.0
    profit_factor: float = 0.0


class StrategyStatusResponse(BaseModel):
    """Detailed strategy status"""
    strategy: StrategyResponse
    positions: List[PositionResponse]
    open_orders: List[OrderResponse]
    performance: PerformanceMetrics
    risk_metrics: Dict[str, float]


class BacktestRequest(BaseModel):
    """Request to run a backtest"""
    strategy_type: StrategyType
    symbol: str
    parameters: Dict[str, Any]
    start_date: datetime
    end_date: datetime
    initial_capital: float = Field(default=10000.0, gt=0)
    leverage: int = Field(default=1, ge=1, le=20)

    @validator('end_date')
    def validate_dates(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v


class BacktestResult(BaseModel):
    """Backtest result"""
    id: str
    strategy_type: StrategyType
    symbol: str
    parameters: Dict[str, Any]
    start_date: datetime
    end_date: datetime
    initial_capital: float
    final_capital: float
    total_return: float
    annualized_return: float
    max_drawdown: float
    sharpe_ratio: float
    sortino_ratio: float
    win_rate: float
    total_trades: int
    trades: List[Dict[str, Any]]
    equity_curve: List[Dict[str, float]]
    monthly_returns: Dict[str, float]


class MarketDataResponse(BaseModel):
    """Market data response"""
    symbol: str
    bid_price: float
    ask_price: float
    last_price: float
    volume_24h: float
    high_24h: float
    low_24h: float
    timestamp: datetime


class OrderbookResponse(BaseModel):
    """Orderbook response"""
    symbol: str
    bids: List[List[float]]  # [[price, quantity], ...]
    asks: List[List[float]]  # [[price, quantity], ...]
    timestamp: datetime


class RiskExposureResponse(BaseModel):
    """Risk exposure response"""
    total_exposure: float
    position_count: int
    long_exposure: float
    short_exposure: float
    max_position_size: float
    current_drawdown: float
    var_95: Optional[float]  # Value at Risk (95% confidence)
    cvar_95: Optional[float]  # Conditional Value at Risk
    timestamp: datetime


class EmergencyStopResponse(BaseModel):
    """Emergency stop response"""
    strategies_stopped: List[str]
    positions_closed: int
    total_pnl: float
    timestamp: datetime


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    uptime: float
    active_strategies: int
    total_positions: int
    trading_node_active: bool
    binance_connected: bool
    database_connected: bool
    redis_connected: bool
    timestamp: datetime