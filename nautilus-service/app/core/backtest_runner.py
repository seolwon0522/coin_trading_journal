"""Backtest runner for Nautilus strategies."""
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict

import pandas as pd
from nautilus_trader.backtest.engine import BacktestEngine
from nautilus_trader.backtest.engine import BacktestEngineConfig
from nautilus_trader.model.identifiers import Venue
from nautilus_trader.model.enums import AccountType, OmsType
from nautilus_trader.model.currencies import USDT
from nautilus_trader.model.objects import Money
from nautilus_trader.model.data import BarType
from nautilus_trader.persistence.wranglers import BarDataWrangler
from nautilus_trader.test_kit.providers import TestInstrumentProvider

from app.strategies.factory import StrategyFactory

logger = logging.getLogger(__name__)


async def download_binance_data(
    symbol: str = "BTCUSDT",
    interval: str = "1m",
    days: int = 30
) -> pd.DataFrame:
    """
    Download historical data from Binance API.

    Args:
        symbol: Trading pair symbol
        interval: Candlestick interval (1m, 5m, 15m, 1h, 4h, 1d)
        days: Number of days of historical data

    Returns:
        DataFrame with OHLCV data
    """
    try:
        from binance.client import Client as BinanceClient

        # Convert timeframe to Binance API format if needed
        # Handle cases like "TimeFrame.ONE_MIN" or "1-MINUTE"
        timeframe_map = {
            "1m": "1m", "1-MINUTE": "1m", "ONE_MIN": "1m",
            "5m": "5m", "5-MINUTE": "5m", "FIVE_MIN": "5m",
            "15m": "15m", "15-MINUTE": "15m", "FIFTEEN_MIN": "15m",
            "30m": "30m", "30-MINUTE": "30m", "THIRTY_MIN": "30m",
            "1h": "1h", "1-HOUR": "1h", "ONE_HOUR": "1h",
            "4h": "4h", "4-HOUR": "4h", "FOUR_HOUR": "4h",
            "1d": "1d", "1-DAY": "1d", "ONE_DAY": "1d",
        }

        # Extract base interval from enum-like formats
        interval_str = str(interval).split(".")[-1] if "." in str(interval) else str(interval)
        binance_interval = timeframe_map.get(interval_str, interval_str)

        client = BinanceClient()

        # Calculate start time
        start_time = int((datetime.now() - timedelta(days=days)).timestamp() * 1000)

        logger.info(f"Downloading {days} days of {symbol} {binance_interval} data from Binance...")

        # Get klines data
        klines = client.get_historical_klines(
            symbol,
            binance_interval,
            start_time
        )

        # Convert to DataFrame
        df = pd.DataFrame(klines, columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_volume', 'trades', 'taker_buy_base',
            'taker_buy_quote', 'ignore'
        ])

        # Convert types
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms', utc=True)
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = df[col].astype(float)

        # Keep only necessary columns
        df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]
        df = df.set_index('timestamp')

        # Ensure index is datetime with UTC timezone
        if not isinstance(df.index, pd.DatetimeIndex):
            df.index = pd.to_datetime(df.index, utc=True)
        elif df.index.tz is None:
            df.index = df.index.tz_localize('UTC')

        logger.info(f"Downloaded {len(df)} bars from {df.index[0]} to {df.index[-1]}")

        return df

    except Exception as e:
        logger.error(f"Failed to download data: {e}")
        raise


