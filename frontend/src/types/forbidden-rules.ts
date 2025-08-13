/**
 * 금기룰 타입 정의
 * 모든 매매 전략에 공통적으로 적용되는 위험 관리 규칙
 */

export type ForbiddenRuleSeverity = 'high' | 'medium' | 'low';

export interface ForbiddenRule {
  code: string;
  description: string;
  severity: ForbiddenRuleSeverity;
  score_penalty: number; // 점수 차감값
}

export interface ForbiddenRuleViolation {
  rule_code: string;
  description: string;
  severity: ForbiddenRuleSeverity;
  score_penalty: number;
  detected_at: Date;
  details?: Record<string, any>; // 추가적인 위반 상세 정보
}

// 금기룰 정의
export const FORBIDDEN_RULES: Record<string, ForbiddenRule> = {
  no_stoploss: {
    code: 'no_stoploss',
    description: '손절 설정 없음',
    severity: 'high',
    score_penalty: 30,
  },
  oversized_position: {
    code: 'oversized_position',
    description: '과도한 포지션 사이즈',
    severity: 'high',
    score_penalty: 25,
  },
  revenge_trade: {
    code: 'revenge_trade',
    description: '손실 직후 짧은 시간 내 재진입',
    severity: 'medium',
    score_penalty: 15,
  },
  chasing: {
    code: 'chasing',
    description: '급등 직후 추격 매수',
    severity: 'medium',
    score_penalty: 15,
  },
  overtrading: {
    code: 'overtrading',
    description: '단기간 과도한 거래 횟수',
    severity: 'medium',
    score_penalty: 20,
  },
  enter_before_news: {
    code: 'enter_before_news',
    description: '고임팩트 뉴스 직전 진입',
    severity: 'high',
    score_penalty: 25,
  },
  avg_down_no_plan: {
    code: 'avg_down_no_plan',
    description: '계획 없는 물타기',
    severity: 'high',
    score_penalty: 30,
  },
};

// 매개변수 설정
export const FORBIDDEN_RULE_PARAMS = {
  // 복수 거래 감지 시간 (분)
  revenge_trade_window: 30,
  // 하루 최대 거래 횟수
  max_daily_trades: 10,
  // 최대 포지션 사이즈 비율 (계좌 자산 대비)
  max_position_ratio: 0.05,
  // 고임팩트 뉴스 진입 금지 시간 (분)
  news_avoidance_window: 30,
};