'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import { formatPrice, formatQuantity } from '@/lib/format';
import { useOrders } from '@/hooks/use-orders';
import {
  Plus,
  Minus,
  Info,
  ChevronDown,
  Lock,
  ArrowRight
} from 'lucide-react';

interface BinanceOrderFormProps {
  symbol: string;
  currentPrice: number;
}

export const BinanceOrderForm = memo(function BinanceOrderForm({
  symbol,
  currentPrice
}: BinanceOrderFormProps) {
  const { placeOrder, fetchBalance, balance, loading } = useOrders();

  // 주문 상태
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET' | 'STOP_LIMIT'>('LIMIT');
  const [price, setPrice] = useState(currentPrice.toFixed(2));
  const [stopPrice, setStopPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [percentage, setPercentage] = useState(0);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // 심볼 파싱
  const { baseAsset, quoteAsset } = useMemo(() => {
    const quoteAssets = ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH', 'BNB'];
    const quote = quoteAssets.find(asset => symbol.endsWith(asset)) || 'USDT';
    const base = symbol.replace(quote, '');
    return { baseAsset: base, quoteAsset: quote };
  }, [symbol]);

  // 현재 가격 업데이트
  useEffect(() => {
    if (currentPrice && orderType === 'LIMIT') {
      setPrice(currentPrice.toFixed(2));
    }
  }, [currentPrice, orderType]);

  // 잔액 업데이트
  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [symbol]);

  // 가용 잔액 계산
  const availableBalance = useMemo(() => {
    if (orderSide === 'BUY') {
      return balance[quoteAsset] || 0;
    } else {
      return balance[baseAsset] || 0;
    }
  }, [orderSide, balance, baseAsset, quoteAsset]);

  // 총액 계산
  const total = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const prc = parseFloat(price) || currentPrice;
    return qty * prc;
  }, [quantity, price, currentPrice]);

  // 퍼센티지 변경 처리
  const handlePercentageChange = (value: number) => {
    setPercentage(value);

    if (orderSide === 'BUY') {
      const priceToUse = orderType === 'MARKET' ? currentPrice : parseFloat(price) || currentPrice;
      const maxQuantity = availableBalance / priceToUse;
      const newQuantity = (maxQuantity * value) / 100;
      setQuantity(newQuantity.toFixed(6));
    } else {
      const newQuantity = (availableBalance * value) / 100;
      setQuantity(newQuantity.toFixed(6));
    }
  };

  // 가격 조정
  const adjustPrice = (direction: 'up' | 'down') => {
    const currentPriceNum = parseFloat(price) || currentPrice;
    const adjustment = currentPriceNum * 0.001; // 0.1%
    const newPrice = direction === 'up'
      ? currentPriceNum + adjustment
      : currentPriceNum - adjustment;
    setPrice(newPrice.toFixed(2));
  };

  // 주문 제출
  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) return;
    if (orderType === 'LIMIT' && (!price || parseFloat(price) <= 0)) return;
    if (orderType === 'STOP_LIMIT' && (!stopPrice || parseFloat(stopPrice) <= 0)) return;

    setIsPlacingOrder(true);
    try {
      await placeOrder(
        symbol,
        orderSide,
        orderType === 'STOP_LIMIT' ? 'LIMIT' : orderType,
        quantity,
        orderType === 'MARKET' ? undefined : price,
        orderType === 'STOP_LIMIT' ? stopPrice : undefined
      );

      // 성공 시 폼 초기화
      setQuantity('');
      setPercentage(0);
      fetchBalance();
    } catch (error) {
      console.error('주문 실패:', error);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="h-full bg-[#161a1e] flex flex-col">
      {/* 주문 타입 탭 */}
      <div className="h-10 px-2 flex items-center gap-1 border-b border-[#2b3139]">
        <button
          onClick={() => setOrderType('LIMIT')}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded transition-all",
            orderType === 'LIMIT'
              ? "bg-[#2b3139] text-[#eaecef]"
              : "text-[#848e9c] hover:text-[#eaecef]"
          )}
        >
          지정가
        </button>
        <button
          onClick={() => setOrderType('MARKET')}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded transition-all",
            orderType === 'MARKET'
              ? "bg-[#2b3139] text-[#eaecef]"
              : "text-[#848e9c] hover:text-[#eaecef]"
          )}
        >
          시장가
        </button>
        <button
          onClick={() => setOrderType('STOP_LIMIT')}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded transition-all",
            orderType === 'STOP_LIMIT'
              ? "bg-[#2b3139] text-[#eaecef]"
              : "text-[#848e9c] hover:text-[#eaecef]"
          )}
        >
          스탑리밋
        </button>
        <button className="ml-auto p-1 hover:bg-[#2b3139] rounded">
          <Info className="h-3.5 w-3.5 text-[#5e6673]" />
        </button>
      </div>

      {/* 매수/매도 탭 */}
      <div className="flex p-2 gap-2">
        <button
          onClick={() => setOrderSide('BUY')}
          className={cn(
            "flex-1 py-1.5 text-xs font-medium rounded transition-all",
            orderSide === 'BUY'
              ? "bg-[#0ecb81] text-black"
              : "bg-[#2b3139] text-[#848e9c] hover:text-[#eaecef]"
          )}
        >
          매수
        </button>
        <button
          onClick={() => setOrderSide('SELL')}
          className={cn(
            "flex-1 py-1.5 text-xs font-medium rounded transition-all",
            orderSide === 'SELL'
              ? "bg-[#f6465d] text-white"
              : "bg-[#2b3139] text-[#848e9c] hover:text-[#eaecef]"
          )}
        >
          매도
        </button>
      </div>

      {/* 주문 폼 */}
      <div className="flex-1 px-2 pb-2 space-y-3 overflow-y-auto binance-scrollbar">
        {/* 가용 잔액 */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#848e9c]">가용</span>
          <div className="flex items-center gap-1">
            <span className="text-[#eaecef] font-medium tabular-nums">
              {formatQuantity(availableBalance)}
            </span>
            <span className="text-[#848e9c]">
              {orderSide === 'BUY' ? quoteAsset : baseAsset}
            </span>
          </div>
        </div>

        {/* 스탑 가격 (스탑리밋 전용) */}
        {orderType === 'STOP_LIMIT' && (
          <div className="space-y-1">
            <label className="text-[11px] text-[#848e9c]">스탑 가격</label>
            <div className="relative">
              <input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                placeholder="0.00"
                className="w-full h-8 px-2 pr-12 bg-[#2b3139] border border-[#474d57] rounded text-xs text-[#eaecef]
                         placeholder-[#5e6673] focus:outline-none focus:border-[#fcd535] transition-colors tabular-nums"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#848e9c]">
                {quoteAsset}
              </span>
            </div>
          </div>
        )}

        {/* 가격 입력 (지정가 & 스탑리밋) */}
        {(orderType === 'LIMIT' || orderType === 'STOP_LIMIT') && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-[#848e9c]">가격</label>
              <button
                onClick={() => setPrice(currentPrice.toFixed(2))}
                className="text-[10px] text-[#fcd535] hover:text-[#fcd535]/80 transition-colors"
              >
                시장가격
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full h-8 px-2 pr-20 bg-[#2b3139] border border-[#474d57] rounded text-xs text-[#eaecef]
                         placeholder-[#5e6673] focus:outline-none focus:border-[#fcd535] transition-colors tabular-nums"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <button
                  onClick={() => adjustPrice('down')}
                  className="p-1 hover:bg-[#474d57] rounded"
                >
                  <Minus className="h-3 w-3 text-[#848e9c]" />
                </button>
                <button
                  onClick={() => adjustPrice('up')}
                  className="p-1 hover:bg-[#474d57] rounded"
                >
                  <Plus className="h-3 w-3 text-[#848e9c]" />
                </button>
                <span className="text-[11px] text-[#848e9c] ml-1">
                  {quoteAsset}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 수량 입력 */}
        <div className="space-y-1">
          <label className="text-[11px] text-[#848e9c]">수량</label>
          <div className="relative">
            <input
              type="number"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                // 퍼센티지 업데이트
                const qty = parseFloat(e.target.value) || 0;
                if (orderSide === 'BUY') {
                  const priceToUse = orderType === 'MARKET' ? currentPrice : parseFloat(price) || currentPrice;
                  const maxQuantity = availableBalance / priceToUse;
                  setPercentage(Math.min((qty / maxQuantity) * 100, 100));
                } else {
                  setPercentage(Math.min((qty / availableBalance) * 100, 100));
                }
              }}
              placeholder="0.00"
              className="w-full h-8 px-2 pr-12 bg-[#2b3139] border border-[#474d57] rounded text-xs text-[#eaecef]
                       placeholder-[#5e6673] focus:outline-none focus:border-[#fcd535] transition-colors tabular-nums"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#848e9c]">
              {baseAsset}
            </span>
          </div>
        </div>

        {/* 퍼센티지 슬라이더 */}
        <div className="space-y-2">
          <div className="relative h-1 bg-[#2b3139] rounded-full">
            <div
              className={cn(
                "absolute h-full rounded-full transition-all",
                orderSide === 'BUY' ? "bg-[#0ecb81]" : "bg-[#f6465d]"
              )}
              style={{ width: `${percentage}%` }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={percentage}
              onChange={(e) => handlePercentageChange(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className={cn(
                "absolute w-3 h-3 rounded-full -top-1 transform -translate-x-1/2",
                orderSide === 'BUY' ? "bg-[#0ecb81]" : "bg-[#f6465d]"
              )}
              style={{ left: `${percentage}%` }}
            />
          </div>

          {/* 퍼센티지 버튼 */}
          <div className="flex gap-1">
            {[25, 50, 75, 100].map(pct => (
              <button
                key={pct}
                onClick={() => handlePercentageChange(pct)}
                className={cn(
                  "flex-1 py-1 text-[10px] font-medium rounded transition-all",
                  percentage === pct
                    ? orderSide === 'BUY'
                      ? "bg-[#0ecb81]/20 text-[#0ecb81]"
                      : "bg-[#f6465d]/20 text-[#f6465d]"
                    : "bg-[#2b3139] text-[#848e9c] hover:text-[#eaecef]"
                )}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* 총액 표시 */}
        <div className="pt-2 space-y-2 border-t border-[#2b3139]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#848e9c]">총액</span>
            <div className="flex items-center gap-1">
              <span className="text-[#eaecef] font-medium tabular-nums">
                {formatPrice(total)}
              </span>
              <span className="text-[#848e9c]">{quoteAsset}</span>
            </div>
          </div>

          {/* 주문 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={isPlacingOrder || !quantity || (orderType === 'LIMIT' && !price)}
            className={cn(
              "w-full py-2 text-sm font-medium rounded transition-all",
              orderSide === 'BUY'
                ? "bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-black"
                : "bg-[#f6465d] hover:bg-[#f6465d]/90 text-white",
              (isPlacingOrder || !quantity || (orderType === 'LIMIT' && !price)) &&
              "opacity-50 cursor-not-allowed"
            )}
          >
            {isPlacingOrder ? (
              <span className="flex items-center justify-center gap-1">
                <span className="animate-pulse">처리 중...</span>
              </span>
            ) : (
              <span>
                {orderSide === 'BUY' ? '매수' : '매도'} {baseAsset}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="px-2 py-1 border-t border-[#2b3139]">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-1 text-[10px] text-[#848e9c] hover:text-[#eaecef]">
            <Lock className="h-3 w-3" />
            <span>주문 규칙</span>
          </button>
          <span className="text-[10px] text-[#5e6673]">
            수수료: 0.1%
          </span>
        </div>
      </div>
    </div>
  );
});