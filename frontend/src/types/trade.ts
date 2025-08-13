import { ForbiddenRuleViolation } from './forbidden-rules';
import { TradeIndicators, StrategyScoreResult } from './strategy-scoring';

// 거래 관련 타입 정의
export interface Trade {
  id: string;
  symbol: string; // 종목명
  type: 'buy' | 'sell'; // 매수/매도
  tradingType: 'breakout' | 'trend' | 'counter_trend'; // 매매 유형
  quantity: number; // 수량
  entryPrice: number; // 진입가
  exitPrice?: number; // 청산가 (선택적)
  entryTime: Date; // 진입 시간
  exitTime?: Date; // 청산 시간 (선택적)
  memo?: string; // 메모
  pnl?: number; // 손익 (계산됨)
  status: 'open' | 'closed'; // 거래 상태
  stopLoss?: number; // 손절가

  // 전략 채점 관련
  indicators?: TradeIndicators; // 입력 인디케이터
  strategyScore?: StrategyScoreResult; // 전략 점수 상세
  forbiddenPenalty?: number; // 금기룰 총 차감 점수
  finalScore?: number; // 최종 점수 (전략 점수 - 금기룰 차감)

  // 금기룰
  forbiddenViolations?: ForbiddenRuleViolation[]; // 금기룰 위반 기록

  createdAt: Date;
  updatedAt: Date;
}

// 새 거래 생성 시 사용하는 타입
export interface CreateTradeRequest {
  symbol: string;
  type: 'buy' | 'sell';
  tradingType: 'breakout' | 'trend' | 'counter_trend';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  entryTime: string; // ISO string
  exitTime?: string; // ISO string
  memo?: string;
  stopLoss?: number; // 손절가

  // 전략 채점 입력 (선택)
  indicators?: TradeIndicators;
}

// API 응답 타입
export interface TradesResponse {
  trades: Trade[];
  total: number;
  page: number;
  limit: number;
}

// 거래 필터링/정렬 옵션
export interface TradeFilters {
  symbol?: string;
  type?: 'buy' | 'sell';
  status?: 'open' | 'closed';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'entryTime' | 'symbol' | 'pnl';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
