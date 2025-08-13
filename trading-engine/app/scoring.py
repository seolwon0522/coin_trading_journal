from datetime import datetime
from typing import List
from schemas import Trade, Indicators, StrategyScoreResult, StrategyCriterionScore

TOTAL_STRATEGY_POINTS = 60
TOTAL_FORBIDDEN_POINTS = 40

BREAKOUT_WEIGHTS = {
    'volume_confirmed': 0.25,
    'breakout_validity': 0.25,
    'pullback_control': 0.3,
    'entry_candle_quality': 0.2,
}
COUNTER_TREND_WEIGHTS = {
    'extreme_deviation': 0.3,
    'reversion_confirmation': 0.25,
    'tight_rr': 0.25,
    'entry_candle_quality': 0.1,  # 아랫꼬리 품질(롱 기준)
    'bollinger_position': 0.1,    # 밴드 하단 근접도(롱 기준)
}

TREND_WEIGHTS = {
    'htf_alignment': 0.3,
    'htf_alignment2': 0.2,
    'pullback_entry': 0.25,
    'trail_stop_quality': 0.25,
}

def clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))

def max_points(weight: float) -> int:
    return round(TOTAL_STRATEGY_POINTS * weight)

def score_by_thresholds(value: float, thresholds: list[tuple[float, int]], default_score: int = 0) -> int:
    for threshold, score in thresholds:
        if value >= threshold:
            return score
    return default_score

def breakout_reference(ind: Indicators) -> float | None:
    base_candidates = [x for x in [ind.prevRangeHigh, ind.trendlineHigh] if x is not None]
    if not base_candidates:
        return None
    base = max(base_candidates)
    if ind.atr is not None and ind.atr > 0:
        return base + ind.atr * 0.1
    return base * (1.001)

def score_breakout(trade: Trade, ind: Indicators) -> StrategyScoreResult:
    crits: List[StrategyCriterionScore] = []

    # 1) 거래량
    vol_max = max_points(BREAKOUT_WEIGHTS['volume_confirmed'])
    vol_ratio = 0.0
    vol_score = 0
    if ind.volume is not None and ind.averageVolume and ind.averageVolume > 0:
        ratio = ind.volume / ind.averageVolume
        vol_ratio = clamp(ratio / 1.5, 0, 1)
        vol_score = score_by_thresholds(ratio, [
            (1.5, vol_max),
            (1.4, round(vol_max * 0.83)),
            (1.3, round(vol_max * 0.66)),
            (1.2, round(vol_max * 0.5)),
            (1.1, round(vol_max * 0.33)),
        ], 0)
    crits.append(StrategyCriterionScore(
        code='volume_confirmed', description='돌파봉 거래량 증가', weight=BREAKOUT_WEIGHTS['volume_confirmed'],
        ratio=round(vol_ratio, 2), score=vol_score, maxPoints=vol_max
    ))

    # 2) 돌파 유효성
    brk_max = max_points(BREAKOUT_WEIGHTS['breakout_validity'])
    brk_ratio = 0.0
    brk_score = 0
    ref = breakout_reference(ind)
    if ref is not None and ref > 0:
        over = trade.entryPrice - ref
        over_ratio = over / ref
        brk_ratio = clamp(over_ratio / 0.01, 0, 1)
        brk_score = score_by_thresholds(over_ratio, [
            (0.02, brk_max),
            (0.015, round(brk_max * 0.8)),
            (0.01, round(brk_max * 0.6)),
            (0.005, round(brk_max * 0.4)),
        ], 0)
    crits.append(StrategyCriterionScore(
        code='breakout_validity', description='박스/추세선 돌파 유효성', weight=BREAKOUT_WEIGHTS['breakout_validity'],
        ratio=round(brk_ratio, 2), score=brk_score, maxPoints=brk_max
    ))

    # 3) 손실 제한
    pb_max = max_points(BREAKOUT_WEIGHTS['pullback_control'])
    pb_ratio = 0.0
    pb_score = 0
    within = (ind.stopLossWithinLimit is True) or (
        trade.stopLoss is not None and abs(trade.entryPrice - trade.stopLoss) / trade.entryPrice <= 0.02
    )
    if trade.stopLoss is not None:
        sl_ratio = abs(trade.entryPrice - trade.stopLoss) / trade.entryPrice
        pb_ratio = clamp(0.02 / max(sl_ratio, 0.0001), 0, 1)
        pb_score = score_by_thresholds(1 - sl_ratio, [
            (1 - 0.02, pb_max),
            (1 - 0.025, round(pb_max * 0.8)),
            (1 - 0.03, round(pb_max * 0.6)),
        ], round(pb_max * 0.5) if within else 0)
    elif within:
        pb_ratio = 1.0
        pb_score = pb_max
    crits.append(StrategyCriterionScore(
        code='pullback_control', description='돌파 실패 시 손실 제한', weight=BREAKOUT_WEIGHTS['pullback_control'],
        ratio=round(pb_ratio, 2), score=pb_score, maxPoints=pb_max
    ))

    # 4) 엔트리 캔들 품질(윗꼬리 작을수록 가점)
    ec_max = max_points(BREAKOUT_WEIGHTS['entry_candle_quality'])
    ec_ratio = 0.0
    ec_score = 0
    if ind.entryCandleUpperWickRatio is not None and ind.entryCandleUpperWickRatio >= 0:
        # upper wick 0 → 만점, 0.2 → 80%, 0.3 → 60%, 0.5 → 30%
        w = ind.entryCandleUpperWickRatio
        ec_ratio = clamp(1 - w / 0.2, 0, 1)  # 0.2를 기준 만점 스케일
        ec_score = score_by_thresholds(1 - w, [
            (1 - 0.0, ec_max),
            (1 - 0.2, round(ec_max * 0.8)),
            (1 - 0.3, round(ec_max * 0.6)),
            (1 - 0.5, round(ec_max * 0.3)),
        ], 0)
    crits.append(StrategyCriterionScore(
        code='entry_candle_quality', description='엔트리 캔들 품질(윗꼬리)', weight=BREAKOUT_WEIGHTS['entry_candle_quality'],
        ratio=round(ec_ratio, 2), score=ec_score, maxPoints=ec_max
    ))

    total = int(clamp(sum(c.score for c in crits), 0, TOTAL_STRATEGY_POINTS))
    return StrategyScoreResult(strategy='breakout', totalScore=total, criteria=crits)

