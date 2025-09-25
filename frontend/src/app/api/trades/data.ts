import type { Trade } from '@/types/trade';

// In-memory mock data for local development
export const trades: Trade[] = [];

export function calculatePnL(trade: Trade) {
  const entryPrice = trade.entryPrice || 0;
  const exitPrice = trade.exitPrice || 0;
  const quantity = trade.entryQuantity || 0;

  let pnl = 0;
  let pnlPercent = 0;

  if (entryPrice && exitPrice && quantity) {
    if (trade.side === 'BUY') {
      pnl = (exitPrice - entryPrice) * quantity;
      pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
    } else {
      pnl = (entryPrice - exitPrice) * quantity;
      pnlPercent = ((entryPrice - exitPrice) / exitPrice) * 100;
    }
  }

  return {
    pnl: Number(pnl.toFixed(2)),
    pnlPercent: Number(pnlPercent.toFixed(2))
  };
}