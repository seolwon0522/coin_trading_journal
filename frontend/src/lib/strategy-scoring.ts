// Re-export constants for convenience
export { TOTAL_FORBIDDEN_POINTS, TOTAL_STRATEGY_POINTS } from '@/types/strategy-scoring';

/**
 * 전략별 채점 유틸 (포인트 기반)
 */

import { Trade } from '@/types/trade';
import {
  BREAKOUT_WEIGHTS,
  COUNTER_TREND_WEIGHTS,
  StrategyCriterionScore,
  StrategyScoreResult,
  TOTAL_FORBIDDEN_POINTS as TFP_INTERNAL,
  TOTAL_STRATEGY_POINTS as TSP_INTERNAL,
  TradeIndicators,
} from '@/types/strategy-scoring';
import { ForbiddenRulesChecker } from '@/lib/forbidden-rules-checker';

// 가중치 → 최대 포인트
function maxPoints(weight: number): number {
  return Math.round(TSP_INTERNAL * weight);
}

// 조각별 점수: 비율에 따른 단계 가점 (예: 1.5x 이상 만점, 1.4x 25, 1.3x 20 ...)
function scoreByThresholds(
  value: number,
  thresholds: Array<[number, number]>,
  defaultScore = 0
): number {
  for (const [threshold, score] of thresholds) {
    if (value >= threshold) return score;
  }
  return defaultScore;
}

// 안전한 클램프
function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function scoreBreakoutStrategy(
  trade: Trade,
  indicators: TradeIndicators
): StrategyScoreResult {
  const crits: StrategyCriterionScore[] = [];

  // 1) 거래량 비율 기반 점수
  const volMax = maxPoints(BREAKOUT_WEIGHTS.volume_confirmed);
  let volRatio = 0;
  let volScore = 0;
  if (
    indicators.volume !== undefined &&
    indicators.averageVolume !== undefined &&
    indicators.averageVolume > 0
  ) {
    const ratio = indicators.volume / indicators.averageVolume;
    volRatio = clamp(ratio / 1.5, 0, 1); // 1.5배를 100%로 정규화 시각화용
    // 예: 1.5x→만점, 1.4x→volMax*0.83(=대략 25/30), 1.3x→volMax*0.66(=대략 20/30)
    volScore = scoreByThresholds(
      ratio,
      [
        [1.5, volMax],
        [1.4, Math.round(volMax * 0.83)],
        [1.3, Math.round(volMax * 0.66)],
        [1.2, Math.round(volMax * 0.5)],
        [1.1, Math.round(volMax * 0.33)],
      ],
      0
    );
  }
  crits.push({
    code: 'volume_confirmed',
    description: '돌파봉 거래량 증가',
    weight: BREAKOUT_WEIGHTS.volume_confirmed,
    ratio: Number(volRatio.toFixed(2)),
    score: volScore,
    maxPoints: volMax,
  });

  // 2) 돌파 유효성 (진입가가 상단 초과 비율)
  const breakoutMax = maxPoints(BREAKOUT_WEIGHTS.breakout_validity);
  let breakoutRatio = 0;
  let breakoutScore = 0;
  if (indicators.prevRangeHigh !== undefined && indicators.prevRangeHigh > 0) {
    const over = trade.entryPrice - indicators.prevRangeHigh;
    const overRatio = over / indicators.prevRangeHigh;
    breakoutRatio = clamp(overRatio / 0.01, 0, 1); // 상단 대비 1% 초과 시 만점
    breakoutScore = scoreByThresholds(
      overRatio,
      [
        [0.02, breakoutMax],
        [0.015, Math.round(breakoutMax * 0.8)],
        [0.01, Math.round(breakoutMax * 0.6)],
        [0.005, Math.round(breakoutMax * 0.4)],
      ],
      0
    );
  }
  crits.push({
    code: 'breakout_validity',
    description: '명확한 박스/저항 돌파',
    weight: BREAKOUT_WEIGHTS.breakout_validity,
    ratio: Number(breakoutRatio.toFixed(2)),
    score: breakoutScore,
    maxPoints: breakoutMax,
  });

  // 3) 손실 제한 (손절폭 비율 낮을수록 만점)
  // Trade 타입에 stopLoss 필드가 없으므로 indicators의 stopLossWithinLimit만 사용
  const pullbackMax = maxPoints(BREAKOUT_WEIGHTS.pullback_control);
  let pullbackRatio = 0;
  let pullbackScore = 0;
  const within = indicators.stopLossWithinLimit === true;
  
  if (within) {
    // stopLossWithinLimit가 true면 리스크 관리가 잘 되었다고 가정
    pullbackRatio = 1;
    pullbackScore = pullbackMax;
  } else {
    // stopLossWithinLimit 정보가 없으면 중간 점수
    pullbackRatio = 0.5;
    pullbackScore = Math.round(pullbackMax * 0.5);
  }
  crits.push({
    code: 'pullback_control',
    description: '돌파 실패 시 손실 제한',
    weight: BREAKOUT_WEIGHTS.pullback_control,
    ratio: Number(pullbackRatio.toFixed(2)),
    score: pullbackScore,
    maxPoints: pullbackMax,
  });

  const totalScore = clamp(
    crits.reduce((s, c) => s + c.score, 0),
    0,
    TSP_INTERNAL
  );
  const maxPossibleScore = TSP_INTERNAL;
  const scorePercentage = (totalScore / maxPossibleScore) * 100;
  return { 
    strategy: 'breakout', 
    totalScore, 
    maxPossibleScore,
    scorePercentage,
    criteria: crits 
  };
}

