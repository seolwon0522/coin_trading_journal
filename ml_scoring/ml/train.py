from __future__ import annotations

import argparse
import time
from pathlib import Path
from typing import List

import numpy as np
import pandas as pd
from joblib import dump
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

from .utils import FEATURE_PATH, METRICS_PATH, MODEL_PATH, WEIGHTS_PATH, ensure_dir, get_logger, save_json


logger = get_logger(__name__)


def train_model(
    csv_path: Path,
    target: str,
    output_dir: Path,
    test_size: float = 0.2,
    random_state: int = 42,
) -> None:
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    df = pd.read_csv(csv_path)
    if target not in df.columns:
        raise ValueError(f"Target column '{target}' not found in CSV")

    feature_cols: List[str] = [c for c in df.columns if c not in {target, "trade_id"}]
    X = df[feature_cols]
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, shuffle=True
    )

    pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            (
                "model",
                XGBRegressor(
                    n_estimators=300,
                    learning_rate=0.05,
                    max_depth=5,
                    subsample=0.9,
                    colsample_bytree=0.9,
                    random_state=42,
                ),
            ),
        ]
    )

    start = time.time()
    pipeline.fit(X_train, y_train)
    train_time = time.time() - start

    preds = pipeline.predict(X_test)
    rmse = float(mean_squared_error(y_test, preds, squared=False))
    r2 = float(r2_score(y_test, preds))

    model = pipeline.named_steps["model"]
    importances = np.clip(model.feature_importances_, a_min=0, a_max=None)
    total = importances.sum()
    if total > 0:
        weights = importances / total
    else:
        weights = np.ones_like(importances) / len(importances)
    weights_dict = {f: float(w) for f, w in zip(feature_cols, weights)}

    ensure_dir(output_dir)
    dump(pipeline, MODEL_PATH)
    save_json(feature_cols, FEATURE_PATH)
    save_json(weights_dict, WEIGHTS_PATH)
    metrics = {"rmse": rmse, "r2": r2, "train_time": train_time}
    save_json(metrics, METRICS_PATH)

    logger.info(f"RMSE: {rmse:.4f}, R2: {r2:.4f}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=str, required=True, help="Path to CSV data")
    parser.add_argument("--target", type=str, required=True, help="Target column name")
    parser.add_argument("--output_dir", type=str, default="artifacts", help="Output directory")
    parser.add_argument("--test_size", type=float, default=0.2)
    parser.add_argument("--random_state", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    train_model(
        csv_path=Path(args.csv),
        target=args.target,
        output_dir=Path(args.output_dir),
        test_size=args.test_size,
        random_state=args.random_state,
    )


if __name__ == "__main__":
    main()
