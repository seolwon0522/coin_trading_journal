/**
 * 거래 통계 관련 타입 정의
 * Backend TradeStatisticsResponse와 통일
 */

// 거래 통계 응답 타입
export interface TradeStatistics {
  // 기간
  startDate: Date;
  endDate: Date;
  
  // 기본 통계 - Backend와 통일된 필드명
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // 퍼센트
  
  // 손익 통계
  totalProfitLoss: number;
  totalProfit: number;
  totalLoss: number;
  averageProfit: number;
  averageLoss: number;
  averageReturn: number;
  
  // 거래 금액 통계
  totalVolume: number;
  averageTradeSize: number;
  
  // 최고/최저 기록
  largestWin: number;
  largestLoss: number;
  bestWinRate: number;
  worstLossRate: number;
  
  // 리스크 지표
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  averageRiskRewardRatio: number;
  
  // 거래 빈도
  tradesPerDay: number;
  tradesPerWeek: number;
  tradesPerMonth: number;
  
  // 심볼별 통계
  mostTradedSymbol: string;
  mostProfitableSymbol: string;
  leastProfitableSymbol: string;
  uniqueSymbolsCount: number;
}

// 통계 조회 요청 파라미터
export interface StatisticsRequest {
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  symbol?: string;
  tradingStrategy?: string;
}

// 심볼별 통계
export interface SymbolStatistics {
  symbol: string;
  totalTrades: number;
  winRate: number;
  totalProfitLoss: number;
  averageReturn: number;
  volume: number;
}

// 시간대별 통계 (히트맵용)
export interface TimeStatistics {
  hour: number; // 0-23
  dayOfWeek: number; // 0-6 (일-토)
  totalTrades: number;
  winRate: number;
  averageReturn: number;
}

// 일별 손익 데이터 (차트용)
export interface DailyPnL {
  date: string; // YYYY-MM-DD
  pnl: number;
  cumulativePnl: number;
  tradeCount: number;
}

// 월별 통계
export interface MonthlyStatistics {
  month: string; // YYYY-MM
  totalTrades: number;
  winRate: number;
  totalProfitLoss: number;
  averageReturn: number;
  bestDay: number;
  worstDay: number;
}