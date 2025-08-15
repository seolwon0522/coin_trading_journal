from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel


class Trade(BaseModel):
    trade_id: str
    pnl_ratio: Optional[float] = None
    entry_timing_score: Optional[float] = None
    exit_timing_score: Optional[float] = None
    risk_mgmt_score: Optional[float] = None


class TradesRequest(BaseModel):
    trades: List[Trade]


class Prediction(BaseModel):
    trade_id: str
    pred_return_pct: float


class PredictionResponse(BaseModel):
    predictions: List[Prediction]
    weights: Dict[str, float]
    metrics: Dict[str, float]
