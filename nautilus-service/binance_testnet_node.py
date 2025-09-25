#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Binance Futures Testnet Trading Node
Based on official Nautilus Trader examples
"""

import asyncio
import os
from decimal import Decimal

from nautilus_trader.adapters.binance import (
    BINANCE,
    BinanceAccountType,
    BinanceDataClientConfig,
    BinanceExecClientConfig,
    BinanceLiveDataClientFactory,
    BinanceLiveExecClientFactory,
)
from nautilus_trader.config import InstrumentProviderConfig, TradingNodeConfig, LoggingConfig
from nautilus_trader.core.uuid import UUID4
from nautilus_trader.live.node import TradingNode
from nautilus_trader.model.identifiers import InstrumentId, TraderId

# Import our EMA Cross strategy
from nautilus_trader.examples.strategies.ema_cross import EMACross, EMACrossConfig


def get_config(
    api_key: str = None,
    api_secret: str = None,
    log_level: str = "INFO",
) -> TradingNodeConfig:
    """
    Create trading node configuration for Binance Testnet
    """
    # Get API credentials from environment if not provided
    api_key = api_key or os.getenv("BINANCE_API_KEY")
    api_secret = api_secret or os.getenv("BINANCE_API_SECRET")

    # Trading node configuration
    config_node = TradingNodeConfig(
        trader_id=TraderId("TESTER-001"),
        logging=LoggingConfig(
            log_level=log_level,
            log_colors=True,
            bypass_logging=False,
        ),
        data_clients={
            BINANCE: BinanceDataClientConfig(
                api_key=api_key,
                api_secret=api_secret,
                base_url_http="https://testnet.binancefuture.com",
                base_url_ws="wss://stream.binancefuture.com",
                us=False,
                testnet=True,
                account_type=BinanceAccountType.USDT_FUTURES,
                instrument_provider=InstrumentProviderConfig(load_all=True),
            ),
        },
        exec_clients={
            BINANCE: BinanceExecClientConfig(
                api_key=api_key,
                api_secret=api_secret,
                base_url_http="https://testnet.binancefuture.com",
                base_url_ws="wss://stream.binancefuture.com",
                us=False,
                testnet=True,
                account_type=BinanceAccountType.USDT_FUTURES,
                instrument_provider=InstrumentProviderConfig(load_all=True),
            ),
        },
        timeout_connection=30.0,
        timeout_reconciliation=10.0,
        timeout_portfolio=10.0,
        timeout_disconnection=10.0,
    )

    return config_node


def get_ema_cross_config(
    instrument_id: str = "BTCUSDT-PERP.BINANCE",
    trade_size: float = 0.001,
    fast_period: int = 10,
    slow_period: int = 20,
) -> EMACrossConfig:
    """
    Create EMA Cross strategy configuration
    """
    # Strategy configuration
    strat_config = EMACrossConfig(
        instrument_id=InstrumentId.from_str(instrument_id),
        bar_type=f"{instrument_id}-1-MINUTE-LAST-EXTERNAL",
        trade_size=Decimal(str(trade_size)),
        fast_ema_period=fast_period,
        slow_ema_period=slow_period,
    )

    return strat_config


async def run_trading_node(
    config_node: TradingNodeConfig,
    strat_config: EMACrossConfig,
):
    """
    Run the trading node with the configured strategy
    """
    # Build node
    node = TradingNode(config=config_node)

    # Add strategy
    strategy = EMACross(config=strat_config)
    node.trader.add_strategy(strategy)

    # Add data and execution clients
    node.add_data_client_factory(BINANCE, BinanceLiveDataClientFactory)
    node.add_exec_client_factory(BINANCE, BinanceLiveExecClientFactory)

    # Build the node
    node.build()

    try:
        # Start the trading node
        node.start()
        await node.run_async()
    except KeyboardInterrupt:
        node.stop()
    finally:
        # Ensure node is disposed on exit
        node.dispose()


def main():
    """
    Entry point for running the Binance Testnet trading node
    """
    # Get configurations
    config_node = get_config()
    strat_config = get_ema_cross_config()

    # Run the trading node
    asyncio.run(run_trading_node(config_node, strat_config))


if __name__ == "__main__":
    main()