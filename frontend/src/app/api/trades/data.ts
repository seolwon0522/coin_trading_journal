import { Trade } from '@/types/trade';

// 임시 메모리 저장소 (실제 프로젝트에서는 데이터베이스 사용)
// eslint-disable-next-line prefer-const
export let trades: Trade[] = [
  {
    id: '1',
    symbol: 'BTC/USDT',
    type: 'buy',
    tradingType: 'trend',
    quantity: 0.5,
    entryPrice: 45000,
    exitPrice: 47000,
    entryTime: new Date('2024-01-15T10:30:00'),
    exitTime: new Date('2024-01-16T14:20:00'),
    memo: '상승 추세 진입',
    pnl: 1000,
    status: 'closed',
    createdAt: new Date('2024-01-15T10:30:00'),
    updatedAt: new Date('2024-01-16T14:20:00'),
  },
  {
    id: '2',
    symbol: 'ETH/USDT',
    type: 'buy',
    tradingType: 'breakout',
    quantity: 2.0,
    entryPrice: 2800,
    entryTime: new Date('2024-01-20T09:15:00'),
    memo: '지지선 반등 기대',
    status: 'open',
    createdAt: new Date('2024-01-20T09:15:00'),
    updatedAt: new Date('2024-01-20T09:15:00'),
  },
  {
    id: '3',
    symbol: 'SOL/USDT',
    type: 'sell',
    tradingType: 'counter_trend',
    quantity: 10,
    entryPrice: 120,
    exitPrice: 115,
    entryTime: new Date('2024-01-18T16:45:00'),
    exitTime: new Date('2024-01-19T11:30:00'),
    memo: '과매수 구간 진입으로 숏 포지션',
    pnl: -50,
    status: 'closed',
    createdAt: new Date('2024-01-18T16:45:00'),
    updatedAt: new Date('2024-01-19T11:30:00'),
  },
];

// 손익 계산 함수
export function calculatePnL(trade: Omit<Trade, 'pnl'>): number {
  if (!trade.exitPrice) return 0;
  return trade.type === 'buy'
    ? (trade.exitPrice - trade.entryPrice) * trade.quantity
    : (trade.entryPrice - trade.exitPrice) * trade.quantity;
}
