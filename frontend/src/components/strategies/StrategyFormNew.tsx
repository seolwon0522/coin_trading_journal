'use client';

import { useState } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  StrategyRequest,
  StrategyResponse,
  StrategyType,
  strategyApi,
} from '@/lib/api/strategy-api';
import {
  STRATEGY_PARAM_SCHEMAS,
  getDefaultParams,
  type StrategyType as SchemaStrategyType,
} from '@/schemas/strategy';
import { Loader2, Info, CheckCircle, XCircle } from 'lucide-react';

// ==================== Base Form Schema ====================

const baseStrategySchema = z.object({
  name: z.string().min(2, '전략 이름은 2자 이상이어야 합니다').max(100),
  type: z.enum(['EMA_CROSS', 'GRID', 'RSI', 'BOLLINGER_BANDS', 'MOMENTUM', 'ORDERBOOK_IMBALANCE']),
  symbol: z.string().min(1, '심볼을 선택해주세요'),
  description: z.string().optional(),
  testnet: z.boolean().default(true),
});

type BaseFormValues = z.infer<typeof baseStrategySchema>;

// ==================== Strategy Type Mapping ====================

const STRATEGY_TYPE_MAP: Record<StrategyType, SchemaStrategyType> = {
  EMA_CROSS: 'ema_cross',
  GRID: 'grid',
  RSI: 'rsi',
  BOLLINGER_BANDS: 'bollinger_bands',
  MOMENTUM: 'momentum',
  ORDERBOOK_IMBALANCE: 'orderbook_imbalance',
};

const STRATEGY_DISPLAY_NAMES: Record<StrategyType, string> = {
  EMA_CROSS: 'EMA 크로스',
  GRID: '그리드 트레이딩',
  RSI: 'RSI',
  BOLLINGER_BANDS: '볼린저 밴드',
  MOMENTUM: '모멘텀',
  ORDERBOOK_IMBALANCE: '호가 불균형',
};

// ==================== Component ====================

interface StrategyFormProps {
  strategy?: StrategyResponse | null;
  onSuccess?: () => void;
}

