from __future__ import annotations

from typing import Any, Dict, List, Tuple

import pandas as pd
from joblib import load

from .utils import FEATURE_PATH, METRICS_PATH, MODEL_PATH, WEIGHTS_PATH, load_json


def load_artifacts() -> Tuple[Any, List[str], Dict[str, float], Dict[str, float]]:
    model = load(MODEL_PATH)
    feature_names: List[str] = load_json(FEATURE_PATH)
    weights: Dict[str, float] = load_json(WEIGHTS_PATH)
    metrics: Dict[str, float] = load_json(METRICS_PATH)
    return model, feature_names, weights, metrics


def predict(trades: List[Dict[str, Any]]) -> List[float]:
    model, feature_names, _, _ = load_artifacts()
    df = pd.DataFrame(trades)
    X = df[feature_names]
    preds = model.predict(X)
    return preds.tolist()