export function scoreTrendStrategy(trade: Trade, indicators: TradeIndicators): StrategyScoreResult {
  const crits: StrategyCriterionScore[] = [];

  const alignMax = maxPoints(0.4);
  const expected = trade.side === 'BUY' ? 'up' : 'down';
  const aligned = indicators.htfTrend === expected ? 1 : 0;
  crits.push({
    code: 'htf_alignment',
    description: '상위 TF 추세 일치',
    weight: 0.4,
    ratio: aligned,
    score: Math.round(alignMax * aligned),
    maxPoints: alignMax,
  });

  const pullMax = maxPoints(0.3);
  const pull = indicators.pullbackOk ? 1 : 0;
  crits.push({
    code: 'pullback_entry',
    description: '되돌림 후 진입',
    weight: 0.3,
    ratio: pull,
    score: Math.round(pullMax * pull),
    maxPoints: pullMax,
  });

  const tsMax = maxPoints(0.3);
  const ts = indicators.trailStopCorrect ? 1 : 0;
  crits.push({
    code: 'trail_stop_quality',
    description: '트레일링 스탑 품질',
    weight: 0.3,
    ratio: ts,
    score: Math.round(tsMax * ts),
    maxPoints: tsMax,
  });

  const totalScore = clamp(
    crits.reduce((s, c) => s + c.score, 0),
    0,
    TSP_INTERNAL
  );
  const maxPossibleScore = TSP_INTERNAL;
  const scorePercentage = (totalScore / maxPossibleScore) * 100;
  return { 
    strategy: 'trend', 
    totalScore, 
    maxPossibleScore,
    scorePercentage,
    criteria: crits 
  };
}

export function scoreCounterTrendStrategy(
  _trade: Trade,
  indicators: TradeIndicators
): StrategyScoreResult {
  const crits: StrategyCriterionScore[] = [];

  const devMax = maxPoints(COUNTER_TREND_WEIGHTS.extreme_deviation);
  const devRatio = indicators.zscore !== undefined ? clamp((indicators.zscore - 2) / 1, 0, 1) : 0; // z>3 만점
  crits.push({
    code: 'extreme_deviation',
    description: '극단 이탈 진입',
    weight: COUNTER_TREND_WEIGHTS.extreme_deviation,
    ratio: Number(devRatio.toFixed(2)),
    score: Math.round(devMax * devRatio),
    maxPoints: devMax,
  });

  const revMax = maxPoints(COUNTER_TREND_WEIGHTS.reversion_confirmation);
  const rev = indicators.reversalSignal ? 1 : 0;
  crits.push({
    code: 'reversion_confirmation',
    description: '반전 신호 확인',
    weight: COUNTER_TREND_WEIGHTS.reversion_confirmation,
    ratio: rev,
    score: Math.round(revMax * rev),
    maxPoints: revMax,
  });

  const rrMax = maxPoints(COUNTER_TREND_WEIGHTS.tight_rr);
  let rrRatio = 0;
  if (indicators.riskReward !== undefined)
    rrRatio = clamp((indicators.riskReward - 1.5) / 0.5, 0, 1); // RR>=2 만점
  crits.push({
    code: 'tight_rr',
    description: '짧은 손절로 RR 확보',
    weight: COUNTER_TREND_WEIGHTS.tight_rr,
    ratio: Number(rrRatio.toFixed(2)),
    score: Math.round(rrMax * rrRatio),
    maxPoints: rrMax,
  });

  const totalScore = clamp(
    crits.reduce((s, c) => s + c.score, 0),
    0,
    TSP_INTERNAL
  );
  const maxPossibleScore = TSP_INTERNAL;
  const scorePercentage = (totalScore / maxPossibleScore) * 100;
  return { 
    strategy: 'counter_trend', 
    totalScore, 
    maxPossibleScore,
    scorePercentage,
    criteria: crits 
  };
}

export function computeStrategyScore(
  trade: Trade,
  indicators: TradeIndicators | undefined,
  strategyType?: 'breakout' | 'trend' | 'counter_trend'
): StrategyScoreResult | null {
  if (!indicators) return null;

  // Since Trade doesn't have tradingType, use the optional parameter or default to breakout
  const strategy = strategyType || 'breakout';
  
  switch (strategy) {
    case 'breakout':
      return scoreBreakoutStrategy(trade, indicators);
    case 'trend':
      return scoreTrendStrategy(trade, indicators);
    case 'counter_trend':
      return scoreCounterTrendStrategy(trade, indicators);
    default:
      return null;
  }
}

// 금기룰 포인트(가산) 계산: 위반이 없을수록 점수 득점
export function computeForbiddenPoints(
  trade: Trade,
  allTrades: Trade[],
  accountEquity: number
): number {
  const violations = ForbiddenRulesChecker.checkTrade(trade, allTrades, accountEquity);
  if (violations.length === 0) return TFP_INTERNAL;

  // 간단 규칙: 위반이 있을수록 감점하여 득점 감소 (최소 0)
  // 점수화: 총 배점에서 위반 penalty를 빼되, 하한 0
  const penalty = ForbiddenRulesChecker.calculateTotalPenalty(violations);
  return clamp(TFP_INTERNAL - penalty, 0, TFP_INTERNAL);
}
