"""
Application Settings and Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # API Settings
    app_name: str = "Nautilus Trading Service"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"
    debug: bool = False

    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8002
    workers: int = 1

    # Binance Settings
    binance_api_key: Optional[str] = None
    binance_api_secret: Optional[str] = None
    binance_testnet: bool = True
    binance_testnet_url: str = "https://testnet.binancefuture.com"
    binance_testnet_ws: str = "wss://stream.binancefuture.com"

    # Database Settings (for strategy persistence)
    database_url: str = "postgresql://trader:password@postgres:5432/trading"
    redis_url: str = "redis://redis:6379"

    # Trading Settings
    max_strategies: int = 10
    default_leverage: int = 1
    default_capital: float = 10000.0
    risk_check_enabled: bool = True
    max_position_size: float = 0.1  # Maximum position size per strategy

    # Monitoring
    enable_metrics: bool = True
    enable_tracing: bool = False
    log_level: str = "INFO"

    # CORS Settings
    cors_origins: list = ["*"]
    cors_allow_credentials: bool = True
    cors_allow_methods: list = ["*"]
    cors_allow_headers: list = ["*"]

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "allow"  # Allow extra fields from .env

    @property
    def is_testnet(self) -> bool:
        """Check if running in testnet mode"""
        return self.binance_testnet

    @property
    def has_credentials(self) -> bool:
        """Check if API credentials are available"""
        return bool(self.binance_api_key and self.binance_api_secret)

    def get_binance_urls(self) -> tuple[Optional[str], Optional[str]]:
        """Get Binance URLs based on testnet setting"""
        if self.binance_testnet:
            return self.binance_testnet_url, self.binance_testnet_ws
        return None, None  # Use defaults for production


settings = Settings()