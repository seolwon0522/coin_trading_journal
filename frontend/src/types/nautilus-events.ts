// Nautilus Trader Event Types (from Backend Redis → STOMP)

export interface NautilusTrade {
  tradeId: string
  strategyId: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  commission: number
  realizedPnl: number
  timestamp: string
}

export interface NautilusPosition {
  positionId: string
  strategyId: string
  symbol: string
  side: 'LONG' | 'SHORT'
  quantity: number
  entryPrice: number
  currentPrice: number
  unrealizedPnl: number
  realizedPnl: number
  timestamp: string
}

export interface NautilusOrder {
  orderId: string
  strategyId: string
  symbol: string
  side: 'BUY' | 'SELL'
  orderType: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT'
  quantity: number
  price?: number
  status: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED'
  filledQuantity: number
  avgFillPrice: number
  timestamp: string
}

export interface NautilusStrategyStatus {
  strategyId: string
  status: 'ACTIVE' | 'STOPPED' | 'ERROR'
  message?: string
  timestamp: string
}

export type NautilusEvent =
  | { type: 'trade'; data: NautilusTrade }
  | { type: 'position'; data: NautilusPosition }
  | { type: 'order'; data: NautilusOrder }
  | { type: 'strategy'; data: NautilusStrategyStatus }