@echo off
echo ========================================
echo Backtest Test Script
echo ========================================
echo.

echo Testing EMA Cross Strategy Backtest...
echo.

curl -X POST http://localhost:8002/api/backtest/run ^
  -H "Content-Type: application/json" ^
  -d "{\"strategy_type\":\"ema_cross\",\"instrument_id\":\"BTCUSDT.BINANCE\",\"timeframe\":\"1m\",\"start_date\":\"2024-12-01\",\"end_date\":\"2024-12-31\",\"initial_balance\":10000,\"parameters\":{\"fast_period\":10,\"slow_period\":20,\"trade_size\":\"0.01\",\"max_positions\":1}}"

echo.
echo ========================================
echo Backtest Test Complete
echo ========================================
pause
