'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  StrategyRequest,
  StrategyResponse,
  StrategyType,
  strategyApi,
} from '@/lib/api/strategy-api';

// 폼 검증 스키마
const strategySchema = z.object({
  name: z.string().min(2, '전략 이름은 2자 이상이어야 합니다').max(100),
  type: z.enum(['EMA_CROSS', 'MARKET_MAKER', 'ORDERBOOK_IMBALANCE']),
  symbol: z.string().min(1, '심볼을 선택해주세요'),
  description: z.string().optional(),
  testnet: z.boolean(),
  // EMA Cross 파라미터
  trade_size: z.string(),
  fast_ema_period: z.number().min(1).max(100),
  slow_ema_period: z.number().min(1).max(200),
  use_bracket_orders: z.boolean(),
  stop_loss_pct: z.string(),
  take_profit_pct: z.string(),
  // Market Maker 파라미터
  atr_period: z.number().min(1).max(100).optional(),
  atr_multiple: z.number().min(0.1).max(10).optional(),
  max_inventory: z.string().optional(),
  // Orderbook Imbalance 파라미터
  book_depth: z.number().min(1).max(50).optional(),
  imbalance_threshold: z.number().min(0.1).max(1).optional(),
});

type FormValues = z.infer<typeof strategySchema>;

interface StrategyFormProps {
  strategy?: StrategyResponse | null;
  onSuccess?: () => void;
}

export function StrategyForm({ strategy, onSuccess }: StrategyFormProps) {
  const [selectedType, setSelectedType] = useState<StrategyType>(
    strategy?.type || 'EMA_CROSS'
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(strategySchema),
    defaultValues: {
      name: strategy?.name || '',
      type: strategy?.type || 'EMA_CROSS',
      symbol: strategy?.symbol || 'BTCUSDT',
      description: strategy?.description || '',
      testnet: strategy?.testnet ?? true,
      // EMA Cross defaults
      trade_size: strategy?.params?.trade_size || '0.001',
      fast_ema_period: Number(strategy?.params?.fast_ema_period) || 10,
      slow_ema_period: Number(strategy?.params?.slow_ema_period) || 20,
      use_bracket_orders: strategy?.params?.use_bracket_orders ?? true,
      stop_loss_pct: strategy?.params?.stop_loss_pct || '0.02',
      take_profit_pct: strategy?.params?.take_profit_pct || '0.05',
      // Market Maker defaults
      atr_period: Number(strategy?.params?.atr_period) || 20,
      atr_multiple: Number(strategy?.params?.atr_multiple) || 6,
      max_inventory: strategy?.params?.max_inventory || '0.1',
      // Orderbook defaults
      book_depth: Number(strategy?.params?.book_depth) || 10,
      imbalance_threshold: Number(strategy?.params?.imbalance_threshold) || 0.6,
    },
  });

  // 전략 타입 변경 감지
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'type') {
        setSelectedType(value.type as StrategyType);
        // 템플릿 로드
        if (value.type && !strategy) {
          loadTemplate(value.type);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, strategy]);

  // 템플릿 로드
  const loadTemplate = async (type: string) => {
    try {
      const template = await strategyApi.getTemplate(type.toLowerCase());
      if (template.params) {
        Object.entries(template.params).forEach(([key, value]) => {
          form.setValue(key as any, value);
        });
      }
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  // 생성/수정 mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const params: any = {
        trade_size: values.trade_size,
      };

      // 타입별 파라미터 설정
      if (values.type === 'EMA_CROSS') {
        params.fast_ema_period = values.fast_ema_period;
        params.slow_ema_period = values.slow_ema_period;
        params.use_bracket_orders = values.use_bracket_orders;
        params.stop_loss_pct = values.stop_loss_pct;
        params.take_profit_pct = values.take_profit_pct;
      } else if (values.type === 'MARKET_MAKER') {
        params.atr_period = values.atr_period;
        params.atr_multiple = values.atr_multiple;
        params.max_inventory = values.max_inventory;
      } else if (values.type === 'ORDERBOOK_IMBALANCE') {
        params.book_depth = values.book_depth;
        params.imbalance_threshold = values.imbalance_threshold;
      }

      const request: StrategyRequest = {
        name: values.name,
        type: values.type as StrategyType,
        symbol: values.symbol,
        params,
        description: values.description,
        testnet: values.testnet,
      };

      if (strategy) {
        return strategyApi.update(strategy.id, request);
      } else {
        return strategyApi.create(request);
      }
    },
    onSuccess: () => {
      toast.success(strategy ? '전략이 수정되었습니다' : '전략이 생성되었습니다');
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          (strategy ? '전략 수정에 실패했습니다' : '전략 생성에 실패했습니다')
      );
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 기본 정보 */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>전략 이름</FormLabel>
                <FormControl>
                  <Input placeholder="예: BTC EMA 단기 전략" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>전략 타입</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!!strategy}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="전략 타입 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EMA_CROSS">EMA 교차</SelectItem>
                      <SelectItem value="MARKET_MAKER">마켓 메이커</SelectItem>
                      <SelectItem value="ORDERBOOK_IMBALANCE">
                        오더북 불균형
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>거래 심볼</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="심볼 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                      <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                      <SelectItem value="BNBUSDT">BNB/USDT</SelectItem>
                      <SelectItem value="XRPUSDT">XRP/USDT</SelectItem>
                      <SelectItem value="ADAUSDT">ADA/USDT</SelectItem>
                      <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>설명 (선택)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="전략에 대한 설명을 입력하세요"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="testnet"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">테스트넷 모드</FormLabel>
                  <FormDescription>
                    실제 자금이 아닌 테스트넷에서 실행합니다
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* 전략별 파라미터 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">전략 파라미터</h3>

          <FormField
            control={form.control}
            name="trade_size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>거래 크기</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="0.001" />
                </FormControl>
                <FormDescription>한 번에 거래할 수량</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* EMA Cross 파라미터 */}
          {selectedType === 'EMA_CROSS' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fast_ema_period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fast EMA 기간</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slow_ema_period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slow EMA 기간</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="use_bracket_orders"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>Bracket Orders 사용</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stop_loss_pct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>손절 (%)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0.02" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="take_profit_pct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>익절 (%)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0.05" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}

          {/* Market Maker 파라미터 */}
          {selectedType === 'MARKET_MAKER' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="atr_period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ATR 기간</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="atr_multiple"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ATR 배수</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="max_inventory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>최대 보유량</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0.1" />
                    </FormControl>
                    <FormDescription>최대 보유 가능한 수량</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Orderbook Imbalance 파라미터 */}
          {selectedType === 'ORDERBOOK_IMBALANCE' && (
            <>
              <FormField
                control={form.control}
                name="book_depth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>오더북 깊이</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>분석할 오더북 레벨 수</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imbalance_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>불균형 임계값</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>거래 시작 불균형 수준 (0.1-1.0)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? '저장 중...'
              : strategy
              ? '전략 수정'
              : '전략 생성'}
          </Button>
        </div>
      </form>
    </Form>
  );
}