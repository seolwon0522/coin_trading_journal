from datetime import datetime
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

TradingType = Literal['breakout', 'trend', 'counter_trend']
Side = Literal['buy', 'sell']
Status = Literal['open', 'closed']

class Indicators(BaseModel):
    volume: Optional[float] = None
    averageVolume: Optional[float] = None
    prevRangeHigh: Optional[float] = None
    trendlineHigh: Optional[float] = None  # 추세선 상단 값 (엔트리 시점)
    atr: Optional[float] = None  # 변동성(예: ATR14)
    stopLossWithinLimit: Optional[bool] = None
    htfTrend: Optional[Literal['up', 'down', 'sideways']] = None
    htfTrend2: Optional[Literal['up', 'down', 'sideways']] = None  # 보조 상위 TF
    pullbackOk: Optional[bool] = None
    trailStopCorrect: Optional[bool] = None
    zscore: Optional[float] = None
    reversalSignal: Optional[bool] = None
    riskReward: Optional[float] = None
    # 엔트리 캔들 품질(윗꼬리/아랫꼬리 비율)
    entryCandleUpperWickRatio: Optional[float] = None
    entryCandleLowerWickRatio: Optional[float] = None
    # 볼린저 밴드 위치: 0=하단밴드, 1=상단밴드
    bollingerPercent: Optional[float] = None

class StrategyCriterionScore(BaseModel):
    code: str
    description: str
    weight: float
    ratio: float
    score: int
    maxPoints: int

class StrategyScoreResult(BaseModel):
    strategy: TradingType
    totalScore: int
    criteria: List[StrategyCriterionScore]

class ForbiddenViolation(BaseModel):
    rule_code: str
    description: str
    severity: Literal['high', 'medium', 'low']
    score_penalty: int
    detected_at: datetime
    details: Optional[Dict[str, Any]] = None

class CreateTradeRequest(BaseModel):
    symbol: str
    type: Side
    tradingType: TradingType
    quantity: float
    entryPrice: float
    exitPrice: Optional[float] = None
    entryTime: datetime
    exitTime: Optional[datetime] = None
    memo: Optional[str] = None
    stopLoss: Optional[float] = None
    indicators: Optional[Indicators] = None

class Trade(BaseModel):
    id: str
    symbol: str
    type: Side
    tradingType: TradingType
    quantity: float
    entryPrice: float
    exitPrice: Optional[float] = None
    entryTime: datetime
    exitTime: Optional[datetime] = None
    memo: Optional[str] = None
    pnl: Optional[float] = None
    status: Status
    stopLoss: Optional[float] = None
    indicators: Optional[Indicators] = None
    strategyScore: Optional[StrategyScoreResult] = None
    forbiddenPenalty: Optional[int] = None
    finalScore: Optional[int] = None
    forbiddenViolations: Optional[List[ForbiddenViolation]] = None
    createdAt: datetime
    updatedAt: datetime

class TradesResponse(BaseModel):
    trades: List[Trade]
    total: int
    page: int
    limit: int

# 주간 패턴 분석 스키마
class WeeklyAnalysisRequest(BaseModel):
    user_id: str
    start: str  # YYYY-MM-DD 형식
    end: str    # YYYY-MM-DD 형식

class PatternDetail(BaseModel):
    title: str
    why: str
    actions: List[str]

class WeeklyAnalysisResult(BaseModel):
    improvements: List[str]
    top_loss_pattern: PatternDetail
    top_profit_pattern: PatternDetail

class WeeklyAnalysisResponse(BaseModel):
    success: bool
    summary_id: Optional[int] = None
    analysis: Optional[WeeklyAnalysisResult] = None
    message: Optional[str] = None

class PatternHistoryItem(BaseModel):
    id: int
    period_start: str
    period_end: str
    pattern_type: str
    title: str
    why: str
    actions: List[str]
    summary_id: int
    created_at: str

class PatternHistoryResponse(BaseModel):
    patterns: List[PatternHistoryItem]
    total: int