// 백엔드와 완전히 일치하는 Trade 타입 정의

export interface Trade {
  id: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  entryQuantity: number;
  entryTime: string; // ISO 8601 string
  exitPrice?: number;
  exitQuantity?: number;
  exitTime?: string; // ISO 8601 string
  pnl?: number;
  pnlPercent?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradeRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  entryQuantity: number;
  entryTime: string;
  exitPrice?: number;
  exitQuantity?: number;
  exitTime?: string;
  notes?: string;
}

export interface TradesPageResponse {
  content: Trade[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}