export function StrategyFormNew({ strategy, onSuccess }: StrategyFormProps) {
  const isEditMode = !!strategy;
  const [selectedType, setSelectedType] = useState<StrategyType>(
    strategy?.type || 'EMA_CROSS'
  );
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message?: string } | null>(null);

  // Base form
  const form = useForm<BaseFormValues & Record<string, any>>({
    resolver: zodResolver(baseStrategySchema),
    defaultValues: {
      name: strategy?.name || '',
      type: strategy?.type || 'EMA_CROSS',
      symbol: strategy?.symbol || 'BTCUSDT',
      description: strategy?.description || '',
      testnet: strategy?.testnet ?? true,
      ...getDefaultParams(STRATEGY_TYPE_MAP[selectedType]),
      ...(strategy?.params || {}),
    },
  });

  // Mutation
  const createMutation = useMutation({
    mutationFn: (data: StrategyRequest) => strategyApi.create(data),
    onSuccess: () => {
      toast.success('전략이 생성되었습니다');
      onSuccess?.();
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || error.message;
      toast.error('전략 생성 실패', { description: errorMsg });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: StrategyRequest) => strategyApi.update(strategy!.id, data),
    onSuccess: () => {
      toast.success('전략이 수정되었습니다');
      onSuccess?.();
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || error.message;
      toast.error('전략 수정 실패', { description: errorMsg });
    },
  });

  // Form submit
  const onSubmit = async (values: BaseFormValues & Record<string, any>) => {
    const schemaType = STRATEGY_TYPE_MAP[values.type];
    const paramSchema = STRATEGY_PARAM_SCHEMAS[schemaType];
    
    if (!paramSchema) {
      toast.error('지원하지 않는 전략 타입입니다');
      return;
    }

    // Extract params
    const { name, type, symbol, description, testnet, ...params } = values;
    
    // Validate params
    const paramValidation = paramSchema.safeParse(params);
    if (!paramValidation.success) {
      const errors = paramValidation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
      toast.error('파라미터 검증 실패', { description: errors });
      setValidationResult({ valid: false, message: errors });
      return;
    }

    setValidationResult({ valid: true, message: '검증 성공' });

    const request: StrategyRequest = {
      name,
      type,
      symbol,
      description,
      testnet,
      params: paramValidation.data,
    };

    if (isEditMode) {
      updateMutation.mutate(request);
    } else {
      createMutation.mutate(request);
    }
  };

  // Type change handler
  const handleTypeChange = (newType: StrategyType) => {
    setSelectedType(newType);
    const defaults = getDefaultParams(STRATEGY_TYPE_MAP[newType]);
    
    // Reset params to defaults
    Object.keys(defaults).forEach((key) => {
      form.setValue(key, defaults[key as keyof typeof defaults]);
    });
    
    setValidationResult(null);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>전략 이름과 타입을 설정합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>전략 이름</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 내 EMA 전략" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>전략 타입</FormLabel>
                  <Select
                    disabled={isEditMode}
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleTypeChange(value as StrategyType);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="전략 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(STRATEGY_DISPLAY_NAMES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    전략 타입은 생성 후 변경할 수 없습니다
                  </FormDescription>
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
                  <FormControl>
                    <Input placeholder="BTCUSDT" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명 (선택)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="전략에 대한 설명..." {...field} />
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
                    <FormLabel className="text-base">Testnet 모드</FormLabel>
                    <FormDescription>
                      Testnet에서 실행 (실제 자금 사용 안 함)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Strategy Parameters */}
        {renderParametersCard(selectedType, form)}

        {/* Validation Result */}
        {validationResult && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                {validationResult.valid ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-600">파라미터 검증 성공</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-red-600">파라미터 검증 실패</span>
                      <pre className="mt-2 text-xs text-red-500 whitespace-pre-wrap">
                        {validationResult.message}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {(createMutation.isPending || updateMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditMode ? '수정' : '생성'}
          </Button>
          {onSuccess && (
            <Button type="button" variant="outline" onClick={onSuccess}>
              취소
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}

// ==================== Parameter Cards ====================

function renderParametersCard(strategyType: StrategyType, form: any) {
  const schemaType = STRATEGY_TYPE_MAP[strategyType];
  
  switch (schemaType) {
    case 'ema_cross':
      return <EMACrossParams form={form} />;
    case 'grid':
      return <GridParams form={form} />;
    case 'rsi':
      return <RSIParams form={form} />;
    case 'bollinger_bands':
      return <BollingerBandsParams form={form} />;
    case 'momentum':
      return <MomentumParams form={form} />;
    case 'orderbook_imbalance':
      return <OrderbookImbalanceParams form={form} />;
    default:
      return null;
  }
}

// ==================== EMA Cross Parameters ====================

function EMACrossParams({ form }: { form: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>EMA Cross 파라미터</CardTitle>
        <CardDescription>이동평균선 교차 전략 설정</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fast_period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>빠른 EMA 기간</FormLabel>
                <FormControl>
                  <Input type="number" min={3} max={50} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
                <FormDescription>3-50 (작을수록 민감)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slow_period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>느린 EMA 기간</FormLabel>
                <FormControl>
                  <Input type="number" min={10} max={200} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
                <FormDescription>10-200 (클수록 안정적)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="trade_size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>거래 크기</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" min={0.001} max={100} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormDescription>0.001-100</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_positions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>최대 포지션</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={10} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
                <FormDescription>1-10</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="stop_loss_pct"
            render={({ field }) => (
              <FormItem>
                <FormLabel>손절매 비율</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" min={0.001} max={0.5} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormDescription>0.02 = 2%</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="take_profit_pct"
            render={({ field }) => (
              <FormItem>
                <FormLabel>익절 비율</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" min={0.001} max={1.0} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormDescription>0.03 = 3%</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Grid Parameters ====================

function GridParams({ form }: { form: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grid Trading 파라미터</CardTitle>
        <CardDescription>그리드 트레이딩 전략 설정</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="grid_levels"
            render={({ field }) => (
              <FormItem>
                <FormLabel>그리드 레벨</FormLabel>
                <FormControl>
                  <Input type="number" min={3} max={50} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
                <FormDescription>3-50 (많을수록 촘촘)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="grid_spacing"
            render={({ field }) => (
              <FormItem>
                <FormLabel>그리드 간격</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" min={0.001} max={0.1} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormDescription>0.01 = 1%</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="position_size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>포지션 크기</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" min={0.001} max={10} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormDescription>각 그리드별 크기</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_positions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>최대 포지션</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={50} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
                <FormDescription>1-50</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== RSI Parameters ====================

function RSIParams({ form }: { form: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>RSI 파라미터</CardTitle>
        <CardDescription>RSI 오실레이터 전략 설정</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="rsi_period"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RSI 기간</FormLabel>
              <FormControl>
                <Input type="number" min={5} max={50} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
              </FormControl>
              <FormDescription>5-50 (14가 표준)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="rsi_overbought"
            render={({ field }) => (
              <FormItem>
                <FormLabel>과매수 기준</FormLabel>
                <FormControl>
                  <Input type="number" min={50} max={90} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
                <FormDescription>50-90 (70 표준)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rsi_oversold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>과매도 기준</FormLabel>
                <FormControl>
                  <Input type="number" min={10} max={50} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
                <FormDescription>10-50 (30 표준)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="trade_size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>거래 크기</FormLabel>
              <FormControl>
                <Input type="number" step="0.001" min={0.001} max={100} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

// ==================== Bollinger Bands Parameters ====================

function BollingerBandsParams({ form }: { form: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bollinger Bands 파라미터</CardTitle>
        <CardDescription>볼린저 밴드 전략 설정</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="bb_period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>볼린저 밴드 기간</FormLabel>
                <FormControl>
                  <Input type="number" min={5} max={100} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
                <FormDescription>5-100 (20 표준)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bb_std"
            render={({ field }) => (
              <FormItem>
                <FormLabel>표준편차 배수</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" min={1.0} max={4.0} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormDescription>1.0-4.0 (2.0 표준)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="trade_size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>거래 크기</FormLabel>
              <FormControl>
                <Input type="number" step="0.001" min={0.001} max={100} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

// ==================== Momentum Parameters ====================

function MomentumParams({ form }: { form: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Momentum 파라미터</CardTitle>
        <CardDescription>모멘텀 전략 설정</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="lookback_period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>모멘텀 계산 기간</FormLabel>
                <FormControl>
                  <Input type="number" min={5} max={100} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
                <FormDescription>5-100</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="momentum_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>모멘텀 임계값</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" min={0.001} max={0.2} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormDescription>0.02 = 2%</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="trade_size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>거래 크기</FormLabel>
              <FormControl>
                <Input type="number" step="0.001" min={0.001} max={100} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

// ==================== Orderbook Imbalance Parameters ====================

function OrderbookImbalanceParams({ form }: { form: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Orderbook Imbalance 파라미터</CardTitle>
        <CardDescription>호가 불균형 기반 마켓 메이킹 전략</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="imbalance_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>불균형 임계값</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0.1} max={0.9} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormDescription>0.3 = 30%</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="order_levels"
            render={({ field }) => (
              <FormItem>
                <FormLabel>주문 레벨</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={20} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
                <FormDescription>1-20</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="spread_multiplier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>스프레드 배수</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" min={1.0} max={5.0} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormDescription>1.0-5.0</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="position_size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>포지션 크기</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" min={0.001} max={10} {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="min_spread_bps"
          render={({ field }) => (
            <FormItem>
              <FormLabel>최소 스프레드 (bps)</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={100} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
              </FormControl>
              <FormDescription>10 bps = 0.1%</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
