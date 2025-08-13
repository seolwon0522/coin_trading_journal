// 전략 채점 타입 정의

export type TradingStrategy = 'breakout' | 'trend' | 'counter_trend';

// 총 배점 설정 (전략 + 금기룰 = 100점)
export const TOTAL_STRATEGY_POINTS = 60; // 전략 기준 총점
export const TOTAL_FORBIDDEN_POINTS = 40; // 금기룰 준수 총점

// 공통 인디케이터 입력값 타입
export interface TradeIndicators {
  // 돌파매매용
  volume?: number; // 현재 봉 거래량
  averageVolume?: number; // 최근 N봉 평균 거래량
  prevRangeHigh?: number; // 직전 박스/저항 상단
  stopLossWithinLimit?: boolean; // 손절폭 제한 충족 여부

  // 추세매매용
  htfTrend?: 'up' | 'down' | 'sideways'; // 상위 타임프레임 추세
  pullbackOk?: boolean; // 되돌림 진입 타이밍 적절 여부
  trailStopCorrect?: boolean; // 트레일링 스탑 운영 적절 여부

  // 역추세매매용
  zscore?: number; // 극단 이탈 지표값
  reversalSignal?: boolean; // 반전 신호 확인 여부
  riskReward?: number; // 예상/실제 RR 값
}

export interface StrategyCriterionScore {
  code:
    | 'volume_confirmed'
    | 'breakout_validity'
    | 'pullback_control'
    | 'htf_alignment'
    | 'pullback_entry'
    | 'trail_stop_quality'
    | 'extreme_deviation'
    | 'reversion_confirmation'
    | 'tight_rr';
  description: string;
  weight: number; // 0~1 (전략 총점 대비 가중치 비율)
  ratio: number; // 0~1 (해당 기준 달성 비율)
  score: number; // 기준 점수 (point 단위)
  maxPoints: number; // 기준 최대 점수 (TOTAL_STRATEGY_POINTS * weight)
}

export interface StrategyScoreResult {
  strategy: TradingStrategy;
  totalScore: number; // 전략 파트 점수 (0~TOTAL_STRATEGY_POINTS)
  criteria: StrategyCriterionScore[];
}

// 각 전략별 가중치 매핑 (합계 = 1)
export const BREAKOUT_WEIGHTS = {
  volume_confirmed: 0.3,
  breakout_validity: 0.3,
  pullback_control: 0.4,
} as const;

export const TREND_WEIGHTS = {
  htf_alignment: 0.4,
  pullback_entry: 0.3,
  trail_stop_quality: 0.3,
} as const;

export const COUNTER_TREND_WEIGHTS = {
  extreme_deviation: 0.4,
  reversion_confirmation: 0.3,
  tight_rr: 0.3,
} as const;