def score_trend(trade: Trade, ind: Indicators) -> StrategyScoreResult:
    crits: List[StrategyCriterionScore] = []

    align_max = max_points(TREND_WEIGHTS['htf_alignment'])
    expected = 'up' if trade.type == 'buy' else 'down'
    aligned = 1.0 if ind.htfTrend == expected else 0.0
    crits.append(StrategyCriterionScore(
        code='htf_alignment', description='상위 TF 추세 일치', weight=TREND_WEIGHTS['htf_alignment'],
        ratio=aligned, score=round(align_max * aligned), maxPoints=align_max
    ))

    align2_max = max_points(TREND_WEIGHTS['htf_alignment2'])
    aligned2 = 1.0 if ind.htfTrend2 == expected else 0.0
    crits.append(StrategyCriterionScore(
        code='htf_alignment2', description='보조 상위 TF 추세 일치', weight=TREND_WEIGHTS['htf_alignment2'],
        ratio=aligned2, score=round(align2_max * aligned2), maxPoints=align2_max
    ))

    pull_max = max_points(TREND_WEIGHTS['pullback_entry'])
    pull = 1.0 if ind.pullbackOk else 0.0
    crits.append(StrategyCriterionScore(
        code='pullback_entry', description='되돌림 후 진입', weight=TREND_WEIGHTS['pullback_entry'],
        ratio=pull, score=round(pull_max * pull), maxPoints=pull_max
    ))

    ts_max = max_points(TREND_WEIGHTS['trail_stop_quality'])
    ts = 1.0 if ind.trailStopCorrect else 0.0
    crits.append(StrategyCriterionScore(
        code='trail_stop_quality', description='트레일링 스탑 품질', weight=TREND_WEIGHTS['trail_stop_quality'],
        ratio=ts, score=round(ts_max * ts), maxPoints=ts_max
    ))

    total = int(clamp(sum(c.score for c in crits), 0, TOTAL_STRATEGY_POINTS))
    return StrategyScoreResult(strategy='trend', totalScore=total, criteria=crits)

