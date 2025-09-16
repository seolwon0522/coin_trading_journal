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

  // 초기 잔고 로드
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

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
    <Card className="h-full bg-background/50 backdrop-blur border-border/50 p-0">
      <Tabs value={orderSide} onValueChange={(v) => setOrderSide(v as 'BUY' | 'SELL')}>
        <TabsList className="grid w-full grid-cols-2 p-0 h-10 bg-transparent">
          <TabsTrigger
            value="BUY"
            className={cn(
              "rounded-none data-[state=active]:bg-emerald-500/10",
              "data-[state=active]:text-emerald-500 data-[state=active]:border-b-2",
              "data-[state=active]:border-emerald-500"
            )}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            매수
          </TabsTrigger>
          <TabsTrigger
            value="SELL"
            className={cn(
              "rounded-none data-[state=active]:bg-red-500/10",
              "data-[state=active]:text-red-500 data-[state=active]:border-b-2",
              "data-[state=active]:border-red-500"
            )}
          >
            <TrendingDown className="h-4 w-4 mr-1" />
            매도
          </TabsTrigger>
        </TabsList>

        <TabsContent value={orderSide} className="p-3 space-y-3 mt-0">
          {/* 주문 유형 선택 */}
          <div className="flex gap-2">
            <Button
              variant={orderType === 'LIMIT' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setOrderType('LIMIT')}
              className="flex-1 h-8 text-xs"
            >
              지정가
            </Button>
            <Button
              variant={orderType === 'MARKET' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setOrderType('MARKET')}
              className="flex-1 h-8 text-xs"
            >
              시장가
            </Button>
          </div>

          {/* 잔고 표시 */}
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Wallet className="h-3 w-3" />
              <span>사용 가능</span>
            </div>
            <span className="font-medium">
              {formatQuantity(availableBalance)} {orderSide === 'BUY' ? quoteAsset : baseAsset}
            </span>
          </div>

          {/* 가격 입력 (지정가만) */}
          {orderType === 'LIMIT' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                가격 ({quoteAsset})
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-9 text-sm pr-20 bg-background/50"
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
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
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
              className="h-9 text-sm bg-background/50"
            />
          </div>

          {/* 퍼센트 슬라이더 */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0%</span>
              <span className="font-medium text-foreground">{percentage.toFixed(0)}%</span>
              <span>100%</span>
            </div>
            <Slider
              value={[percentage]}
              onValueChange={handlePercentageChange}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="grid grid-cols-4 gap-1 mt-2">
              {[25, 50, 75, 100].map((percent) => (
                <Button
                  key={percent}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePercentageChange([percent])}
                  className="h-7 text-[10px]"
                >
                  {percent}%
                </Button>
              ))}
            </div>
          </div>

          {/* 총액 표시 */}
          <div className="space-y-1.5 p-2 bg-muted/30 rounded">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">총액</span>
              <span className="font-medium">
                {formatPrice(total)} {quoteAsset}
              </span>
            </div>
          </div>

          {/* 제출 버튼 */}
          <Button
            className={cn(
              'w-full h-10',
              orderSide === 'BUY'
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            )}
            onClick={handleSubmit}
            disabled={isPlacingOrder || !quantity || (orderType === 'LIMIT' && !price)}
          >
            {isPlacingOrder ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                주문 처리 중...
              </>
            ) : (
              <>
                {orderSide === 'BUY' ? '매수' : '매도'} {baseAsset}
              </>
            )}
          </Button>

          {/* 수수료 안내 */}
          <div className="text-[10px] text-muted-foreground text-center">
            거래 수수료: Maker 0.1% / Taker 0.1%
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}