"""
Nautilus Trader Configuration
"""
import os
from decimal import Decimal
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field
from dotenv import load_dotenv

# Load environment variables
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    load_dotenv(env_file)
else:
    load_dotenv()


class TradingConfig(BaseSettings):
    """Trading configuration"""

    # Binance API
    binance_api_key: str = Field(default="", env="BINANCE_API_KEY")
    binance_api_secret: str = Field(default="", env="BINANCE_API_SECRET")
    use_testnet: bool = Field(default=True, env="USE_TESTNET")
    binance_testnet_api_key: str = Field(default="", env="BINANCE_TESTNET_API_KEY")
    binance_testnet_api_secret: str = Field(default="", env="BINANCE_TESTNET_API_SECRET")
    binance_testnet_url: str = Field(
        default="https://testnet.binance.vision",
        env="BINANCE_TESTNET_URL"
    )

    # Trading Parameters
    trader_id: str = Field(default="TRADER-001", env="TRADER_ID")
    default_base_currency: str = Field(default="USDT", env="DEFAULT_BASE_CURRENCY")
    initial_capital: float = Field(default=1000.0, env="INITIAL_CAPITAL")

    # Risk Management
    max_position_size: float = Field(default=0.1, env="MAX_POSITION_SIZE")
    max_open_positions: int = Field(default=3, env="MAX_OPEN_POSITIONS")
    daily_loss_limit: float = Field(default=0.05, env="DAILY_LOSS_LIMIT")
    stop_loss_pct: float = Field(default=0.02, env="STOP_LOSS_PCT")
    take_profit_pct: float = Field(default=0.03, env="TAKE_PROFIT_PCT")

    # Database
    database_url: str = Field(
        default="postgresql://cryptouser:cryptopass@localhost:5432/cryptodb",
        env="DATABASE_URL"
    )
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        env="REDIS_URL"
    )

    # API Server
    api_host: str = Field(default="0.0.0.0", env="API_HOST")
    api_port: int = Field(default=8000, env="API_PORT")

    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_file_path: str = Field(default="logs/nautilus.log", env="LOG_FILE_PATH")

    # Monitoring
    enable_metrics: bool = Field(default=True, env="ENABLE_METRICS")
    metrics_port: int = Field(default=9090, env="METRICS_PORT")

    class Config:
        env_file = ".env"
        case_sensitive = False

    def get_api_credentials(self):
        """Get the appropriate API credentials based on testnet setting"""
        if self.use_testnet:
            return {
                "api_key": self.binance_testnet_api_key,
                "api_secret": self.binance_testnet_api_secret,
                "testnet": True,
                "base_url": self.binance_testnet_url
            }
        else:
            return {
                "api_key": self.binance_api_key,
                "api_secret": self.binance_api_secret,
                "testnet": False,
                "base_url": "https://api.binance.com"
            }

    def get_nautilus_config(self) -> dict:
        """Generate Nautilus Trader configuration"""
        creds = self.get_api_credentials()

        config = {
            "trader_id": self.trader_id,
            "log_level": self.log_level,
            "cache": {
                "database": None,  # Can be configured for Redis later
                "encoding": "msgpack",
                "timestamps_as_iso8601": False,
                "buffer_interval_ms": 100,
            },
            "data_clients": {},
            "exec_clients": {},
            "risk": {
                "max_order_size": str(self.max_position_size),
                "max_open_positions": self.max_open_positions,
                "daily_loss_limit": str(self.daily_loss_limit),
            },
            "logging": {
                "log_level": self.log_level,
                "log_to_console": True,
                "log_to_file": True,
                "log_file_path": self.log_file_path,
            }
        }

        # Add Binance configuration if credentials are provided
        if creds["api_key"] and creds["api_secret"]:
            config["data_clients"]["BINANCE"] = {
                "api_key": creds["api_key"],
                "api_secret": creds["api_secret"],
                "testnet": creds["testnet"],
                "base_url": creds["base_url"],
            }
            config["exec_clients"]["BINANCE"] = {
                "api_key": creds["api_key"],
                "api_secret": creds["api_secret"],
                "testnet": creds["testnet"],
                "base_url": creds["base_url"],
            }

        return config


# Global configuration instance
config = TradingConfig()