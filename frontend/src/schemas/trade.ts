import { z } from 'zod';

// 거래 생성을 위한 zod 스키마
export const createTradeSchema = z.object({
  symbol: z.string().min(1, '종목명을 입력해주세요').max(20, '종목명은 20자 이하로 입력해주세요'),

  type: z.enum(['buy', 'sell'], {
    message: '매수/매도를 선택해주세요',
  }),

  // 매매 유형 추가 (돌파매매, 추세매매, 역추세매매)
  tradingType: z.enum(['breakout', 'trend', 'counter_trend'], {
    message: '매매 유형을 선택해주세요',
  }),

  quantity: z
    .number({
      message: '올바른 숫자를 입력해주세요',
    })
    .positive('수량은 0보다 커야 합니다')
    .max(1000000, '수량이 너무 큽니다'),

  entryPrice: z
    .number({
      message: '올바른 숫자를 입력해주세요',
    })
    .positive('진입가는 0보다 커야 합니다'),

  exitPrice: z
    .number({
      message: '올바른 숫자를 입력해주세요',
    })
    .positive('청산가는 0보다 커야 합니다')
    .optional(),

  entryTime: z.string().min(1, '진입 시간을 선택해주세요'),

  exitTime: z.string().optional(),

  memo: z.string().max(500, '메모는 500자 이하로 입력해주세요').optional(),

  stopLoss: z
    .number({
      message: '올바른 숫자를 입력해주세요',
    })
    .positive('손절가는 0보다 커야 합니다')
    .optional(),

  // 전략 채점 입력 인디케이터 (선택)
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

// 거래 필터링을 위한 스키마
export const tradeFiltersSchema = z.object({
  symbol: z.string().optional(),
  type: z.enum(['buy', 'sell']).optional(),
  status: z.enum(['open', 'closed']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['entryTime', 'symbol', 'pnl']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

// 타입 추론
export type CreateTradeFormData = z.infer<typeof createTradeSchema>;
export type TradeFiltersData = z.infer<typeof tradeFiltersSchema>;
