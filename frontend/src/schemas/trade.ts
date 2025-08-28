import { z } from 'zod';

/**
 * 거래 생성 폼 검증 스키마
 * 백엔드 CreateTradeRequest와 일치
 */
export const createTradeSchema = z.object({
  // ===== 필수 필드 =====
  symbol: z
    .string()
    .min(1, '종목명을 입력해주세요')
    .max(20, '종목명은 20자 이하로 입력해주세요'),

  side: z.enum(['BUY', 'SELL'], {
    errorMap: () => ({ message: '매수/매도를 선택해주세요' }),
  }),

  entryPrice: z
    .number({
      required_error: '진입 가격을 입력해주세요',
      invalid_type_error: '올바른 숫자를 입력해주세요',
    })
    .positive('진입 가격은 0보다 커야 합니다'),

  entryQuantity: z
    .number({
      required_error: '진입 수량을 입력해주세요',
      invalid_type_error: '올바른 숫자를 입력해주세요',
    })
    .positive('진입 수량은 0보다 커야 합니다')
    .max(1000000, '수량이 너무 큽니다'),

  entryTime: z
    .string()
    .min(1, '진입 시간을 선택해주세요'),

  // ===== 선택 필드 =====
  exitPrice: z
    .number({
      invalid_type_error: '올바른 숫자를 입력해주세요',
    })
    .positive('청산 가격은 0보다 커야 합니다')
    .optional(),

  exitQuantity: z
    .number({
      invalid_type_error: '올바른 숫자를 입력해주세요',
    })
    .positive('청산 수량은 0보다 커야 합니다')
    .max(1000000, '수량이 너무 큽니다')
    .optional(),

  exitTime: z.string().optional(),

  notes: z
    .string()
    .max(1000, '메모는 1000자 이하로 입력해주세요')
    .optional(),

  // Legacy fields for backward compatibility (will be removed)
  type: z.enum(['SPOT', 'FUTURES', 'MARGIN']).optional(),
  quantity: z.number().optional(),
  price: z.number().optional(),
  executedAt: z.string().optional(),
  tradingStrategy: z.enum(['BREAKOUT', 'TREND', 'COUNTER_TREND', 'SCALPING', 'SWING', 'POSITION']).optional(),
  fee: z.number().optional(),
  feeAsset: z.string().optional(),
  strategy: z.string().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),

  // 전략 채점 입력 인디케이터 (프론트엔드 전용)
  indicators: z
    .object({
      volume: z.number().optional(),
      averageVolume: z.number().optional(),
      prevRangeHigh: z.number().optional(),
      stopLossWithinLimit: z.boolean().optional(),
      htfTrend: z.enum(['up', 'down', 'sideways']).optional(),
      pullbackOk: z.boolean().optional(),
      trailStopCorrect: z.boolean().optional(),
      zscore: z.number().optional(),
      reversalSignal: z.boolean().optional(),
      riskReward: z.number().optional(),
    })
    .optional(),
});

/**
 * 거래 필터링을 위한 스키마
 */
export const tradeFiltersSchema = z.object({
  symbol: z.string().optional(),
  type: z.enum(['SPOT', 'FUTURES', 'MARGIN']).optional(),
  side: z.enum(['BUY', 'SELL']).optional(),
  status: z.enum(['open', 'closed']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['executedAt', 'symbol', 'profitLoss']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

// 타입 추론
export type CreateTradeFormData = z.infer<typeof createTradeSchema>;
export type TradeFiltersData = z.infer<typeof tradeFiltersSchema>;