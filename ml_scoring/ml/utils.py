from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict

ARTIFACT_DIR = Path(__file__).resolve().parent.parent / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "model.pkl"
FEATURE_PATH = ARTIFACT_DIR / "feature_names.json"
WEIGHTS_PATH = ARTIFACT_DIR / "weights.json"
METRICS_PATH = ARTIFACT_DIR / "metrics.json"


def get_logger(name: str) -> logging.Logger:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
    return logging.getLogger(name)


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_json(data: Dict[str, Any] | list, path: Path) -> None:
    with path.open("w") as f:
        json.dump(data, f, indent=2)


def load_json(path: Path) -> Dict[str, Any] | list:
    with path.open() as f:
        return json.load(f)
