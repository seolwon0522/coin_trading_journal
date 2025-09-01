/**
 * 전략 채점 관련 타입 정의
 */

/**
 * 전체 점수 상수
 */
export const TOTAL_STRATEGY_POINTS = 100;
export const TOTAL_FORBIDDEN_POINTS = 100;

/**
 * 전략별 가중치
 */
export const BREAKOUT_WEIGHTS = {
  volume_confirmed: 0.3,      // 돌파봉 거래량 증가
  breakout_validity: 0.35,    // 명확한 박스/저항 돌파
  pullback_control: 0.35,     // 손실 제한 (리스크 관리)
};

export const COUNTER_TREND_WEIGHTS = {
  extreme_deviation: 0.35,    // 극단적 이격
  reversion_confirmation: 0.35, // 반전 신호 확인
  tight_rr: 0.3,              // 타이트한 손절
};

export const TREND_WEIGHTS = {
  trend_strength: 0.35,       // 추세 강도
  entry_timing: 0.35,         // 진입 타이밍
  momentum: 0.3,              // 모멘텀
};

/**
 * 거래 지표
 */
export interface TradeIndicators {
  // 거래량 관련
  volume?: number;
  averageVolume?: number;
  
  // 가격 레벨
  prevRangeHigh?: number;
  prevRangeLow?: number;
  support?: number;
  resistance?: number;
  
  // 추세 지표
  ma20?: number;
  ma50?: number;
  ma200?: number;
  
  // 모멘텀 지표
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  
  // 변동성
  atr?: number;
  bollinger_upper?: number;
  bollinger_lower?: number;
  
  // 추가 지표
  stochastic?: number;
  williams_r?: number;
  cci?: number;
  adx?: number;
  
  // 시장 전체 지표
  market_trend?: 'bullish' | 'bearish' | 'neutral';
  sector_trend?: 'bullish' | 'bearish' | 'neutral';
  
  // 리스크 관리
  stopLossWithinLimit?: boolean;
  
  // 추세 전략 지표
  htfTrend?: 'up' | 'down' | 'neutral';
  pullbackOk?: boolean;
  trailStopCorrect?: boolean;
  
  // 역추세 전략 지표
  zscore?: number;
  reversalSignal?: boolean;
  riskReward?: number;
}

/**
 * 전략 평가 항목별 점수
 */
export interface StrategyCriterionScore {
  code: string;           // 평가 항목 코드
  description: string;    // 평가 항목 설명
  weight: number;        // 가중치 (0~1)
  ratio: number;         // 달성 비율 (0~1)
  score: number;         // 획득 점수
  maxPoints: number;     // 최대 가능 점수
}

/**
 * 전략 채점 결과
 */
export interface StrategyScoreResult {
  strategy: 'breakout' | 'trend' | 'counter_trend' | 'unknown';
  totalScore: number;           // 총점
  maxPossibleScore: number;     // 최대 가능 점수
  scorePercentage: number;      // 백분율 점수
  criteria: StrategyCriterionScore[];  // 세부 평가 항목들
  summary?: string;             // 평가 요약
}

/**
 * 전체 채점 결과
 */
export interface TradeScoringResult {
  strategyScore: StrategyScoreResult | null;
  forbiddenPenalty: number;
  netScore: number;
  maxScore: number;
  scorePercentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  feedback: string[];
}