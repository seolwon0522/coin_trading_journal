'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { useCreateTrade } from '@/hooks/use-trades';
import { cn } from '@/lib/utils';

interface TradeFormProps {
  onSuccess?: () => void;
}

export function TradeForm({ onSuccess }: TradeFormProps) {
  const [entryCalendarOpen, setEntryCalendarOpen] = useState(false);
  const [exitCalendarOpen, setExitCalendarOpen] = useState(false);

  const createTradeMutation = useCreateTrade();

  const form = useForm<CreateTradeFormData>({
    resolver: zodResolver(createTradeSchema),
    defaultValues: {
      symbol: '',
      type: 'buy',
      tradingType: 'breakout', // 기본값을 돌파매매로 설정
      quantity: 0,
      entryPrice: 0,
      exitPrice: undefined,
      entryTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      exitTime: '',
      memo: '',
    },
  });

  const isBuyType = form.watch('type') === 'buy';
  const hasExitPrice = !!form.watch('exitPrice');

  const onSubmit = async (data: CreateTradeFormData) => {
    try {
      await createTradeMutation.mutateAsync(data);

      toast.success('매매 기록이 등록되었습니다!', {
        description: `${data.symbol} ${data.type === 'buy' ? '매수' : '매도'} 기록이 추가되었습니다.`,
      });

      // 폼 초기화
      form.reset();

      // 콜백 실행
      onSuccess?.();
    } catch (error) {
      toast.error('매매 기록 등록 실패', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
    }
  };

  return (
    <div className="space-y-6 p-6 border rounded-lg bg-card">
      <div>
        <h2 className="text-xl font-semibold">새 매매 기록 추가</h2>
        <p className="text-sm text-muted-foreground mt-1">
          거래 정보를 입력하여 매매 기록을 등록하세요.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* 종목명 */}
          <FormField
            control={form.control}
            name="symbol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>종목명</FormLabel>
                <FormControl>
                  <CoinAutocomplete
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="코인명 또는 심볼로 검색..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 매수/매도 토글 */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">거래 유형</FormLabel>
                  <FormDescription>매수 또는 매도를 선택하세요</FormDescription>
                </div>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <Label
                      htmlFor="trade-type"
                      className={cn(
                        'text-sm font-medium',
                        isBuyType ? 'text-red-600' : 'text-blue-600'
                      )}
                    >
                      {isBuyType ? '매도' : '매수'}
                    </Label>
                    <Switch
                      id="trade-type"
                      checked={isBuyType}
                      onCheckedChange={(checked) => field.onChange(checked ? 'buy' : 'sell')}
                    />
                    <Label
                      htmlFor="trade-type"
                      className={cn(
                        'text-sm font-medium',
                        isBuyType ? 'text-blue-600' : 'text-red-600'
                      )}
                    >
                      {isBuyType ? '매수' : '매도'}
                    </Label>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 매매 유형 선택 */}
          <FormField
            control={form.control}
            name="tradingType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>매매 유형</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="매매 유형을 선택하세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="breakout">돌파매매</SelectItem>
                    <SelectItem value="trend">추세매매</SelectItem>
                    <SelectItem value="counter_trend">역추세매매</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>사용한 매매 전략을 선택하세요</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 수량과 진입가 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>수량</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.00001"
                      placeholder="0.00000"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="entryPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>진입가</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 청산가와 손절가 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="exitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>청산가 (선택사항)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="포지션이 청산된 경우 입력"
                      value={field.value || ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormDescription>포지션을 청산한 경우에만 입력하세요</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stopLoss"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>손절가 (권장)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="손절 가격 설정"
                      value={field.value || ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormDescription>위험 관리를 위해 손절가를 설정하세요</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 진입 시간과 청산 시간 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="entryTime"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>진입 시간</FormLabel>
                  <Popover open={entryCalendarOpen} onOpenChange={setEntryCalendarOpen}>
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
                            format(parseISO(field.value), 'PPP HH:mm', { locale: ko })
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
                        selected={field.value ? parseISO(field.value) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const timeValue = field.value
                              ? format(parseISO(field.value), 'HH:mm')
                              : '09:00';
                            field.onChange(format(date, `yyyy-MM-dd'T'${timeValue}`));
                          }
                          setEntryCalendarOpen(false);
                        }}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                      />
                      <div className="p-3 border-t">
                        <Input
                          type="time"
                          value={field.value ? format(parseISO(field.value), 'HH:mm') : ''}
                          onChange={(e) => {
                            const currentDate = field.value
                              ? format(parseISO(field.value), 'yyyy-MM-dd')
                              : format(new Date(), 'yyyy-MM-dd');
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

            {hasExitPrice && (
              <FormField
                control={form.control}
                name="exitTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>청산 시간</FormLabel>
                    <Popover open={exitCalendarOpen} onOpenChange={setExitCalendarOpen}>
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
                              format(parseISO(field.value), 'PPP HH:mm', { locale: ko })
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
                          selected={field.value ? parseISO(field.value) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const timeValue = field.value
                                ? format(parseISO(field.value), 'HH:mm')
                                : '09:00';
                              field.onChange(format(date, `yyyy-MM-dd'T'${timeValue}`));
                            }
                            setExitCalendarOpen(false);
                          }}
                          disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                          initialFocus
                        />
                        <div className="p-3 border-t">
                          <Input
                            type="time"
                            value={field.value ? format(parseISO(field.value), 'HH:mm') : ''}
                            onChange={(e) => {
                              const currentDate = field.value
                                ? format(parseISO(field.value), 'yyyy-MM-dd')
                                : format(new Date(), 'yyyy-MM-dd');
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
            )}
          </div>

          {/* 메모 */}
          <FormField
            control={form.control}
            name="memo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>메모 (선택사항)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="거래에 대한 메모를 입력하세요 (분석, 전략, 감정 등)"
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>거래 이유, 전략, 시장 상황 등을 기록해보세요</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 제출 버튼 */}
          <Button type="submit" className="w-full" disabled={createTradeMutation.isPending}>
            {createTradeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                등록 중...
              </>
            ) : (
              '매매 기록 등록'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
