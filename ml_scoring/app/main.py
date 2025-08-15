from __future__ import annotations

from pathlib import Path
from typing import List

import pandas as pd
from fastapi import FastAPI, HTTPException
from joblib import load

from ml.utils import (
    FEATURE_PATH,
    METRICS_PATH,
    MODEL_PATH,
    WEIGHTS_PATH,
    load_json,
)
from .schemas import Prediction, PredictionResponse, TradesRequest

app = FastAPI(title="ML Scoring")

model = None
feature_names: List[str] = []
weights = {}
metrics = {}


@app.on_event("startup")
def load_artifacts() -> None:
    global model, feature_names, weights, metrics
    if not MODEL_PATH.exists():
        raise RuntimeError("Model artifact not found. Please run training first.")
    model = load(MODEL_PATH)
    feature_names = load_json(FEATURE_PATH)
    weights = load_json(WEIGHTS_PATH)
    metrics = load_json(METRICS_PATH)


@app.post("/predict", response_model=PredictionResponse)
def predict(request: TradesRequest) -> PredictionResponse:
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    df = pd.DataFrame([t.model_dump() for t in request.trades])
    try:
        X = df[feature_names]
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=f"Missing features: {exc}")
    preds = model.predict(X)
    predictions = [
        Prediction(trade_id=t.trade_id, pred_return_pct=float(p))
        for t, p in zip(request.trades, preds)
    ]
    return PredictionResponse(predictions=predictions, weights=weights, metrics=metrics)


@app.get("/weights")
def get_weights() -> dict:
    if not weights:
        raise HTTPException(status_code=500, detail="Weights not loaded")
    return weights


@app.get("/metrics")
def get_metrics() -> dict:
    if not metrics:
        raise HTTPException(status_code=500, detail="Metrics not loaded")
    return metrics