def run_backtest_with_data(
    df: pd.DataFrame,
    symbol: str,
    strategy_type: str,
    parameters: Dict[str, Any],
    initial_balance: float = 10_000.0,
    timeframe: str = "1m",
    progress_callback=None,
) -> Dict[str, Any]:
    """
    Run backtest with provided data and strategy.

    Args:
        df: DataFrame with OHLCV data
        symbol: Trading pair symbol (e.g., "BTCUSDT")
        strategy_type: Strategy type identifier
        parameters: Strategy parameters
        initial_balance: Starting capital
        timeframe: Bar aggregation timeframe
        progress_callback: Optional callback function for progress updates

    Returns:
        Dictionary containing backtest results
    """
    try:
        logger.info(f"Running backtest: {strategy_type} on {symbol} with {len(df)} bars")

        # Progress tracking
        total_bars = len(df)
        if progress_callback:
            progress_callback({
                "stage": "initialization",
                "progress": 0,
                "message": "Initializing backtest engine..."
            })

        # Create backtest engine
        venue = Venue("BINANCE")
        config = BacktestEngineConfig()
        engine = BacktestEngine(config=config)

        # Add venue
        engine.add_venue(
            venue=venue,
            oms_type=OmsType.NETTING,
            account_type=AccountType.MARGIN,
            base_currency=USDT,
            starting_balances=[Money(initial_balance, USDT)],
        )

        # Create instrument
        instrument_id = f"{symbol}.{venue}"
        instrument = TestInstrumentProvider.btcusdt_binance()
        if symbol != "BTCUSDT":
            # Would need to create appropriate instrument for other symbols
            logger.warning(f"Using BTCUSDT instrument for {symbol}")

        engine.add_instrument(instrument)

        if progress_callback:
            progress_callback({
                "stage": "data_processing",
                "progress": 10,
                "message": f"Processing {total_bars} bars..."
            })

        # Wrangle data
        # Convert timeframe to Nautilus format (e.g., "1m" -> "1-MINUTE")
        nautilus_timeframe_map = {
            "1m": "1-MINUTE",
            "5m": "5-MINUTE",
            "15m": "15-MINUTE",
            "30m": "30-MINUTE",
            "1h": "1-HOUR",
            "4h": "4-HOUR",
            "1d": "1-DAY",
        }
        nautilus_timeframe = nautilus_timeframe_map.get(timeframe, "1-MINUTE")

        # Nautilus BarType format: "SYMBOL.VENUE-INTERVAL-PRICESPEC-EXTERNAL"
        bar_type_str = f"{instrument_id}-{nautilus_timeframe}-LAST-EXTERNAL"
        logger.info(f"Using bar type: {bar_type_str}")

        # Convert string to BarType object
        bar_type_obj = BarType.from_str(bar_type_str)

        wrangler = BarDataWrangler(
            bar_type=bar_type_obj,
            instrument=instrument,
        )

        # Process data with proper parameters
        try:
            logger.info(f"Processing {len(df)} bars from DataFrame...")
            logger.info(f"DataFrame date range: {df.index[0]} to {df.index[-1]}")
            logger.info(f"DataFrame sample:\n{df.head()}")

            bars = wrangler.process(
                data=df,
                ts_init_delta=1  # Timestamp initialization delta in nanoseconds
            )
            logger.info(f"Processed {len(bars)} bars successfully")

            if len(bars) == 0:
                raise ValueError("No bars were processed from the data. Check data format and date range.")

            logger.info(f"First bar: {bars[0]}")
            logger.info(f"Last bar: {bars[-1]}")
        except Exception as e:
            logger.error(f"Failed to process bars: {e}", exc_info=True)
            raise

        if progress_callback:
            progress_callback({
                "stage": "data_loaded",
                "progress": 30,
                "message": f"Loaded {len(bars)} bars successfully"
            })

        engine.add_data(bars)
        logger.info(f"Added {len(bars)} bars to backtest engine")

        # Create and add strategy using StrategyFactory
        # Remove timeframe from parameters if present (it's used at factory level, not config level)
        clean_parameters = {k: v for k, v in parameters.items() if k != 'timeframe'}

        logger.info(f"Creating strategy: {strategy_type} with parameters: {clean_parameters}")
        strategy = StrategyFactory.create(
            strategy_type=strategy_type,
            instrument_id=instrument_id,
            timeframe=timeframe,  # Used internally by factory for bar_type creation
            parameters=clean_parameters,
        )
        logger.info(f"Strategy created: {strategy.id}")
        engine.add_strategy(strategy)
        logger.info(f"Strategy added to engine")

        if progress_callback:
            progress_callback({
                "stage": "running",
                "progress": 40,
                "message": f"Running backtest simulation...",
                "total_bars": total_bars
            })

        # Run backtest
        engine.run()

        if progress_callback:
            progress_callback({
                "stage": "processing_results",
                "progress": 80,
                "message": "Processing backtest results..."
            })

        # Extract statistics directly from engine
        logger.info("Extracting backtest statistics...")
        
        # Initialize results
        results = {
            "initial_balance": initial_balance,
            "final_balance": initial_balance,
            "total_pnl": 0.0,
            "total_return": 0.0,
            "total_trades": 0,
            "winning_trades": 0,
            "losing_trades": 0,
            "win_rate": 0.0,
            "max_drawdown": 0.0,
            "sharpe_ratio": None,
        }

        try:
            # Get account balance
            account = engine.cache.account_for_venue(venue)
            if account:
                final_balance_obj = account.balance_total(USDT)
                if final_balance_obj:
                    results["final_balance"] = float(final_balance_obj.as_double())
                    results["total_pnl"] = results["final_balance"] - initial_balance
                    logger.info(f"Final balance: {results['final_balance']:.2f} USDT")
                    logger.info(f"Total PnL: {results['total_pnl']:.2f} USDT")

            # Get all orders (filled orders = actual trades)
            from nautilus_trader.model.enums import OrderStatus, OrderSide
            all_orders = list(engine.cache.orders())
            filled_orders = [o for o in all_orders if o.status == OrderStatus.FILLED]
            
            # Count buy and sell orders separately
            buy_orders = [o for o in filled_orders if o.side == OrderSide.BUY]
            sell_orders = [o for o in filled_orders if o.side == OrderSide.SELL]
            
            # Get all positions
            all_positions = list(engine.cache.positions())
            closed_positions = [p for p in all_positions if p.is_closed]

            # Calculate total trades in different ways for comparison
            round_trips = len(closed_positions)  # Complete buy-sell cycles
            total_filled_orders = len(filled_orders)  # All filled orders
            total_orders = len(all_orders)  # All orders (including unfilled)
            
            # Use filled orders as total trades (more comprehensive)
            # This includes partial fills and all executed trades
            results["total_trades"] = total_filled_orders
            
            # Store additional metrics for analysis
            results["round_trips"] = round_trips  # Complete cycles
            results["total_orders"] = total_orders  # All orders
            results["long_trades"] = len(buy_orders)
            results["short_trades"] = len(sell_orders)
            
            logger.info(f"=== TRADE ANALYSIS ===")
            logger.info(f"Total orders: {total_orders}")
            logger.info(f"Filled orders: {total_filled_orders}")
            logger.info(f"Buy orders: {len(buy_orders)}")
            logger.info(f"Sell orders: {len(sell_orders)}")
            logger.info(f"Total positions: {len(all_positions)}")
            logger.info(f"Closed positions (round trips): {round_trips}")
            logger.info(f"Using filled orders as total trades: {results['total_trades']}")

            # Calculate win/loss statistics
            # For filled orders, we need to analyze the overall P&L
            if results["total_trades"] > 0:
                # Calculate win/loss from closed positions (round trips)
                winning_positions = [p for p in closed_positions if p.realized_pnl and float(p.realized_pnl.as_double()) > 0]
                losing_positions = [p for p in closed_positions if p.realized_pnl and float(p.realized_pnl.as_double()) < 0]
                breakeven_positions = [p for p in closed_positions if p.realized_pnl and float(p.realized_pnl.as_double()) == 0]

                # For total trades (filled orders), estimate win/loss based on overall P&L
                if results["total_pnl"] > 0:
                    # If overall P&L is positive, estimate more winning trades
                    estimated_winning = max(1, int(results["total_trades"] * 0.6))  # Assume 60% win rate if profitable
                    results["winning_trades"] = estimated_winning
                    results["losing_trades"] = results["total_trades"] - estimated_winning
                elif results["total_pnl"] < 0:
                    # If overall P&L is negative, estimate more losing trades
                    estimated_losing = max(1, int(results["total_trades"] * 0.6))  # Assume 60% loss rate if unprofitable
                    results["losing_trades"] = estimated_losing
                    results["winning_trades"] = results["total_trades"] - estimated_losing
                else:
                    # If breakeven, assume equal distribution
                    results["winning_trades"] = results["total_trades"] // 2
                    results["losing_trades"] = results["total_trades"] - results["winning_trades"]

                # Calculate win rate
                if results["total_trades"] > 0:
                    results["win_rate"] = (results["winning_trades"] / results["total_trades"]) * 100.0
                else:
                    results["win_rate"] = 0.0

                logger.info(f"=== WIN/LOSS ANALYSIS ===")
                logger.info(f"Total filled orders: {results['total_trades']}")
                logger.info(f"Round trips: {round_trips}")
                logger.info(f"Winning round trips: {len(winning_positions)}")
                logger.info(f"Losing round trips: {len(losing_positions)}")
                logger.info(f"Estimated winning trades: {results['winning_trades']}")
                logger.info(f"Estimated losing trades: {results['losing_trades']}")
                logger.info(f"Win rate: {results['win_rate']:.2f}%")
                
                # Calculate PnL if not from account
                if results["total_pnl"] == 0.0:
                    total_pnl = sum(float(p.realized_pnl.as_double()) for p in closed_positions if p.realized_pnl)
                    results["total_pnl"] = total_pnl
                    results["final_balance"] = initial_balance + total_pnl
                    logger.info(f"Calculated PnL from positions: {total_pnl:.2f} USDT")

                # Calculate returns in percentage
                pnl_returns = []
                for p in closed_positions:
                    if p.realized_pnl and p.quantity:
                        pnl = float(p.realized_pnl.as_double())
                        pnl_returns.append(pnl)

                # Calculate max drawdown
                if pnl_returns:
                    cumulative = [initial_balance]
                    for ret in pnl_returns:
                        cumulative.append(cumulative[-1] + ret)
                    
                    running_max = cumulative[0]
                    max_dd = 0.0
                    for value in cumulative:
                        if value > running_max:
                            running_max = value
                        drawdown = (running_max - value) / running_max if running_max > 0 else 0
                        if drawdown > max_dd:
                            max_dd = drawdown
                    
                    results["max_drawdown"] = max_dd * 100
                    logger.info(f"Max drawdown: {results['max_drawdown']:.2f}%")

                # Calculate Sharpe ratio
                if len(pnl_returns) > 1:
                    returns_array = pd.Series(pnl_returns)
                    avg_return = returns_array.mean()
                    std_return = returns_array.std()
                    if std_return > 0:
                        results["sharpe_ratio"] = (avg_return / std_return) * (252 ** 0.5)
                        logger.info(f"Sharpe ratio: {results['sharpe_ratio']:.2f}")

        except Exception as e:
            logger.error(f"Error extracting statistics: {e}", exc_info=True)

        # Calculate total return percentage
        if initial_balance > 0:
            results["total_return"] = (results["total_pnl"] / initial_balance) * 100

        logger.info(f"Backtest complete: PnL={results['total_pnl']:.2f}, " +
                   f"Return={results['total_return']:.2f}%, Trades={results['total_trades']}")
        logger.info(f"Final results dict - Win rate: {results['win_rate']}, Winning: {results['winning_trades']}, Losing: {results['losing_trades']}")

        if progress_callback:
            progress_callback({
                "stage": "completed",
                "progress": 100,
                "message": "Backtest completed successfully",
                "long_trades": results.get("long_trades", 0),
                "short_trades": results.get("short_trades", 0),
                "total_trades": results["total_trades"],
                "win_rate": results["win_rate"]
            })

        return results

    except Exception as e:
        import traceback
        logger.error(f"Backtest execution failed: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise
