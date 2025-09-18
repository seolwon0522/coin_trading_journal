'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { BinanceOrderBook } from '@/components/trading/binance-orderbook';
import { BinanceOrderForm } from '@/components/trading/binance-order-form';
import { BinanceMarketHeader } from '@/components/trading/binance-market-header';
import { BinanceMarketList } from '@/components/trading/binance-market-list';
import { TradingViewAdvancedChart } from '@/components/trading/tradingview-advanced-chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  List,
  History,
  Clock,
  Menu,
  X,
  Maximize2,
  Settings,
  Grid3x3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTicker } from '@/hooks/use-ticker';
import { useOrders } from '@/hooks/use-orders';
import { useTrades } from '@/hooks/use-trades';

// 거래 내역 탭 컴포넌트
const BinanceTradingHistory = memo(function BinanceTradingHistory({ symbol }: { symbol: string }) {
  const { openOrders, orderHistory, fetchOpenOrders, fetchOrderHistory } = useOrders();
  const { trades, loading: tradesLoading, refresh: refreshTrades } = useTrades();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchOpenOrders(symbol),
          fetchOrderHistory()
        ]);
        refreshTrades();
      } catch (error) {
        console.error('Failed to fetch trading history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  const formatDate = (timestamp: number | string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number | string) => {
    return Number(price).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  return (
    <div className="h-full bg-[#161a1e] flex flex-col">
      {/* 탭 헤더 */}
      <div className="h-9 px-2 flex items-center gap-1 border-b border-[#2b3139]">
        <button
          onClick={() => setActiveTab('orders')}
          className={cn(
            "px-3 py-1 text-xs font-medium transition-all",
            activeTab === 'orders'
              ? "text-[#fcd535] border-b-2 border-[#fcd535]"
              : "text-[#848e9c] hover:text-[#eaecef]"
          )}
        >
          미체결 ({openOrders?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-3 py-1 text-xs font-medium transition-all",
            activeTab === 'history'
              ? "text-[#fcd535] border-b-2 border-[#fcd535]"
              : "text-[#848e9c] hover:text-[#eaecef]"
          )}
        >
          주문내역
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={cn(
            "px-3 py-1 text-xs font-medium transition-all",
            activeTab === 'trades'
              ? "text-[#fcd535] border-b-2 border-[#fcd535]"
              : "text-[#848e9c] hover:text-[#eaecef]"
          )}
        >
          거래내역
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="flex-1 overflow-y-auto binance-scrollbar p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="animate-pulse text-[#5e6673] text-xs">로딩 중...</div>
          </div>
        ) : (
          <>
            {/* 미체결 주문 */}
            {activeTab === 'orders' && (
              <div className="space-y-1">
                {!openOrders || openOrders.length === 0 ? (
                  <div className="text-center py-6 text-[#5e6673] text-xs">
                    미체결 주문이 없습니다
                  </div>
                ) : (
                  openOrders.map((order) => (
                    <div key={order.orderId} className="p-2 bg-[#1e2024] rounded hover:bg-[#252930] transition-colors">
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "text-xs font-medium",
                          order.side === 'BUY' ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                        )}>
                          {order.side === 'BUY' ? '매수' : '매도'} {order.symbol}
                        </span>
                        <button className="text-[10px] text-[#f6465d] hover:text-[#f6465d]/80">
                          취소
                        </button>
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-[#848e9c]">
                        <span>수량: {formatPrice(order.origQty)}</span>
                        <span>가격: {formatPrice(order.price)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 주문 내역 */}
            {activeTab === 'history' && (
              <div className="space-y-1">
                {!orderHistory || orderHistory.length === 0 ? (
                  <div className="text-center py-6 text-[#5e6673] text-xs">
                    주문 내역이 없습니다
                  </div>
                ) : (
                  orderHistory.slice(0, 10).map((order) => (
                    <div key={order.orderId} className="p-2 bg-[#1e2024] rounded hover:bg-[#252930] transition-colors">
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "text-xs font-medium",
                          order.side === 'BUY' ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                        )}>
                          {order.side === 'BUY' ? '매수' : '매도'} {order.symbol}
                        </span>
                        <span className={cn(
                          "text-[10px] px-1 py-0.5 rounded",
                          order.status === 'FILLED'
                            ? 'bg-[#0ecb81]/15 text-[#0ecb81]'
                            : 'bg-[#848e9c]/15 text-[#848e9c]'
                        )}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-[#848e9c]">
                        <span>{formatDate(order.time)}</span>
                        <span>가격: {formatPrice(order.price)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 거래 내역 */}
            {activeTab === 'trades' && (
              <div className="space-y-1">
                {!trades || trades.length === 0 ? (
                  <div className="text-center py-6 text-[#5e6673] text-xs">
                    거래 내역이 없습니다
                  </div>
                ) : (
                  trades.slice(0, 10).map((trade) => (
                    <div key={trade.id} className="p-2 bg-[#1e2024] rounded hover:bg-[#252930] transition-colors">
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "text-xs font-medium",
                          trade.side === 'BUY' ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                        )}>
                          {trade.side === 'BUY' ? '매수' : '매도'} {trade.symbol}
                        </span>
                        {trade.pnlPercent && (
                          <span className={cn(
                            "text-xs font-bold",
                            trade.pnlPercent > 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                          )}>
                            {trade.pnlPercent > 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-[#848e9c]">
                        <span>{formatDate(trade.entryTime)}</span>
                        <span>진입: {formatPrice(trade.entryPrice)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

// 메인 Binance 트레이딩 페이지
export default function BinanceTradingPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params.symbol as string;
  const { ticker, currentPrice } = useTicker(symbol);

  const [showMarketList, setShowMarketList] = useState(true);
  const [chartHeight, setChartHeight] = useState(60); // 차트 높이 비율 (%)
  const [showAdvancedChart, setShowAdvancedChart] = useState(true);

  const handleSelectSymbol = useCallback((newSymbol: string) => {
    router.push(`/trading/${newSymbol}`);
  }, [router]);

  return (
    <div className="h-screen bg-[#0b0e11] flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="h-12 flex-shrink-0 border-b border-[#2b3139]">
        <BinanceMarketHeader
          symbol={symbol}
          ticker={ticker}
          onSymbolChange={handleSelectSymbol}
        />
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽 사이드바 - 마켓 리스트 */}
        {showMarketList && (
          <div className="w-72 bg-[#161a1e] border-r border-[#2b3139] flex flex-col">
            <BinanceMarketList
              onSelectSymbol={handleSelectSymbol}
              selectedSymbol={symbol}
            />
          </div>
        )}

        {/* 중앙 영역 */}
        <div className="flex-1 flex flex-col">
          {/* 상단 - 차트 영역 */}
          <div
            className="bg-[#0b0e11] border-b border-[#2b3139] relative"
            style={{ height: `${chartHeight}%` }}
          >
            {/* 차트 툴바 */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-[#161a1e] border-b border-[#2b3139] flex items-center justify-between px-2 z-10">
              <div className="flex items-center gap-1">
                {!showMarketList && (
                  <button
                    onClick={() => setShowMarketList(true)}
                    className="p-1 hover:bg-[#2b3139] rounded"
                  >
                    <Menu className="h-4 w-4 text-[#5e6673]" />
                  </button>
                )}
                <button
                  onClick={() => setShowMarketList(false)}
                  className={cn(
                    "p-1 hover:bg-[#2b3139] rounded",
                    !showMarketList && "hidden"
                  )}
                >
                  <ChevronLeft className="h-4 w-4 text-[#5e6673]" />
                </button>
                <span className="text-xs text-[#848e9c]">차트</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1 hover:bg-[#2b3139] rounded">
                  <Grid3x3 className="h-4 w-4 text-[#5e6673]" />
                </button>
                <button className="p-1 hover:bg-[#2b3139] rounded">
                  <Settings className="h-4 w-4 text-[#5e6673]" />
                </button>
                <button className="p-1 hover:bg-[#2b3139] rounded">
                  <Maximize2 className="h-4 w-4 text-[#5e6673]" />
                </button>
              </div>
            </div>

            {/* TradingView 차트 */}
            <div className="h-full pt-8">
              {useMemo(() => (
                <TradingViewAdvancedChart
                  symbol={symbol}
                  theme="dark"
                  height={typeof window !== 'undefined' ? (window.innerHeight * chartHeight / 100) - 80 : 400}
                  interval="60"
                />
              ), [symbol, chartHeight])}
            </div>
          </div>

          {/* 하단 - 거래 내역 */}
          <div className="flex-1 bg-[#161a1e]">
            <BinanceTradingHistory symbol={symbol} />
          </div>
        </div>

        {/* 오른쪽 사이드바 */}
        <div className="w-80 bg-[#161a1e] border-l border-[#2b3139] flex flex-col">
          {/* 호가창 */}
          <div className="h-1/2 border-b border-[#2b3139]">
            <BinanceOrderBook symbol={symbol} limit={15} />
          </div>

          {/* 주문 폼 */}
          <div className="h-1/2">
            <BinanceOrderForm
              symbol={symbol}
              currentPrice={currentPrice}
            />
          </div>
        </div>
      </div>
    </div>
  );
}