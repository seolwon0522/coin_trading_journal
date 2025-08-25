/**
 * Statistics 데이터 매핑 유틸리티
 * Backend API 응답과 Frontend 타입 간의 변환을 담당
 */

import { TradeStatistics, StatisticsRequest } from '@/types/statistics';

// Backend API에서 받는 원시 데이터 타입
export interface ApiStatisticsResponse {
  startDate: string;
  endDate: string;
  
  // 기본 통계
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: string; // Backend는 BigDecimal → string
  
  // 손익 통계
  totalProfitLoss: string;
  totalProfit: string;
  totalLoss: string;
  averageProfit: string;
  averageLoss: string;
  averageReturn: string;
  
  // 거래 금액 통계
  totalVolume: string;
  averageTradeSize: string;
  
  // 최고/최저 기록
  largestWin: string;
  largestLoss: string;
  bestWinRate: string;
  worstLossRate: string;
  
  // 리스크 지표
  profitFactor: string;
  sharpeRatio: string;
  maxDrawdown: string;
  averageRiskRewardRatio: string;
  
  // 거래 빈도
  tradesPerDay: string;
  tradesPerWeek: string;
  tradesPerMonth: string;
  
  // 심볼별 통계
  mostTradedSymbol: string;
  mostProfitableSymbol: string;
  leastProfitableSymbol: string;
  uniqueSymbolsCount: number;
}

/**
 * Backend API 응답을 Frontend TradeStatistics 타입으로 변환
 */
export function mapApiResponseToStatistics(apiStats: ApiStatisticsResponse): TradeStatistics {
  return {
    // 기간
    startDate: new Date(apiStats.startDate),
    endDate: new Date(apiStats.endDate),
    
    // 기본 통계
    totalTrades: apiStats.totalTrades,
    winningTrades: apiStats.winningTrades,
    losingTrades: apiStats.losingTrades,
    winRate: parseFloat(apiStats.winRate),
    
    // 손익 통계 - BigDecimal string을 number로 변환
    totalProfitLoss: parseFloat(apiStats.totalProfitLoss),
    totalProfit: parseFloat(apiStats.totalProfit),
    totalLoss: parseFloat(apiStats.totalLoss),
    averageProfit: parseFloat(apiStats.averageProfit),
    averageLoss: parseFloat(apiStats.averageLoss),
    averageReturn: parseFloat(apiStats.averageReturn),
    
    // 거래 금액 통계
    totalVolume: parseFloat(apiStats.totalVolume),
    averageTradeSize: parseFloat(apiStats.averageTradeSize),
    
    // 최고/최저 기록
    largestWin: parseFloat(apiStats.largestWin),
    largestLoss: parseFloat(apiStats.largestLoss),
    bestWinRate: parseFloat(apiStats.bestWinRate),
    worstLossRate: parseFloat(apiStats.worstLossRate),
    
    // 리스크 지표
    profitFactor: parseFloat(apiStats.profitFactor),
    sharpeRatio: parseFloat(apiStats.sharpeRatio),
    maxDrawdown: parseFloat(apiStats.maxDrawdown),
    averageRiskRewardRatio: parseFloat(apiStats.averageRiskRewardRatio),
    
    // 거래 빈도
    tradesPerDay: parseFloat(apiStats.tradesPerDay),
    tradesPerWeek: parseFloat(apiStats.tradesPerWeek),
    tradesPerMonth: parseFloat(apiStats.tradesPerMonth),
    
    // 심볼별 통계
    mostTradedSymbol: apiStats.mostTradedSymbol,
    mostProfitableSymbol: apiStats.mostProfitableSymbol,
    leastProfitableSymbol: apiStats.leastProfitableSymbol,
    uniqueSymbolsCount: apiStats.uniqueSymbolsCount,
  };
}

/**
 * Frontend StatisticsRequest를 Backend API 요청 형식으로 변환
 */
export function mapStatisticsRequestToApi(request: StatisticsRequest): any {
  return {
    startDate: request.startDate,
    endDate: request.endDate,
    symbol: request.symbol?.toUpperCase(),
    tradingStrategy: request.tradingStrategy,
  };
}