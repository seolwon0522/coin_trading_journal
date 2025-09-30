/**
 * 전략 파라미터 검증 스키마
 * Zod를 사용한 Frontend 실시간 검증
 */

import { z } from 'zod';

// ==================== Common Parameters ====================

const commonParamsSchema = z.object({
  trade_size: z.coerce
    .number()
    .min(0.001, '거래 크기는 최소 0.001 이상이어야 합니다')
    .max(100, '거래 크기는 최대 100 이하여야 합니다')
    .default(0.01),
  
  max_positions: z.coerce
    .number()
    .int('정수만 입력 가능합니다')
    .min(1, '최소 1개 이상이어야 합니다')
    .max(10, '최대 10개까지 가능합니다')
    .default(1),
  
  stop_loss_pct: z.coerce
    .number()
    .min(0.001, '손절매 비율은 최소 0.1% 이상이어야 합니다')
    .max(0.5, '손절매 비율은 최대 50% 이하여야 합니다')
    .default(0.02)
    .optional(),
  
  take_profit_pct: z.coerce
    .number()
    .min(0.001, '익절 비율은 최소 0.1% 이상이어야 합니다')
    .max(1.0, '익절 비율은 최대 100% 이하여야 합니다')
    .default(0.03)
    .optional(),
});

// ==================== EMA Cross Strategy ====================

export const emaCrossParamsSchema = z.object({
  fast_period: z.coerce
    .number()
    .int('정수만 입력 가능합니다')
    .min(3, '빠른 EMA 기간은 최소 3 이상이어야 합니다')
    .max(50, '빠른 EMA 기간은 최대 50 이하여야 합니다')
    .default(10),
  
  slow_period: z.coerce
    .number()
    .int('정수만 입력 가능합니다')
    .min(10, '느린 EMA 기간은 최소 10 이상이어야 합니다')
    .max(200, '느린 EMA 기간은 최대 200 이하여야 합니다')
    .default(20),
  
  trade_size: z.coerce
    .number()
    .min(0.001)
    .max(100)
    .default(0.01),
  
  max_positions: z.coerce.number().int().min(1).max(10).default(1),
  stop_loss_pct: z.coerce.number().min(0.001).max(0.5).default(0.02),
  take_profit_pct: z.coerce.number().min(0.001).max(1.0).default(0.03),
}).refine(
  (data) => data.slow_period > data.fast_period,
  {
    message: '느린 EMA 기간은 빠른 EMA 기간보다 커야 합니다',
    path: ['slow_period'],
  }
).refine(
  (data) => data.take_profit_pct > data.stop_loss_pct,
  {
    message: '익절 비율은 손절 비율보다 커야 합니다',
    path: ['take_profit_pct'],
  }
);

export type EMACrossParams = z.infer<typeof emaCrossParamsSchema>;

// ==================== Grid Trading Strategy ====================

export const gridTradingParamsSchema = z.object({
  grid_levels: z.coerce
    .number()
    .int()
    .min(3, '그리드 레벨은 최소 3 이상이어야 합니다')
    .max(50, '그리드 레벨은 최대 50 이하여야 합니다')
    .default(10),
  
  grid_spacing: z.coerce
    .number()
    .min(0.001, '그리드 간격은 최소 0.1% 이상이어야 합니다')
    .max(0.1, '그리드 간격은 최대 10% 이하여야 합니다')
    .default(0.01),
  
  position_size: z.coerce
    .number()
    .min(0.001)
    .max(10)
    .default(0.01),
  
  max_positions: z.coerce.number().int().min(1).max(50).default(10),
  
  upper_price: z.coerce.number().positive().optional(),
  lower_price: z.coerce.number().positive().optional(),
}).refine(
  (data) => {
    if (data.upper_price && data.lower_price) {
      return data.upper_price > data.lower_price;
    }
    return true;
  },
  {
    message: '상단 가격은 하단 가격보다 높아야 합니다',
    path: ['upper_price'],
  }
);

export type GridTradingParams = z.infer<typeof gridTradingParamsSchema>;

// ==================== RSI Strategy ====================

export const rsiParamsSchema = z.object({
  rsi_period: z.coerce
    .number()
    .int()
    .min(5, 'RSI 기간은 최소 5 이상이어야 합니다')
    .max(50, 'RSI 기간은 최대 50 이하여야 합니다')
    .default(14),
  
  rsi_overbought: z.coerce
    .number()
    .int()
    .min(50, '과매수 기준은 최소 50 이상이어야 합니다')
    .max(90, '과매수 기준은 최대 90 이하여야 합니다')
    .default(70),
  
  rsi_oversold: z.coerce
    .number()
    .int()
    .min(10, '과매도 기준은 최소 10 이상이어야 합니다')
    .max(50, '과매도 기준은 최대 50 이하여야 합니다')
    .default(30),
  
  trade_size: z.coerce.number().min(0.001).max(100).default(0.01),
  max_positions: z.coerce.number().int().min(1).max(10).default(1),
}).refine(
  (data) => data.rsi_overbought > data.rsi_oversold,
  {
    message: '과매수 기준은 과매도 기준보다 높아야 합니다',
    path: ['rsi_overbought'],
  }
).refine(
  (data) => (data.rsi_overbought - data.rsi_oversold) >= 10,
  {
    message: '과매수와 과매도 기준 차이는 최소 10 이상이어야 합니다',
    path: ['rsi_overbought'],
  }
);

export type RSIParams = z.infer<typeof rsiParamsSchema>;

// ==================== Bollinger Bands Strategy ====================

