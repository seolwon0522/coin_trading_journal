"""
Nautilus Trading Service Configuration
중앙 집중식 설정 관리
"""

import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    애플리케이션 설정
    """

    # === 기본 설정 ===
    APP_NAME: str = "Nautilus Trading Service"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

    # === Binance API 설정 ===
    BINANCE_API_KEY: Optional[str] = os.getenv("BINANCE_API_KEY")
    BINANCE_SECRET_KEY: Optional[str] = os.getenv("BINANCE_SECRET_KEY")
    USE_TESTNET: bool = os.getenv("USE_TESTNET", "True").lower() == "true"

    # Binance URLs
    BINANCE_HTTP_BASE_URL: str = os.getenv(
        "BINANCE_HTTP_BASE_URL",
        "https://testnet.binance.vision" if os.getenv("USE_TESTNET", "True").lower() == "true"
        else "https://api.binance.com"
    )
    BINANCE_WS_BASE_URL: str = os.getenv(
        "BINANCE_WS_BASE_URL",
        "wss://testnet.binance.vision/ws" if os.getenv("USE_TESTNET", "True").lower() == "true"
        else "wss://stream.binance.com:9443/ws"
    )

    # === Redis 설정 ===
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD")

    # === Database 설정 ===
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/trading_journal"
    )

    # === CORS 설정 ===
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:8080"
    ]

    # === 로깅 설정 ===
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # === Nautilus 설정 ===
    DATA_PATH: Path = Path(os.getenv("DATA_PATH", "./data"))
    CATALOG_PATH: Path = DATA_PATH / "catalog"
    CACHE_PATH: Path = DATA_PATH / "cache"

    # 디렉토리 생성
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.DATA_PATH.mkdir(parents=True, exist_ok=True)
        self.CATALOG_PATH.mkdir(parents=True, exist_ok=True)
        self.CACHE_PATH.mkdir(parents=True, exist_ok=True)

    # === 리스크 관리 설정 ===
    MAX_ORDER_SUBMIT_RATE: str = "100/00:00:01"  # 초당 100개 주문
    MAX_ORDER_MODIFY_RATE: str = "100/00:00:01"
    MAX_NOTIONAL_PER_ORDER: float = 10_000_000.0  # 주문당 최대 10M USD

    # === 전략 기본 설정 ===
    DEFAULT_POSITION_SIZE: float = 0.001  # 기본 포지션 크기 (BTC)
    DEFAULT_MAX_POSITIONS: int = 10  # 전략당 최대 포지션 수
    DEFAULT_STOP_LOSS: float = 0.02  # 2% 손절
    DEFAULT_TAKE_PROFIT: float = 0.03  # 3% 익절

    # === WebSocket 설정 ===
    WS_HEARTBEAT_INTERVAL: int = 30  # 초
    WS_MAX_CONNECTIONS: int = 100
    WS_MESSAGE_QUEUE_SIZE: int = 1000

    # === 성능 설정 ===
    ENABLE_CACHE: bool = True
    CACHE_TTL: int = 300  # 5분
    MAX_CONCURRENT_STRATEGIES: int = 50
    BATCH_SIZE: int = 100

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"  # Ignore extra environment variables
    }


# Singleton instance
settings = Settings()


# === 전략별 기본 설정 ===

STRATEGY_CONFIGS = {
    "grid": {
        "default": {
            "upper_price": 70000.0,
            "lower_price": 30000.0,
            "grid_levels": 20,
            "position_size": 0.001,
            "max_positions": 10
        }
    },
    "ema_cross": {
        "default": {
            "fast_period": 12,
            "slow_period": 26,
            "position_size": 0.001,
            "max_positions": 3
        }
    },
    "rsi": {
        "default": {
            "period": 14,
            "oversold": 30,
            "overbought": 70,
            "position_size": 0.001,
            "max_positions": 5
        }
    }
}


def get_strategy_config(strategy_type: str, custom_config: dict = None) -> dict:
    """
    전략 설정 가져오기

    Args:
        strategy_type: 전략 타입
        custom_config: 사용자 정의 설정

    Returns:
        병합된 설정
    """
    base_config = STRATEGY_CONFIGS.get(strategy_type, {}).get("default", {})

    if custom_config:
        base_config.update(custom_config)

    return base_config