def score_counter(trade: Trade, ind: Indicators) -> StrategyScoreResult:
    crits: List[StrategyCriterionScore] = []

    dev_max = max_points(COUNTER_TREND_WEIGHTS['extreme_deviation'])
    dev_ratio = clamp(((ind.zscore or 0) - 2) / 1, 0, 1)
    crits.append(StrategyCriterionScore(
        code='extreme_deviation', description='극단 이탈 진입', weight=COUNTER_TREND_WEIGHTS['extreme_deviation'],
        ratio=round(dev_ratio, 2), score=round(dev_max * dev_ratio), maxPoints=dev_max
    ))

    rev_max = max_points(COUNTER_TREND_WEIGHTS['reversion_confirmation'])
    rev = 1.0 if ind.reversalSignal else 0.0
    crits.append(StrategyCriterionScore(
        code='reversion_confirmation', description='반전 신호 확인', weight=COUNTER_TREND_WEIGHTS['reversion_confirmation'],
        ratio=rev, score=round(rev_max * rev), maxPoints=rev_max
    ))

    rr_max = max_points(COUNTER_TREND_WEIGHTS['tight_rr'])
    rr_ratio = clamp(((ind.riskReward or 0) - 1.5) / 0.5, 0, 1)
    crits.append(StrategyCriterionScore(
        code='tight_rr', description='짧은 손절로 RR 확보', weight=COUNTER_TREND_WEIGHTS['tight_rr'],
        ratio=round(rr_ratio, 2), score=round(rr_max * rr_ratio), maxPoints=rr_max
    ))

    # 엔트리 캔들 품질(숏/롱에 따라 아랫꼬리/윗꼬리 가중이 다르지만 롱 기준 아랫꼬리 사용)
    ec_max = max_points(COUNTER_TREND_WEIGHTS['entry_candle_quality'])
    ec_ratio = 0.0
    ec_score = 0
    wick = ind.entryCandleLowerWickRatio if trade.type == 'buy' else ind.entryCandleUpperWickRatio
    if wick is not None and wick >= 0:
        # wick 0 → 만점, 0.2 → 80%, 0.3 → 60%, 0.5 → 30%
        ec_ratio = clamp(1 - wick / 0.2, 0, 1)
        ec_score = score_by_thresholds(1 - wick, [
            (1 - 0.0, ec_max),
            (1 - 0.2, round(ec_max * 0.8)),
            (1 - 0.3, round(ec_max * 0.6)),
            (1 - 0.5, round(ec_max * 0.3)),
        ], 0)
    crits.append(StrategyCriterionScore(
        code='entry_candle_quality', description='엔트리 캔들 품질', weight=COUNTER_TREND_WEIGHTS['entry_candle_quality'],
        ratio=round(ec_ratio, 2), score=ec_score, maxPoints=ec_max
    ))

    # 볼린저 포지션(롱: 하단 근접도가 높을수록 가점, 숏: 상단 근접도가 높을수록 가점)
    bp_max = max_points(COUNTER_TREND_WEIGHTS['bollinger_position'])
    bp_ratio = 0.0
    bp_score = 0
    if ind.bollingerPercent is not None:
        if trade.type == 'buy':
            # 0(하단) 근접 → 좋음
            bp_ratio = clamp(1 - ind.bollingerPercent, 0, 1)
        else:
            # 1(상단) 근접 → 좋음
            bp_ratio = clamp(ind.bollingerPercent, 0, 1)
        bp_score = round(bp_max * bp_ratio)
    crits.append(StrategyCriterionScore(
        code='bollinger_position', description='볼린저 밴드 위치', weight=COUNTER_TREND_WEIGHTS['bollinger_position'],
        ratio=round(bp_ratio, 2), score=bp_score, maxPoints=bp_max
    ))

    total = int(clamp(sum(c.score for c in crits), 0, TOTAL_STRATEGY_POINTS))
    return StrategyScoreResult(strategy='counter_trend', totalScore=total, criteria=crits)

def compute_strategy_score(trade: Trade) -> StrategyScoreResult | None:
    ind = trade.indicators or Indicators()
    if trade.tradingType == 'breakout':
        return score_breakout(trade, ind)
    if trade.tradingType == 'trend':
        return score_trend(trade, ind)
    if trade.tradingType == 'counter_trend':
        return score_counter(trade, ind)
    return None

# 금기룰 점수는 추후 실제 규칙 엔진 도입 시 교체 (현재는 프론트와 동일 컨셉)
from schemas import StrategyScoreResult  # for typing reuse

def compute_forbidden_points() -> int:
    # 위반이 없다고 가정하면 만점
    return TOTAL_FORBIDDEN_POINTS