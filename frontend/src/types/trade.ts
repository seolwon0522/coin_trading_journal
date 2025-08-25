import { ForbiddenRuleViolation } from './forbidden-rules';
import { TradeIndicators, StrategyScoreResult } from './strategy-scoring';
import Decimal from 'decimal.js';

// 거래 관련 타입 정의
export interface Trade {
  id: number;  // Backend Long 타입과 일치
  symbol: string; // 종목명
  
  // Backend와 통일된 필드
  side: 'BUY' | 'SELL'; // 매수/매도 (Backend TradeSide)
  type: 'SPOT' | 'FUTURES' | 'MARGIN'; // 거래 타입 (Backend TradeType)
  tradingStrategy: 'BREAKOUT' | 'TREND' | 'COUNTER_TREND' | 'SCALPING' | 'SWING' | 'POSITION'; // 전략 타입 (Backend TradingStrategy)
  
  // 정밀도가 중요한 숫자 필드는 Decimal 타입 사용
  quantity: Decimal; // 수량
  entryPrice: Decimal; // 진입가
  exitPrice?: Decimal; // 청산가 (선택적)
  entryTime: Date; // 진입 시간
  exitTime?: Date; // 청산 시간 (선택적)
  notes?: string; // 메모 (Backend와 통일: notes)
  profitLoss?: Decimal; // 손익 (Backend와 통일: profitLoss)
  profitLossPercentage?: Decimal; // 손익률 (Backend와 통일: profitLossPercentage)
  status: 'open' | 'closed'; // 거래 상태
  stopLoss?: Decimal; // 손절가
  takeProfit?: Decimal; // 익절가
  totalAmount?: Decimal; // 총액
  fee?: Decimal; // 수수료

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

// 새 거래 생성 시 사용하는 타입 (백엔드 CreateTradeRequest와 일치)
export interface CreateTradeRequest {
  // 필수 필드
  symbol: string;
  type: 'SPOT' | 'FUTURES' | 'MARGIN'; // 거래 타입
  side: 'BUY' | 'SELL'; // 매수/매도
  quantity: number;
  price: number; // 진입가격
  executedAt: string; // 체결 시간 (필수) - ISO string
  
  // 선택 필드
  tradingStrategy?: 'BREAKOUT' | 'TREND' | 'COUNTER_TREND' | 'SCALPING' | 'SWING' | 'POSITION';
  fee?: number;
  feeAsset?: string;
  notes?: string; // 메모
  strategy?: string; // 전략명
  stopLoss?: number;
  takeProfit?: number;
  entryTime?: string; // 진입 시간 (선택) - ISO string
  exitTime?: string; // 청산 시간 (선택) - ISO string

  // 전략 채점 입력 (프론트엔드 전용)
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
  side?: 'BUY' | 'SELL'; // Backend와 통일
  type?: 'SPOT' | 'FUTURES' | 'MARGIN'; // 거래 타입 필터
  status?: 'open' | 'closed';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'entryTime' | 'symbol' | 'profitLoss';  // Backend와 통일
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
