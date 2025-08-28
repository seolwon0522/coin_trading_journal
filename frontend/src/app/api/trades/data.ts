import { Trade } from '@/types/trade';

// 임시 메모리 저장소 (실제 프로젝트에서는 데이터베이스 사용)
// eslint-disable-next-line prefer-const
export let trades: Trade[] = [
  {
    id: 1,
    symbol: 'BTCUSDT',
    side: 'BUY',
    entryQuantity: 0.5,
    entryPrice: 45000,
    exitPrice: 47000,
    exitQuantity: 0.5,
    entryTime: '2024-01-15T10:30:00Z',
    exitTime: '2024-01-16T14:20:00Z',
    notes: '상승 추세 진입',
    pnl: 1000,
    pnlPercent: 4.44,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-16T14:20:00Z',
  },
  {
    id: 2,
    symbol: 'ETHUSDT',
    side: 'BUY',
    entryQuantity: 2.0,
    entryPrice: 2800,
    entryTime: '2024-01-20T09:15:00Z',
    notes: '지지선 반등 기대',
    createdAt: '2024-01-20T09:15:00Z',
    updatedAt: '2024-01-20T09:15:00Z',
  },
  {
    id: 3,
    symbol: 'SOLUSDT',
    side: 'SELL',
    entryQuantity: 10,
    entryPrice: 120,
    exitPrice: 115,
    exitQuantity: 10,
    entryTime: '2024-01-18T16:45:00Z',
    exitTime: '2024-01-19T11:30:00Z',
    notes: '과매수 구간 진입으로 숏 포지션',
    pnl: 50,
    pnlPercent: 4.17,
    createdAt: '2024-01-18T16:45:00Z',
    updatedAt: '2024-01-19T11:30:00Z',
  },
];

// 손익 계산 함수
export function calculatePnL(trade: Partial<Trade>): { pnl: number; pnlPercent: number } {
  if (!trade.exitPrice || !trade.exitQuantity || !trade.entryPrice || !trade.entryQuantity) {
    return { pnl: 0, pnlPercent: 0 };
  }
  
  const entryTotal = trade.entryPrice * trade.entryQuantity;
  const exitTotal = trade.exitPrice * trade.exitQuantity;
  
  const pnl = trade.side === 'BUY'
    ? exitTotal - entryTotal
    : entryTotal - exitTotal;
    
  const pnlPercent = entryTotal > 0 ? (pnl / entryTotal) * 100 : 0;
  
  return { pnl, pnlPercent };
}
