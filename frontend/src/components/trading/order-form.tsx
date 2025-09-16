'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrders } from '@/hooks/use-orders';
import { OrderRequest } from '@/lib/api/order-api';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderFormProps {
  symbol: string;
  currentPrice?: number;
}

export function OrderForm({ symbol, currentPrice = 0 }: OrderFormProps) {
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<OrderRequest['type']>('LIMIT');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [total, setTotal] = useState<string>('0');
  const { placeOrder, isPlacingOrder, fetchBalance, getAssetBalance, balance } = useOrders();

  // Extract base and quote assets from symbol (e.g., BTCUSDT -> BTC and USDT)
  const { baseAsset, quoteAsset } = useMemo(() => {
    // Common quote assets
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

  // Fetch balance on mount
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Calculate total when price or quantity changes
  useEffect(() => {
    const priceNum = parseFloat(price) || 0;
    const quantityNum = parseFloat(quantity) || 0;
    const totalValue = priceNum * quantityNum;
    setTotal(totalValue.toFixed(8));
  }, [price, quantity]);

  // Set initial price to current market price
  useEffect(() => {
    if (currentPrice && !price) {
      setPrice(currentPrice.toFixed(8));
    }
  }, [currentPrice, price]);

  const handlePercentageClick = (percentage: number) => {
    const relevantBalance = orderSide === 'BUY'
      ? getAssetBalance(quoteAsset)
      : getAssetBalance(baseAsset);

    if (!relevantBalance) return;

    const availableAmount = relevantBalance.free;

    if (orderSide === 'BUY') {
      // Calculate quantity based on USDT balance and price
      const priceNum = parseFloat(price) || currentPrice || 0;
      if (priceNum > 0) {
        const usdtAmount = availableAmount * (percentage / 100);
        const qty = usdtAmount / priceNum;
        setQuantity(qty.toFixed(8));
      }
    } else {
      // For SELL, use the base asset balance directly
      const qty = availableAmount * (percentage / 100);
      setQuantity(qty.toFixed(8));
    }
  };

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
      // Reset form
      setQuantity('');
      setTotal('0');
      // Refresh balance
      await fetchBalance();
    } catch (error) {
      console.error('Order failed:', error);
    }
  };

  const relevantBalance = orderSide === 'BUY'
    ? getAssetBalance(quoteAsset)
    : getAssetBalance(baseAsset);

  return (
    <Card className="p-4">
      <Tabs value={orderSide} onValueChange={(v) => setOrderSide(v as 'BUY' | 'SELL')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="BUY" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            매수
          </TabsTrigger>
          <TabsTrigger value="SELL" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
            매도
          </TabsTrigger>
        </TabsList>

        <TabsContent value={orderSide} className="space-y-4 mt-4">
          {/* Balance Display */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">사용 가능</span>
            <span className="font-medium">
              {relevantBalance?.free.toFixed(8) || '0.00000000'} {orderSide === 'BUY' ? quoteAsset : baseAsset}
            </span>
          </div>

          {/* Order Type */}
          <div className="space-y-2">
            <Label htmlFor="orderType">주문 유형</Label>
            <Select value={orderType} onValueChange={(v) => setOrderType(v as OrderRequest['type'])}>
              <SelectTrigger id="orderType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LIMIT">지정가</SelectItem>
                <SelectItem value="MARKET">시장가</SelectItem>
                <SelectItem value="STOP_LOSS_LIMIT">스톱-지정가</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Input (for limit orders) */}
          {orderType !== 'MARKET' && (
            <div className="space-y-2">
              <Label htmlFor="price">가격 ({quoteAsset})</Label>
              <Input
                id="price"
                type="number"
                step="0.00000001"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          )}

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">수량 ({baseAsset})</Label>
            <Input
              id="quantity"
              type="number"
              step="0.00000001"
              placeholder="0.00"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          {/* Percentage Buttons */}
          <div className="grid grid-cols-4 gap-1">
            {[25, 50, 75, 100].map((percent) => (
              <Button
                key={percent}
                variant="outline"
                size="sm"
                onClick={() => handlePercentageClick(percent)}
                className="text-xs"
              >
                {percent}%
              </Button>
            ))}
          </div>

          {/* Total Display */}
          <div className="space-y-2">
            <Label htmlFor="total">총액 ({quoteAsset})</Label>
            <Input
              id="total"
              type="text"
              value={total}
              readOnly
              className="bg-muted"
            />
          </div>

          {/* Submit Button */}
          <Button
            className={cn(
              'w-full',
              orderSide === 'BUY' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
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
              `${orderSide === 'BUY' ? '매수' : '매도'} ${baseAsset}`
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  );
}