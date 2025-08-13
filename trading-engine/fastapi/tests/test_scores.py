import os
import sys
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

# Ensure imports work when running tests from repo root
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import main
from models import Candle, TimeframeEnum


@pytest.fixture(autouse=True)
def mock_candles(monkeypatch):
    async def _fake_get_candles(trade_data):
        return [
            Candle(
                timestamp=1,
                open=1.0,
                high=1.0,
                low=1.0,
                close=1.0,
                volume=1.0,
                symbol=trade_data["pair"],
                timeframe=TimeframeEnum.FIVE_MINUTES,
            )
            for _ in range(20)
        ]

    monkeypatch.setattr(main, "_get_candles_for_trade", _fake_get_candles)


@pytest.fixture
def client():
    return TestClient(main.app)


def _sample_trade():
    return {
        "pair": "BTC/USDT",
        "side": "buy",
        "amount": 1.0,
        "price": 100.0,
        "timestamp": datetime.utcnow().isoformat(),
        "strategy": "test",
        "confidence": 0.5,
        "stop_loss": 90.0,
        "take_profit": 110.0,
        "metadata": {}
    }


def test_breakout_endpoint(client):
    resp = client.post("/api/v1/trade/breakout", json=_sample_trade())
    assert resp.status_code == 200
    body = resp.json()
    assert "total_score" in body


def test_trend_endpoint(client):
    resp = client.post("/api/v1/trade/trend", json=_sample_trade())
    assert resp.status_code == 200
    body = resp.json()
    assert "total_score" in body


def test_mean_reversion_endpoint(client):
    resp = client.post("/api/v1/trade/mean_reversion", json=_sample_trade())
    assert resp.status_code == 200
    body = resp.json()
    assert "total_score" in body
