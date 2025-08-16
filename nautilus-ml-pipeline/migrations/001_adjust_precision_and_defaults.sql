-- Migration: adjust precision and enforce defaults on price/PnL columns

-- backtest_runs updates
UPDATE backtest_runs SET total_trades = 0 WHERE total_trades IS NULL;
UPDATE backtest_runs SET total_pnl = 0 WHERE total_pnl IS NULL;

ALTER TABLE backtest_runs
    ALTER COLUMN total_trades SET DEFAULT 0,
    ALTER COLUMN total_trades SET NOT NULL,
    ALTER COLUMN total_pnl TYPE DECIMAL(12,6) USING ROUND(total_pnl::numeric, 6),
    ALTER COLUMN total_pnl SET DEFAULT 0,
    ALTER COLUMN total_pnl SET NOT NULL;

-- backtest_trades updates
UPDATE backtest_trades SET stop_loss = 0 WHERE stop_loss IS NULL;
UPDATE backtest_trades SET take_profit = 0 WHERE take_profit IS NULL;
UPDATE backtest_trades SET exit_price = 0 WHERE exit_price IS NULL;
UPDATE backtest_trades SET pnl = 0 WHERE pnl IS NULL;

ALTER TABLE backtest_trades
    ALTER COLUMN entry_price TYPE DECIMAL(12,6) USING ROUND(entry_price::numeric, 6),
    ALTER COLUMN stop_loss TYPE DECIMAL(12,6) USING ROUND(stop_loss::numeric, 6),
    ALTER COLUMN take_profit TYPE DECIMAL(12,6) USING ROUND(take_profit::numeric, 6),
    ALTER COLUMN exit_price TYPE DECIMAL(12,6) USING ROUND(exit_price::numeric, 6),
    ALTER COLUMN pnl TYPE DECIMAL(12,6) USING ROUND(pnl::numeric, 6),
    ALTER COLUMN stop_loss SET DEFAULT 0,
    ALTER COLUMN take_profit SET DEFAULT 0,
    ALTER COLUMN exit_price SET DEFAULT 0,
    ALTER COLUMN pnl SET DEFAULT 0,
    ALTER COLUMN stop_loss SET NOT NULL,
    ALTER COLUMN take_profit SET NOT NULL,
    ALTER COLUMN exit_price SET NOT NULL,
    ALTER COLUMN pnl SET NOT NULL;
