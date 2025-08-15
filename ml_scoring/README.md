# ML Scoring

This project trains an XGBoost regression model for trade evaluation and exposes predictions and feature weights via FastAPI.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Training

Run the training script with the sample data:

```bash
python -m ml.train --csv data/sample.csv --target return_pct --output_dir artifacts
```

Artifacts (`model.pkl`, `feature_names.json`, `weights.json`, `metrics.json`) are written to the `artifacts/` directory.

## Serving

Start the API server:

```bash
uvicorn app.main:app --reload
```

## Example

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"trades":[{"trade_id":"t1","pnl_ratio":0.3,"entry_timing_score":72,"exit_timing_score":65,"risk_mgmt_score":80}]}'
```

`GET /weights` and `GET /metrics` return the current weights and training metrics respectively.
