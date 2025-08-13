"""
FastAPI Pydantic 모델 정의
코인 트레이딩 시스템에서 사용하는 데이터 모델들
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class TimeframeEnum(str, Enum):
    """타임프레임 열거형"""
    ONE_MINUTE = "1m"
    FIVE_MINUTES = "5m"
    FIFTEEN_MINUTES = "15m"
    THIRTY_MINUTES = "30m"
    ONE_HOUR = "1h"
    FOUR_HOURS = "4h"
    ONE_DAY = "1d"

class Candle(BaseModel):
    """
    캔들스틱 데이터 모델
    거래소에서 제공하는 OHLCV 데이터를 표현
    """
    
    timestamp: int = Field(
        ..., 
        description="캔들 시작 시간 (Unix timestamp, milliseconds)",
        example=1640995200000
    )
    
    open: float = Field(
        ..., 
        description="시가 (Opening price)",
        example=50000.0,
        gt=0
    )
    
    high: float = Field(
        ..., 
        description="고가 (Highest price)",
        example=51000.0,
        gt=0
    )
    
    low: float = Field(
        ..., 
        description="저가 (Lowest price)",
        example=49000.0,
        gt=0
    )
    
    close: float = Field(
        ..., 
        description="종가 (Closing price)",
        example=50500.0,
        gt=0
    )
    
    volume: float = Field(
        ..., 
        description="거래량 (Volume)",
        example=1000.5,
        ge=0
    )
    
    symbol: str = Field(
        ..., 
        description="거래 심볼 (예: BTC/USDT)",
        example="BTC/USDT",
        pattern="^[A-Z0-9]+/[A-Z0-9]+$"
    )
    
    timeframe: TimeframeEnum = Field(
        default=TimeframeEnum.FIVE_MINUTES,
        description="타임프레임",
        example=TimeframeEnum.FIVE_MINUTES
    )
    
    @validator('high')
    def high_must_be_greater_than_low(cls, v, values):
        """고가는 저가보다 커야 함"""
        if 'low' in values and v <= values['low']:
            raise ValueError('고가는 저가보다 커야 합니다')
        return v
    
    @validator('high')
    def high_must_be_greater_than_open_close(cls, v, values):
        """고가는 시가와 종가보다 크거나 같아야 함"""
        if 'open' in values and v < values['open']:
            raise ValueError('고가는 시가보다 크거나 같아야 합니다')
        if 'close' in values and v < values['close']:
            raise ValueError('고가는 종가보다 크거나 같아야 합니다')
        return v
    
    @validator('low')
    def low_must_be_less_than_open_close(cls, v, values):
        """저가는 시가와 종가보다 작거나 같아야 함"""
        if 'open' in values and v > values['open']:
            raise ValueError('저가는 시가보다 작거나 같아야 합니다')
        if 'close' in values and v > values['close']:
            raise ValueError('저가는 종가보다 작거나 같아야 합니다')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "timestamp": 1640995200000,
                "open": 50000.0,
                "high": 51000.0,
                "low": 49000.0,
                "close": 50500.0,
                "volume": 1000.5,
                "symbol": "BTC/USDT",
                "timeframe": "5m"
            }
        }

class TradeInfo(BaseModel):
    """
    거래 정보 모델
    FreqTrade에서 생성된 거래 신호를 표현
    """
    
    pair: str = Field(
        ..., 
        description="거래 페어 (예: BTC/USDT)",
        example="BTC/USDT",
        pattern="^[A-Z0-9]+/[A-Z0-9]+$"
    )
    
    side: str = Field(
        ..., 
        description="거래 방향 (buy/sell)",
        example="buy",
        pattern="^(buy|sell)$"
    )
    
    amount: float = Field(
        ..., 
        description="거래 수량",
        example=0.001,
        gt=0
    )
    
    price: float = Field(
        ..., 
        description="거래 가격",
        example=50000.0,
        gt=0
    )
    
    timestamp: datetime = Field(
        ..., 
        description="거래 시간",
        example="2024-01-01T12:00:00Z"
    )
    
    strategy: str = Field(
        ..., 
        description="사용된 전략 이름",
        example="BreakoutStrategy"
    )
    
    confidence: Optional[float] = Field(
        default=None,
        description="거래 신뢰도 (0.0 ~ 1.0)",
        example=0.85,
        ge=0.0,
        le=1.0
    )
    
    stop_loss: Optional[float] = Field(
        default=None,
        description="손절 가격",
        example=45000.0,
        gt=0
    )
    
    take_profit: Optional[float] = Field(
        default=None,
        description="익절 가격",
        example=55000.0,
        gt=0
    )
    
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="추가 메타데이터",
        example={
            "rsi": 65.5,
            "volume_ratio": 1.2,
            "breakout_level": 51000.0
        }
    )
    
    @validator('take_profit')
    def take_profit_must_be_greater_than_price_for_buy(cls, v, values):
        """매수 시 익절가는 거래가보다 높아야 함"""
        if v and 'side' in values and values['side'] == 'buy' and 'price' in values:
            if v <= values['price']:
                raise ValueError('매수 시 익절가는 거래가보다 높아야 합니다')
        return v
    
    @validator('stop_loss')
    def stop_loss_must_be_less_than_price_for_buy(cls, v, values):
        """매수 시 손절가는 거래가보다 낮아야 함"""
        if v and 'side' in values and values['side'] == 'buy' and 'price' in values:
            if v >= values['price']:
                raise ValueError('매수 시 손절가는 거래가보다 낮아야 합니다')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "pair": "BTC/USDT",
                "side": "buy",
                "amount": 0.001,
                "price": 50000.0,
                "timestamp": "2024-01-01T12:00:00Z",
                "strategy": "BreakoutStrategy",
                "confidence": 0.85,
                "stop_loss": 45000.0,
                "take_profit": 55000.0,
                "metadata": {
                    "rsi": 65.5,
                    "volume_ratio": 1.2,
                    "breakout_level": 51000.0
                }
            }
        }

class ScoreRequest(BaseModel):
    """
    점수 계산 요청 모델
    특정 시점의 시장 데이터에 대한 점수를 계산하기 위한 요청
    """
    
    symbol: str = Field(
        ..., 
        description="분석할 심볼",
        example="BTC/USDT",
        pattern="^[A-Z0-9]+/[A-Z0-9]+$"
    )
    
    timeframe: TimeframeEnum = Field(
        default=TimeframeEnum.FIVE_MINUTES,
        description="분석할 타임프레임",
        example=TimeframeEnum.FIVE_MINUTES
    )
    
    candles: List[Candle] = Field(
        ..., 
        description="분석할 캔들 데이터 (최소 50개 권장)",
        min_items=20,
        max_items=1000
    )
    
    strategy_name: str = Field(
        ..., 
        description="사용할 전략 이름",
        example="BreakoutStrategy"
    )
    
    parameters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="전략 파라미터 (선택사항)",
        example={
            "lookback_period": 20,
            "breakout_threshold": 2,
            "volume_threshold": 500
        }
    )
    
    include_indicators: bool = Field(
        default=True,
        description="지표값 포함 여부",
        example=True
    )
    
    include_signals: bool = Field(
        default=True,
        description="매수/매도 신호 포함 여부",
        example=True
    )
    
    @validator('candles')
    def candles_must_be_sorted_by_timestamp(cls, v):
        """캔들은 시간순으로 정렬되어야 함"""
        if len(v) > 1:
            for i in range(1, len(v)):
                if v[i].timestamp <= v[i-1].timestamp:
                    raise ValueError('캔들은 시간순으로 정렬되어야 합니다')
        return v
    
    @validator('candles')
    def candles_must_have_same_symbol(cls, v):
        """모든 캔들은 같은 심볼이어야 함"""
        if len(v) > 1:
            first_symbol = v[0].symbol
            for candle in v[1:]:
                if candle.symbol != first_symbol:
                    raise ValueError('모든 캔들은 같은 심볼이어야 합니다')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "symbol": "BTC/USDT",
                "timeframe": "5m",
                "candles": [
                    {
                        "timestamp": 1640995200000,
                        "open": 50000.0,
                        "high": 51000.0,
                        "low": 49000.0,
                        "close": 50500.0,
                        "volume": 1000.5,
                        "symbol": "BTC/USDT",
                        "timeframe": "5m"
                    }
                ],
                "strategy_name": "BreakoutStrategy",
                "parameters": {
                    "lookback_period": 20,
                    "breakout_threshold": 2,
                    "volume_threshold": 500
                },
                "include_indicators": True,
                "include_signals": True
            }
        }

class ScoreResponse(BaseModel):
    """
    점수 계산 응답 모델
    """
    
    symbol: str = Field(
        ..., 
        description="분석한 심볼",
        example="BTC/USDT"
    )
    
    timestamp: datetime = Field(
        ..., 
        description="분석 시간",
        example="2024-01-01T12:00:00Z"
    )
    
    score: float = Field(
        ..., 
        description="계산된 점수 (-1.0 ~ 1.0)",
        example=0.75,
        ge=-1.0,
        le=1.0
    )
    
    signal: str = Field(
        ..., 
        description="매수/매도 신호 (buy/sell/hold)",
        example="buy",
        pattern="^(buy|sell|hold)$"
    )
    
    confidence: float = Field(
        ..., 
        description="신뢰도 (0.0 ~ 1.0)",
        example=0.85,
        ge=0.0,
        le=1.0
    )
    
    indicators: Optional[Dict[str, float]] = Field(
        default=None,
        description="계산된 지표값들",
        example={
            "rsi": 65.5,
            "bb_upper": 51000.0,
            "bb_lower": 49000.0,
            "sma_20": 50200.0,
            "volume_ratio": 1.2
        }
    )
    
    reasoning: Optional[str] = Field(
        default=None,
        description="점수 계산 근거",
        example="볼린저 밴드 상단 돌파, RSI 65.5로 적정 수준, 거래량 20% 증가"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "symbol": "BTC/USDT",
                "timestamp": "2024-01-01T12:00:00Z",
                "score": 0.75,
                "signal": "buy",
                "confidence": 0.85,
                "indicators": {
                    "rsi": 65.5,
                    "bb_upper": 51000.0,
                    "bb_lower": 49000.0,
                    "sma_20": 50200.0,
                    "volume_ratio": 1.2
                },
                "reasoning": "볼린저 밴드 상단 돌파, RSI 65.5로 적정 수준, 거래량 20% 증가"
            }
        }

class TradeScoreResponse(BaseModel):
    """
    거래 점수 계산 응답 모델
    """
    
    status: str = Field(
        ..., 
        description="응답 상태",
        example="success"
    )
    
    symbol: str = Field(
        ..., 
        description="분석한 심볼",
        example="BTC/USDT"
    )
    
    timestamp: str = Field(
        ..., 
        description="분석 시간",
        example="2024-01-01T12:00:00Z"
    )
    
    total_score: float = Field(
        ..., 
        description="계산된 총점 (0.0 ~ 100.0)",
        example=75.0,
        ge=0.0,
        le=100.0
    )
    
    signal: str = Field(
        ..., 
        description="매수/매도 신호 (buy/sell/hold)",
        example="buy",
        pattern="^(buy|sell|hold)$"
    )
    
    confidence: float = Field(
        ..., 
        description="신뢰도 (0.0 ~ 1.0)",
        example=0.85,
        ge=0.0,
        le=1.0
    )
    
    indicators: Optional[Dict[str, float]] = Field(
        default=None,
        description="계산된 지표값들",
        example={
            "rsi": 65.5,
            "bb_upper": 51000.0,
            "bb_lower": 49000.0,
            "sma_20": 50200.0,
            "volume_ratio": 1.2
        }
    )
    
    reasoning: Optional[str] = Field(
        default=None,
        description="점수 계산 근거",
        example="볼린저 밴드 상단 돌파, RSI 65.5로 적정 수준, 거래량 20% 증가"
    )
    
    trade_info: Dict[str, Any] = Field(
        ..., 
        description="원본 거래 정보",
        example={
            "pair": "BTC/USDT",
            "side": "buy",
            "amount": 0.001,
            "price": 50000.0
        }
    )
    
    processed_at: str = Field(
        ..., 
        description="처리 완료 시간",
        example="2024-01-01T12:00:00Z"
    )
    
    sub_scores: Optional[Dict[str, float]] = Field(
        default=None,
        description="세부 점수들",
        example={
            "bollinger_score": 0.8,
            "rsi_score": 0.6,
            "volume_score": 0.7
        }
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "symbol": "BTC/USDT",
                "timestamp": "2024-01-01T12:00:00Z",
                "total_score": 0.75,
                "signal": "buy",
                "confidence": 0.85,
                "indicators": {
                    "rsi": 65.5,
                    "bb_upper": 51000.0,
                    "bb_lower": 49000.0,
                    "sma_20": 50200.0,
                    "volume_ratio": 1.2
                },
                "reasoning": "볼린저 밴드 상단 돌파, RSI 65.5로 적정 수준, 거래량 20% 증가",
                "trade_info": {
                    "pair": "BTC/USDT",
                    "side": "buy",
                    "amount": 0.001,
                    "price": 50000.0,
                    "timestamp": "2024-01-01T12:00:00Z",
                    "strategy": "BreakoutStrategy",
                    "confidence": 0.85,
                    "stop_loss": 45000.0,
                    "take_profit": 55000.0,
                    "metadata": {
                        "rsi": 65.5,
                        "volume_ratio": 1.2,
                        "breakout_level": 51000.0
                    }
                },
                "processed_at": "2024-01-01T12:00:00Z",
                "sub_scores": {
                    "bollinger_score": 0.8,
                    "rsi_score": 0.6,
                    "volume_score": 0.7,
                    "ma_score": 0.5,
                    "momentum_score": 0.4,
                    "breakout_score": 0.9,
                    "volatility_score": 0.3,
                    "trend_score": 0.2
                }
            }
        } 