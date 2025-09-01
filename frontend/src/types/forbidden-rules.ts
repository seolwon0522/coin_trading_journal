/**
 * 금기 규칙 관련 타입 정의
 */

/**
 * 금기 규칙 위반 정보
 */
export interface ForbiddenRuleViolation {
  rule_code: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  score_penalty: number;
  detected_at: Date;
  details: Record<string, any>;
}

/**
 * 금기 규칙 정의
 */
export interface ForbiddenRule {
  description: string;
  severity: 'high' | 'medium' | 'low';
  score_penalty: number;
}

/**
 * 금기 규칙 목록
 */
export const FORBIDDEN_RULES: Record<string, ForbiddenRule> = {
  no_stoploss: {
    description: '손절 설정 없음',
    severity: 'high',
    score_penalty: 20,
  },
  oversized_position: {
    description: '과도한 포지션 사이즈',
    severity: 'high',
    score_penalty: 25,
  },
  revenge_trade: {
    description: '복수 거래',
    severity: 'high',
    score_penalty: 30,
  },
  chasing: {
    description: '급등 추격 매수',
    severity: 'medium',
    score_penalty: 15,
  },
  overtrading: {
    description: '과도한 거래 빈도',
    severity: 'medium',
    score_penalty: 15,
  },
  avg_down_no_plan: {
    description: '계획 없는 물타기',
    severity: 'high',
    score_penalty: 25,
  },
};

/**
 * 금기 규칙 체크 파라미터
 */
export const FORBIDDEN_RULE_PARAMS = {
  max_position_ratio: 0.1, // 계좌 자본의 10% 이상
  revenge_trade_window: 30, // 30분 이내 재진입
  chasing_threshold: 0.05, // 5% 이상 급등
  max_daily_trades: 10, // 일일 최대 거래 횟수
  avg_down_threshold: 0.9, // 동일 종목 90% 이상 가격에서 재매수
};