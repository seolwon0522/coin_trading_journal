'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CoinAutocomplete } from '@/components/trades/coin-autocomplete';

import { createTradeSchema, CreateTradeFormData } from '@/schemas/trade';
import { useTrades } from '@/hooks/use-trades';
import { Trade } from '@/lib/api/trades-api';
import { cn } from '@/lib/utils';

interface TradeFormProps {
  onSuccess?: () => void;
  trade?: Trade;
}

export function TradeFormV2({ onSuccess, trade }: TradeFormProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createTrade, updateTrade } = useTrades();

  const form = useForm<CreateTradeFormData>({
    resolver: zodResolver(createTradeSchema),
    defaultValues: trade
      ? {
          // 수정 모드: 기존 거래 데이터로 초기화
          symbol: trade.symbol,
          type: trade.type,
          side: trade.side,
          quantity: trade.quantity,
          price: trade.price,
          executedAt: trade.executedAt,
          tradingStrategy: trade.tradingStrategy || 'TREND',
          notes: trade.notes || '',
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit,
        }
      : {
          // 생성 모드: 기본값으로 초기화
          symbol: '',
          type: 'SPOT',
          side: 'BUY',
          quantity: undefined,
          price: undefined,
          executedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          tradingStrategy: 'TREND',
          notes: '',
          stopLoss: undefined,
          takeProfit: undefined,
          fee: undefined,
          feeAsset: '',
        },
  });

  const onSubmit = async (data: CreateTradeFormData) => {
    setIsSubmitting(true);
    try {
      // API 형식에 맞게 데이터 변환
      const apiData: Trade = {
        symbol: data.symbol,
        type: data.type,
        side: data.side,
        quantity: data.quantity,
        price: data.price,
        executedAt: data.executedAt,
        tradingStrategy: data.tradingStrategy,
        notes: data.notes || '',
        fee: data.fee,
        feeAsset: data.feeAsset,
        stopLoss: data.stopLoss,
        takeProfit: data.takeProfit,
      };

      if (trade?.id) {
        // 수정 모드
        await updateTrade(trade.id, apiData);
        toast.success('거래 기록이 수정되었습니다', {
          description: `${data.symbol} 거래가 업데이트되었습니다.`,
        });
      } else {
        // 생성 모드
        await createTrade(apiData);
        toast.success('거래 기록이 등록되었습니다', {
          description: `${data.symbol} ${data.side === 'BUY' ? '매수' : '매도'} 거래가 추가되었습니다.`,
        });
        form.reset();
      }
      onSuccess?.();
    } catch (error) {
      toast.error(trade ? '거래 수정 실패' : '거래 등록 실패', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 border rounded-lg bg-card">
      <div>
        <h2 className="text-xl font-semibold">
          {trade ? '거래 기록 수정' : '새 거래 등록'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {trade ? '기존 거래 정보를 수정하세요.' : '거래 정보를 입력하여 기록을 등록하세요.'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 기본 정보 섹션 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">기본 정보</h3>
            
            {/* 종목명 */}
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>종목명 *</FormLabel>
                  <FormControl>
                    <CoinAutocomplete
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="예: BTC, ETH..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 거래 타입과 방향 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>거래 타입 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="거래 타입 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SPOT">현물</SelectItem>
                        <SelectItem value="FUTURES">선물</SelectItem>
                        <SelectItem value="MARGIN">마진</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="side"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>매수/매도 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="매수/매도 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BUY">
                          <span className="text-blue-600">매수</span>
                        </SelectItem>
                        <SelectItem value="SELL">
                          <span className="text-red-600">매도</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 수량과 가격 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>수량 *</FormLabel>
                    <FormControl>
                      <NumberInput
                        placeholder="0.00000000"
                        value={field.value}
                        onChange={field.onChange}
                        min={0}
                        step={0.00000001}
                        precision={8}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>가격 *</FormLabel>
                    <FormControl>
                      <NumberInput
                        placeholder="0.00000000"
                        value={field.value}
                        onChange={field.onChange}
                        min={0}
                        step={0.00000001}
                        precision={8}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 체결 시간 */}
            <FormField
              control={form.control}
              name="executedAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>체결 시간 *</FormLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), 'PPP HH:mm', { locale: ko })
                          ) : (
                            <span>날짜와 시간을 선택하세요</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const currentTime = field.value ? 
                              format(new Date(field.value), 'HH:mm') : 
                              format(new Date(), 'HH:mm');
                            field.onChange(format(date, `yyyy-MM-dd'T'${currentTime}`));
                          }
                          setCalendarOpen(false);
                        }}
                        disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
                        initialFocus
                      />
                      <div className="p-3 border-t">
                        <Input
                          type="time"
                          value={field.value ? format(new Date(field.value), 'HH:mm') : ''}
                          onChange={(e) => {
                            const currentDate = field.value ? 
                              format(new Date(field.value), 'yyyy-MM-dd') : 
                              format(new Date(), 'yyyy-MM-dd');
                            field.onChange(`${currentDate}T${e.target.value}`);
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 전략 정보 섹션 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">전략 정보</h3>
            
            {/* 거래 전략 */}
            <FormField
              control={form.control}
              name="tradingStrategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>거래 전략</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="전략 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BREAKOUT">돌파</SelectItem>
                      <SelectItem value="TREND">추세추종</SelectItem>
                      <SelectItem value="COUNTER_TREND">역추세</SelectItem>
                      <SelectItem value="SCALPING">스캘핑</SelectItem>
                      <SelectItem value="SWING">스윙</SelectItem>
                      <SelectItem value="POSITION">포지션</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>사용한 거래 전략을 선택하세요</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 손절가와 익절가 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stopLoss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>손절가</FormLabel>
                    <FormControl>
                      <NumberInput
                        placeholder="손절 가격"
                        value={field.value}
                        onChange={field.onChange}
                        min={0}
                        step={0.00000001}
                        precision={8}
                      />
                    </FormControl>
                    <FormDescription>리스크 관리를 위한 손절가</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="takeProfit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>익절가</FormLabel>
                    <FormControl>
                      <NumberInput
                        placeholder="목표 가격"
                        value={field.value}
                        onChange={field.onChange}
                        min={0}
                        step={0.00000001}
                        precision={8}
                      />
                    </FormControl>
                    <FormDescription>목표 수익 실현 가격</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* 기타 정보 섹션 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">기타 정보</h3>
            
            {/* 수수료 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>수수료</FormLabel>
                    <FormControl>
                      <NumberInput
                        placeholder="0.00000000"
                        value={field.value}
                        onChange={field.onChange}
                        min={0}
                        step={0.00000001}
                        precision={8}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="feeAsset"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>수수료 자산</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="예: BNB, USDT"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 메모 */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메모</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="거래에 대한 메모를 입력하세요 (분석, 전략, 감정 등)"
                      className="min-h-[80px]"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>거래 이유, 시장 상황 등을 기록해보세요</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 제출 버튼 */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {trade ? '수정 중...' : '등록 중...'}
              </>
            ) : (
              trade ? '거래 수정' : '거래 등록'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}