export const bollingerBandsParamsSchema = z.object({
  bb_period: z.coerce
    .number()
    .int()
    .min(5, '볼린저 밴드 기간은 최소 5 이상이어야 합니다')
    .max(100, '볼린저 밴드 기간은 최대 100 이하여야 합니다')
    .default(20),
  
  bb_std: z.coerce
    .number()
    .min(1.0, '표준편차 배수는 최소 1.0 이상이어야 합니다')
    .max(4.0, '표준편차 배수는 최대 4.0 이하여야 합니다')
    .default(2.0),
  
  trade_size: z.coerce.number().min(0.001).max(100).default(0.01),
  max_positions: z.coerce.number().int().min(1).max(10).default(1),
});

export type BollingerBandsParams = z.infer<typeof bollingerBandsParamsSchema>;

// ==================== Momentum Strategy ====================

export const momentumParamsSchema = z.object({
  lookback_period: z.coerce
    .number()
    .int()
    .min(5, '모멘텀 기간은 최소 5 이상이어야 합니다')
    .max(100, '모멘텀 기간은 최대 100 이하여야 합니다')
    .default(20),
  
  momentum_threshold: z.coerce
    .number()
    .min(0.001, '모멘텀 임계값은 최소 0.1% 이상이어야 합니다')
    .max(0.2, '모멘텀 임계값은 최대 20% 이하여야 합니다')
    .default(0.02),
  
  trade_size: z.coerce.number().min(0.001).max(100).default(0.01),
  max_positions: z.coerce.number().int().min(1).max(10).default(1),
});

export type MomentumParams = z.infer<typeof momentumParamsSchema>;

// ==================== Orderbook Imbalance Strategy ====================

export const orderbookImbalanceParamsSchema = z.object({
  imbalance_threshold: z.coerce
    .number()
    .min(0.1, '불균형 임계값은 최소 10% 이상이어야 합니다')
    .max(0.9, '불균형 임계값은 최대 90% 이하여야 합니다')
    .default(0.3),
  
  order_levels: z.coerce
    .number()
    .int()
    .min(1, '주문 레벨은 최소 1 이상이어야 합니다')
    .max(20, '주문 레벨은 최대 20 이하여야 합니다')
    .default(5),
  
  spread_multiplier: z.coerce
    .number()
    .min(1.0, '스프레드 배수는 최소 1.0 이상이어야 합니다')
    .max(5.0, '스프레드 배수는 최대 5.0 이하여야 합니다')
    .default(1.5),
  
  position_size: z.coerce
    .number()
    .min(0.001)
    .max(10)
    .default(0.01),
  
  max_positions: z.coerce.number().int().min(1).max(20).default(5),
  
  min_spread_bps: z.coerce
    .number()
    .int()
    .min(1, '최소 스프레드는 최소 1 bps 이상이어야 합니다')
    .max(100, '최소 스프레드는 최대 100 bps 이하여야 합니다')
    .default(10),
});

export type OrderbookImbalanceParams = z.infer<typeof orderbookImbalanceParamsSchema>;

// ==================== Strategy Validator Map ====================

export const STRATEGY_PARAM_SCHEMAS = {
  ema_cross: emaCrossParamsSchema,
  grid: gridTradingParamsSchema,
  rsi: rsiParamsSchema,
  bollinger_bands: bollingerBandsParamsSchema,
  momentum: momentumParamsSchema,
  orderbook_imbalance: orderbookImbalanceParamsSchema,
} as const;

export type StrategyType = keyof typeof STRATEGY_PARAM_SCHEMAS;

// ==================== Helper Functions ====================

/**
 * 전략 타입에 맞는 스키마 가져오기
 */
export function getStrategySchema(strategyType: string) {
  return STRATEGY_PARAM_SCHEMAS[strategyType as StrategyType];
}

/**
 * 전략 파라미터 검증
 */
export function validateStrategyParams(strategyType: string, params: any) {
  const schema = getStrategySchema(strategyType);
  if (!schema) {
    throw new Error(`지원하지 않는 전략 타입: ${strategyType}`);
  }
  return schema.parse(params);
}

/**
 * 전략 파라미터 안전 검증 (에러 반환)
 */
export function safeValidateStrategyParams(strategyType: string, params: any) {
  const schema = getStrategySchema(strategyType);
  if (!schema) {
    return {
      success: false,
      error: `지원하지 않는 전략 타입: ${strategyType}`,
    };
  }
  
  const result = schema.safeParse(params);
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  } else {
    return {
      success: false,
      error: result.error.errors.map(e => `[${e.path.join('.')}] ${e.message}`).join('\n'),
      errors: result.error.errors,
    };
  }
}

// ==================== Default Values ====================

export const DEFAULT_STRATEGY_PARAMS = {
  ema_cross: {
    fast_period: 10,
    slow_period: 20,
    trade_size: 0.01,
    max_positions: 1,
    stop_loss_pct: 0.02,
    take_profit_pct: 0.03,
  },
  grid: {
    grid_levels: 10,
    grid_spacing: 0.01,
    position_size: 0.01,
    max_positions: 10,
  },
  rsi: {
    rsi_period: 14,
    rsi_overbought: 70,
    rsi_oversold: 30,
    trade_size: 0.01,
    max_positions: 1,
  },
  bollinger_bands: {
    bb_period: 20,
    bb_std: 2.0,
    trade_size: 0.01,
    max_positions: 1,
  },
  momentum: {
    lookback_period: 20,
    momentum_threshold: 0.02,
    trade_size: 0.01,
    max_positions: 1,
  },
  orderbook_imbalance: {
    imbalance_threshold: 0.3,
    order_levels: 5,
    spread_multiplier: 1.5,
    position_size: 0.01,
    max_positions: 5,
    min_spread_bps: 10,
  },
} as const;

/**
 * 전략 타입의 기본 파라미터 가져오기
 */
export function getDefaultParams(strategyType: StrategyType) {
  return DEFAULT_STRATEGY_PARAMS[strategyType] || {};
}
