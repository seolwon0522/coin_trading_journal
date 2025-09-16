'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrders } from '@/hooks/use-orders';
import { OrderRequest } from '@/lib/api/order-api';
import { formatPrice, formatQuantity } from '@/lib/format';
import { Loader2, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface ProfessionalOrderFormProps {
  symbol: string;
  currentPrice?: number;
}

export function ProfessionalOrderForm({ symbol, currentPrice = 0 }: ProfessionalOrderFormProps) {
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [percentage, setPercentage] = useState<number>(0);
  const { placeOrder, isPlacingOrder, fetchBalance, getAssetBalance, balance } = useOrders();

  // 심볼에서 base와 quote 자산 추출
  const { baseAsset, quoteAsset } = useMemo(() => {
    const quotes = ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH', 'BNB'];
    let base = symbol;
    let quote = 'USDT';

    for (const q of quotes) {
      if (symbol.endsWith(q)) {
        base = symbol.slice(0, -q.length);
        quote = q;
        break;
      }
    }

    return { baseAsset: base, quoteAsset: quote };
  }, [symbol]);

  // 초기 잔고 로드 및 주기적인 새로고침
  useEffect(() => {
    // 초기 로드
    fetchBalance();

    // 5초마다 잔고 새로고침
    const intervalId = setInterval(() => {
      fetchBalance();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchBalance]);

  // 심볼 변경 시 잔고 새로고침
  useEffect(() => {
    fetchBalance();
  }, [symbol, fetchBalance]);

  // 현재 가격 설정
  useEffect(() => {
    if (currentPrice && !price) {
      setPrice(currentPrice.toString());
    }
  }, [currentPrice, price]);

  // 관련 잔고 가져오기
  const relevantBalance = orderSide === 'BUY'
    ? getAssetBalance(quoteAsset)
    : getAssetBalance(baseAsset);

  const availableBalance = relevantBalance?.free || 0;

  // 총액 계산
  const total = useMemo(() => {
    const priceNum = parseFloat(price) || 0;
    const quantityNum = parseFloat(quantity) || 0;
    return priceNum * quantityNum;
  }, [price, quantity]);

  // 퍼센트 슬라이더 변경 처리
  const handlePercentageChange = (value: number[]) => {
    const percent = value[0];
    setPercentage(percent);

    if (!availableBalance) return;

    if (orderSide === 'BUY') {
      const priceNum = parseFloat(price) || currentPrice || 0;
      if (priceNum > 0) {
        const usdtAmount = availableBalance * (percent / 100);
        const qty = usdtAmount / priceNum;
        setQuantity(qty.toString());
      }
    } else {
      const qty = availableBalance * (percent / 100);
      setQuantity(qty.toString());
    }
  };

  // 주문 제출
  const handleSubmit = async () => {
    if (!quantity || (orderType === 'LIMIT' && !price)) {
      return;
    }

    const orderRequest: OrderRequest = {
      symbol: symbol,
      side: orderSide,
      type: orderType,
      quantity: parseFloat(quantity),
      ...(orderType === 'LIMIT' && { price: parseFloat(price) }),
      ...(orderType === 'LIMIT' && { timeInForce: 'GTC' }),
    };

    try {
      await placeOrder(orderRequest);
      // 폼 초기화
      setQuantity('');
      setPercentage(0);
      // 잔고 새로고침
      await fetchBalance();
    } catch (error) {
      console.error('Order failed:', error);
    }
  };

  return (
    <Card className="h-full bg-transparent border-0 p-0 flex flex-col">
      <Tabs value={orderSide} onValueChange={(v) => setOrderSide(v as 'BUY' | 'SELL')} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 p-0 h-9 bg-[#1a1a1a] flex-shrink-0 border-b border-[#2a2a2a]">
          <TabsTrigger
            value="BUY"
            className={cn(
              "rounded-none h-full text-xs font-normal",
              "data-[state=active]:bg-emerald-500/10",
              "data-[state=active]:text-emerald-400 data-[state=active]:border-b-2",
              "data-[state=active]:border-emerald-400"
            )}
          >
            매수
          </TabsTrigger>
          <TabsTrigger
            value="SELL"
            className={cn(
              "rounded-none h-full text-xs font-normal",
              "data-[state=active]:bg-red-500/10",
              "data-[state=active]:text-red-400 data-[state=active]:border-b-2",
              "data-[state=active]:border-red-400"
            )}
          >
            매도
          </TabsTrigger>
        </TabsList>

        <TabsContent value={orderSide} className="flex-1 p-2 mt-0 flex flex-col overflow-hidden bg-[#161616]">
          <div className="flex-1 flex flex-col justify-between space-y-2">
            {/* 주문 유형 선택 */}
            <div className="flex gap-1">
            <Button
              variant={orderType === 'LIMIT' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setOrderType('LIMIT')}
              className="flex-1 h-7 text-[10px] bg-[#252525] hover:bg-[#2a2a2a]"
            >
              지정가
            </Button>
            <Button
              variant={orderType === 'MARKET' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setOrderType('MARKET')}
              className="flex-1 h-7 text-[10px] bg-[#252525] hover:bg-[#2a2a2a]"
            >
              시장가
            </Button>
          </div>

            {/* 잔고 표시 */}
            <div className="flex items-center justify-between p-1.5 bg-[#1a1a1a] rounded-sm text-[10px]">
              <span className="text-gray-500">사용 가능</span>
              <span className="text-gray-400 font-medium tabular-nums">
                {formatQuantity(availableBalance)} {orderSide === 'BUY' ? quoteAsset : baseAsset}
              </span>
            </div>

          {/* 가격 입력 (지정가만) */}
          {orderType === 'LIMIT' && (
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500 font-normal">
                가격 ({quoteAsset})
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-8 text-xs pr-16 bg-[#1a1a1a] border-[#2a2a2a] focus:border-[#3a3a3a] tabular-nums"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-xs"
                    onClick={() => {
                      const p = parseFloat(price) || currentPrice || 0;
                      setPrice((p * 0.99).toString());
                    }}
                  >
                    -
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-xs"
                    onClick={() => {
                      const p = parseFloat(price) || currentPrice || 0;
                      setPrice((p * 1.01).toString());
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>
              {currentPrice > 0 && (
                <div className="text-[10px] text-muted-foreground">
                  현재가: {formatPrice(currentPrice)}
                </div>
              )}
            </div>
          )}

            {/* 수량 입력 */}
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500 font-normal">
                수량 ({baseAsset})
              </Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  // 퍼센트 계산
                  if (availableBalance > 0) {
                    const qty = parseFloat(e.target.value) || 0;
                    if (orderSide === 'BUY') {
                      const priceNum = parseFloat(price) || currentPrice || 0;
                      if (priceNum > 0) {
                        const percent = (qty * priceNum / availableBalance) * 100;
                        setPercentage(Math.min(100, Math.max(0, percent)));
                      }
                    } else {
                      const percent = (qty / availableBalance) * 100;
                      setPercentage(Math.min(100, Math.max(0, percent)));
                    }
                  }
                }}
                className="h-8 text-xs bg-[#1a1a1a] border-[#2a2a2a] focus:border-[#3a3a3a] tabular-nums"
              />
            </div>

            {/* 퍼센트 슬라이더 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px] text-gray-500">
                <span>0%</span>
                <span className="text-gray-400">{percentage.toFixed(0)}%</span>
                <span>100%</span>
              </div>
              <Slider
                value={[percentage]}
                onValueChange={handlePercentageChange}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="grid grid-cols-4 gap-0.5 mt-1">
                {[25, 50, 75, 100].map((percent) => (
                  <Button
                    key={percent}
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePercentageChange([percent])}
                    className="h-6 text-[9px] bg-[#252525] hover:bg-[#2a2a2a]"
                  >
                    {percent}%
                  </Button>
                ))}
              </div>
            </div>

            {/* 총액 표시 */}
            <div className="p-1.5 bg-[#1a1a1a] rounded-sm">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">총액</span>
                <span className="text-gray-400 font-medium tabular-nums">
                  {formatPrice(total)} {quoteAsset}
                </span>
              </div>
            </div>

            {/* 제출 버튼 */}
            <Button
              className={cn(
                'w-full h-9 text-xs font-medium',
                orderSide === 'BUY'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              )}
              onClick={handleSubmit}
              disabled={isPlacingOrder || !quantity || (orderType === 'LIMIT' && !price)}
            >
              {isPlacingOrder ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  주문 처리 중...
                </>
              ) : (
                <>
                  {orderSide === 'BUY' ? '매수' : '매도'} {baseAsset}
                </>
              )}
            </Button>

            {/* 수수료 안내 */}
            <div className="text-[9px] text-gray-600 text-center">
              거래 수수료: Maker 0.1% / Taker 0.1%
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}