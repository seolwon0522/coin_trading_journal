"""
Nautilus Trader Integration Service
Connects FastAPI with Nautilus Trader strategies
"""
import os
import sys
from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio
from decimal import Decimal
import json

# Add nautilus-trader path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'nautilus-trader'))

from nautilus_trader.adapters.binance.common.enums import BinanceAccountType
from nautilus_trader.adapters.binance.config import (
    BinanceDataClientConfig,
    BinanceExecClientConfig,
)
from nautilus_trader.adapters.binance.factories import (
    BinanceLiveDataClientFactory,
    BinanceLiveExecClientFactory
)
from nautilus_trader.live.node import TradingNode
from nautilus_trader.config import TradingNodeConfig
from nautilus_trader.model.identifiers import TraderId

# Import our strategies
from strategies.ema_cross import EMACross
from strategies.market_maker import VolatilityMarketMaker
from strategies.orderbook_imbalance import OrderbookImbalance
from config.strategies import (
    EMACrossConfig,
    VolatilityMarketMakerConfig,
    OrderbookImbalanceConfig
)
from backtest.engine import BacktestRunner
from config.base import BacktestConfig


class NautilusService:
    """Service class that manages Nautilus Trader strategies"""

    def __init__(self):
        self.active_strategies: Dict[str, Any] = {}
        self.trading_nodes: Dict[str, TradingNode] = {}
        self.backtest_tasks: Dict[str, Any] = {}
        self.websocket_subscriptions: Dict[str, List] = {}

    async def initialize(self):
        """Initialize the service"""
        # Check for required environment variables
        if not os.getenv("BINANCE_API_KEY") or not os.getenv("BINANCE_API_SECRET"):
            print("WARNING: Binance API credentials not found. Using testnet mode.")

    async def shutdown(self):
        """Shutdown all active strategies and clean up"""
        for strategy_id in list(self.active_strategies.keys()):
            await self.stop_strategy(strategy_id)

    async def start_strategy(
        self,
        strategy_id: str,
        strategy_type: str,
        symbol: str,
        params: Dict[str, Any],
        testnet: bool = True
    ):
        """Start a trading strategy"""
        try:
            # Check if strategy already exists
            if strategy_id in self.active_strategies:
                raise ValueError(f"Strategy {strategy_id} is already running")

            # Create strategy configuration based on type
            if strategy_type == "ema_cross":
                config = EMACrossConfig(
                    strategy_id=strategy_id,
                    instrument_id=f"{symbol}.BINANCE",
                    bar_type=f"{symbol}.BINANCE-1-MINUTE-LAST-EXTERNAL",
                    trade_size=Decimal(str(params.get("trade_size", "0.001"))),
                    fast_ema_period=params.get("fast_ema_period", 10),
                    slow_ema_period=params.get("slow_ema_period", 20),
                    use_bracket_orders=params.get("use_bracket_orders", True),
                    stop_loss_pct=Decimal(str(params.get("stop_loss_pct", "0.02"))),
                    take_profit_pct=Decimal(str(params.get("take_profit_pct", "0.05")))
                )
                strategy = EMACross(config=config)

            elif strategy_type == "market_maker":
                config = VolatilityMarketMakerConfig(
                    strategy_id=strategy_id,
                    instrument_id=f"{symbol}.BINANCE",
                    bar_type=f"{symbol}.BINANCE-1-MINUTE-LAST-EXTERNAL",
                    trade_size=Decimal(str(params.get("trade_size", "0.01"))),
                    atr_period=params.get("atr_period", 20),
                    atr_multiple=params.get("atr_multiple", 6.0),
                    max_inventory=Decimal(str(params.get("max_inventory", "0.1")))
                )
                strategy = VolatilityMarketMaker(config=config)

            elif strategy_type == "orderbook_imbalance":
                config = OrderbookImbalanceConfig(
                    strategy_id=strategy_id,
                    instrument_id=f"{symbol}.BINANCE",
                    bar_type=f"{symbol}.BINANCE-1-SECOND-LAST-EXTERNAL",
                    trade_size=Decimal(str(params.get("trade_size", "0.001"))),
                    book_depth=params.get("book_depth", 10),
                    imbalance_threshold=params.get("imbalance_threshold", 0.6)
                )
                strategy = OrderbookImbalance(config=config)

            else:
                raise ValueError(f"Unknown strategy type: {strategy_type}")

            # Create trading node configuration
            node_config = self._create_node_config(strategy_id, testnet)

            # Create and configure trading node
            node = TradingNode(config=node_config)

            # Add Binance adapter
            if testnet:
                base_url_http = "https://testnet.binancefuture.com"
                base_url_ws = "wss://stream.binancefuture.com"
            else:
                base_url_http = None  # Use default
                base_url_ws = None    # Use default

            # Data client configuration
            data_config = BinanceDataClientConfig(
                api_key=os.getenv("BINANCE_API_KEY", ""),
                api_secret=os.getenv("BINANCE_API_SECRET", ""),
                account_type=BinanceAccountType.USDT_FUTURE,
                base_url_http=base_url_http,
                base_url_ws=base_url_ws,
                testnet=testnet,
            )

            # Execution client configuration
            exec_config = BinanceExecClientConfig(
                api_key=os.getenv("BINANCE_API_KEY", ""),
                api_secret=os.getenv("BINANCE_API_SECRET", ""),
                account_type=BinanceAccountType.USDT_FUTURE,
                base_url_http=base_url_http,
                base_url_ws=base_url_ws,
                testnet=testnet,
            )

            # Add Binance clients to the node
            node.add_data_client_factory("BINANCE", BinanceLiveDataClientFactory)
            node.add_exec_client_factory("BINANCE", BinanceLiveExecClientFactory)
            node.add_data_client_config(data_config)
            node.add_exec_client_config(exec_config)

            # Add strategy to node
            node.trader.add_strategy(strategy)

            # Build and start the node
            node.build()
            node.start()

            # Store references
            self.active_strategies[strategy_id] = {
                "strategy": strategy,
                "node": node,
                "type": strategy_type,
                "symbol": symbol,
                "params": params,
                "start_time": datetime.now(),
                "status": "running"
            }
            self.trading_nodes[strategy_id] = node

            return {"status": "started", "strategy_id": strategy_id}

        except Exception as e:
            print(f"Error starting strategy {strategy_id}: {e}")
            raise

    async def stop_strategy(self, strategy_id: str) -> Dict[str, Any]:
        """Stop a running strategy"""
        if strategy_id not in self.active_strategies:
            raise ValueError(f"Strategy {strategy_id} not found")

        try:
            # Get the trading node
            node = self.trading_nodes.get(strategy_id)
            if node:
                # Stop the node
                node.stop()
                node.dispose()

            # Get final stats before removing
            strategy_info = self.active_strategies[strategy_id]
            final_stats = {
                "total_trades": 0,  # Get from strategy
                "realized_pnl": 0,  # Get from portfolio
                "run_time": (datetime.now() - strategy_info["start_time"]).total_seconds()
            }

            # Remove from active strategies
            del self.active_strategies[strategy_id]
            del self.trading_nodes[strategy_id]

            return final_stats

        except Exception as e:
            print(f"Error stopping strategy {strategy_id}: {e}")
            raise

    async def get_strategy_status(self, strategy_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a strategy"""
        if strategy_id not in self.active_strategies:
            return None

        strategy_info = self.active_strategies[strategy_id]
        node = self.trading_nodes.get(strategy_id)

        # Get current positions and PnL
        positions = []
        unrealized_pnl = 0.0
        realized_pnl = 0.0
        total_trades = 0

        if node and node.portfolio:
            # Get positions from portfolio
            for position in node.portfolio.positions_open():
                positions.append({
                    "symbol": position.symbol.value,
                    "side": str(position.side),
                    "quantity": float(position.quantity),
                    "entry_price": float(position.avg_px_open),
                    "unrealized_pnl": float(position.unrealized_pnl)
                })
                unrealized_pnl += float(position.unrealized_pnl)

            # Get realized PnL
            realized_pnl = float(node.portfolio.realized_pnl())

        return {
            "strategy_id": strategy_id,
            "is_active": True,
            "start_time": strategy_info["start_time"],
            "positions": positions,
            "unrealized_pnl": unrealized_pnl,
            "realized_pnl": realized_pnl,
            "total_trades": total_trades
        }

    async def list_active_strategies(self) -> List[Dict[str, Any]]:
        """List all active strategies"""
        strategies = []
        for strategy_id, info in self.active_strategies.items():
            strategies.append({
                "strategy_id": strategy_id,
                "type": info["type"],
                "symbol": info["symbol"],
                "start_time": info["start_time"],
                "status": info["status"]
            })
        return strategies

    async def run_backtest(
        self,
        strategy_type: str,
        symbol: str,
        params: Dict[str, Any],
        start_date: str,
        end_date: str,
        initial_balance: float = 10000.0
    ) -> Dict[str, Any]:
        """Run a backtest"""
        try:
            # Create backtest configuration
            backtest_config = BacktestConfig(
                trader_id="BACKTEST_001",
                log_level="INFO",
                bypass_logging=True
            )

            # Create backtest runner
            runner = BacktestRunner(config=backtest_config)

            # Add Binance venue
            runner.add_binance_venue(starting_balance=initial_balance)

            # Create strategy configuration
            if strategy_type == "ema_cross":
                strategy_config = EMACrossConfig(
                    strategy_id="BACKTEST_EMA",
                    instrument_id=f"{symbol}.BINANCE",
                    bar_type=f"{symbol}.BINANCE-1-MINUTE-LAST-EXTERNAL",
                    trade_size=Decimal(str(params.get("trade_size", "0.001"))),
                    fast_ema_period=params.get("fast_ema_period", 10),
                    slow_ema_period=params.get("slow_ema_period", 20)
                )
            elif strategy_type == "market_maker":
                strategy_config = VolatilityMarketMakerConfig(
                    strategy_id="BACKTEST_MM",
                    instrument_id=f"{symbol}.BINANCE",
                    bar_type=f"{symbol}.BINANCE-1-MINUTE-LAST-EXTERNAL",
                    trade_size=Decimal(str(params.get("trade_size", "0.01"))),
                    atr_period=params.get("atr_period", 20),
                    atr_multiple=params.get("atr_multiple", 6.0)
                )
            else:
                raise ValueError(f"Unknown strategy type: {strategy_type}")

            # Add strategy
            runner.add_strategy(strategy_config, strategy_type)

            # Run backtest
            runner.run()

            # Get results
            stats = runner.get_performance_stats()

            return {
                "total_return": float(stats.get("total_return", 0)),
                "win_rate": float(stats.get("win_rate", 0)),
                "max_drawdown": float(stats.get("max_drawdown", 0)),
                "sharpe_ratio": float(stats.get("sharpe_ratio", 0)),
                "total_trades": int(stats.get("total_trades", 0)),
                "trades": [],  # Simplified for now
                "equity_curve": []  # Simplified for now
            }

        except Exception as e:
            print(f"Error running backtest: {e}")
            raise

    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """Get current ticker data"""
        # Implement ticker fetching from Binance
        return {
            "symbol": symbol,
            "bid": 0.0,
            "ask": 0.0,
            "last": 0.0,
            "volume": 0.0
        }

    async def get_orderbook(self, symbol: str, limit: int = 20) -> Dict[str, Any]:
        """Get orderbook data"""
        # Implement orderbook fetching from Binance
        return {
            "symbol": symbol,
            "bids": [],
            "asks": [],
            "timestamp": datetime.now().isoformat()
        }

    async def get_all_positions(self) -> List[Dict[str, Any]]:
        """Get all positions across all strategies"""
        all_positions = []
        for strategy_id, node in self.trading_nodes.items():
            if node and node.portfolio:
                for position in node.portfolio.positions_open():
                    all_positions.append({
                        "strategy_id": strategy_id,
                        "symbol": position.symbol.value,
                        "side": str(position.side),
                        "quantity": float(position.quantity),
                        "entry_price": float(position.avg_px_open),
                        "unrealized_pnl": float(position.unrealized_pnl)
                    })
        return all_positions

    async def close_position(self, position_id: str) -> Dict[str, Any]:
        """Close a specific position"""
        # Implement position closing logic
        return {"pnl": 0.0}

    async def emergency_stop_all(self) -> Dict[str, Any]:
        """Emergency stop all strategies"""
        strategies_stopped = []
        positions_closed = 0

        for strategy_id in list(self.active_strategies.keys()):
            try:
                await self.stop_strategy(strategy_id)
                strategies_stopped.append(strategy_id)
            except Exception as e:
                print(f"Error stopping strategy {strategy_id}: {e}")

        return {
            "strategies_stopped": strategies_stopped,
            "positions_closed": positions_closed
        }

    async def calculate_risk_exposure(self) -> Dict[str, Any]:
        """Calculate current risk exposure"""
        total_exposure = 0.0
        position_count = 0

        for node in self.trading_nodes.values():
            if node and node.portfolio:
                for position in node.portfolio.positions_open():
                    total_exposure += abs(float(position.quantity * position.avg_px_open))
                    position_count += 1

        return {
            "total_exposure": total_exposure,
            "position_count": position_count,
            "timestamp": datetime.now().isoformat()
        }

    async def subscribe_to_strategy(self, strategy_id: str, websocket):
        """Subscribe to strategy updates via WebSocket"""
        if strategy_id not in self.websocket_subscriptions:
            self.websocket_subscriptions[strategy_id] = []
        self.websocket_subscriptions[strategy_id].append(websocket)

    async def get_backtest_progress(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get progress of a running backtest"""
        task = self.backtest_tasks.get(task_id)
        if not task:
            return None
        return {
            "task_id": task_id,
            "status": task.get("status", "running"),
            "progress": task.get("progress", 0)
        }

    def _create_node_config(self, trader_id: str, testnet: bool = True) -> TradingNodeConfig:
        """Create trading node configuration"""
        return TradingNodeConfig(
            trader_id=TraderId(trader_id),
            logging={
                "log_level": "INFO",
                "log_to_console": True,
            },
            data_engine={
                "time_bars_timestamp_on_close": False,
            },
            risk_engine={
                "bypass": False,
            },
            exec_engine={
                "load_state": False,
                "save_state": False,
            },
        )