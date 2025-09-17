'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ProfessionalOrderBook } from '@/components/trading/professional-orderbook';
import { ProfessionalOrderForm } from '@/components/trading/professional-order-form';
import { TradingViewAdvancedChart } from '@/components/trading/tradingview-advanced-chart';
import { MarketHeader } from '@/components/trading/market-header';
import { MarketList } from '@/components/trading/market-list';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, History, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useTicker } from '@/hooks/use-ticker';
import { useOrders } from '@/hooks/use-orders';
import { useTrades } from '@/hooks/use-trades';

// 레이아웃 토글 버튼 컴포넌트 분리
function LayoutToggleButtons({
  showOrderBook,
  showOrderForm,
  onToggleOrderBook,
  onToggleOrderForm,
}: {
  showOrderBook: boolean;
  showOrderForm: boolean;
  onToggleOrderBook: () => void;
  onToggleOrderForm: () => void;
}) {
  return (
    <div className="flex gap-1 lg:hidden absolute top-2 right-2 z-10">
      <Button
        size="sm"
        variant={showOrderBook ? "secondary" : "outline"}
        onClick={onToggleOrderBook}
        className="text-xs h-7"
      >
        호가창
      </Button>
      <Button
        size="sm"
        variant={showOrderForm ? "secondary" : "outline"}
        onClick={onToggleOrderForm}
        className="text-xs h-7"
      >
        주문
      </Button>
    </div>
  );
}

// 주문/거래 내역 탭 컴포넌트 분리
function TradingHistoryTabs({ symbol }: { symbol: string }) {
  const { openOrders, orderHistory, fetchOpenOrders, fetchOrderHistory } = useOrders();
  const { trades, loading: tradesLoading, refresh: refreshTrades } = useTrades();
  const [isLoading, setIsLoading] = useState(true);

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchOpenOrders(symbol),
          fetchOrderHistory()
        ]);
        // useTrades hook automatically loads on mount, so we just need to refresh if symbol changes
        refreshTrades();
      } catch (error) {
        console.error('Failed to fetch trading history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  // 날짜 포맷터
  const formatDate = (timestamp: number | string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 가격 포맷터
  const formatPrice = (price: number | string) => {
    return Number(price).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  return (
    <div className="flex-shrink-0 border-t border-[#2a2a2a] h-[120px] bg-[#0d0d0d]">
      <Card className="bg-background/50 backdrop-blur border-0 rounded-none p-0 h-full">
        <Tabs defaultValue="orders" className="w-full h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none bg-transparent border-b border-border/50 h-9 p-0 flex-shrink-0">
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3"
            >
              <List className="h-3 w-3 mr-1" />
              <span className="text-xs">미체결 ({openOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3"
            >
              <History className="h-3 w-3 mr-1" />
              <span className="text-xs">주문내역 ({orderHistory.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="trades"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3"
            >
              <Clock className="h-3 w-3 mr-1" />
              <span className="text-xs">거래내역 ({trades.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-0 p-2 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground text-xs">
                  로딩중...
                </div>
              ) : openOrders.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-xs">
                  미체결 주문이 없습니다
                </div>
              ) : (
                <div className="space-y-1">
                  {openOrders.map((order) => (
                    <div key={order.orderId} className="p-1.5 border-b border-[#2a2a2a] text-xs">
                      <div className="flex justify-between">
                        <span className={order.side === 'BUY' ? 'text-green-500' : 'text-red-500'}>
                          {order.side === 'BUY' ? '매수' : '매도'}
                        </span>
                        <span>{order.symbol}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>수량: {formatPrice(order.origQty)}</span>
                        <span>가격: {formatPrice(order.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-0 p-2 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground text-xs">
                  로딩중...
                </div>
              ) : orderHistory.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-xs">
                  주문 내역이 없습니다
                </div>
              ) : (
                <div className="space-y-1">
                  {orderHistory.map((order) => (
                    <div key={order.orderId} className="p-1.5 border-b border-[#2a2a2a] text-xs">
                      <div className="flex justify-between">
                        <span className={order.side === 'BUY' ? 'text-green-500' : 'text-red-500'}>
                          {order.side === 'BUY' ? '매수' : '매도'}
                        </span>
                        <span>{order.symbol}</span>
                        <span className="text-muted-foreground">{order.status}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>수량: {formatPrice(order.origQty)}</span>
                        <span>가격: {formatPrice(order.price)}</span>
                        <span>{formatDate(order.time)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="trades" className="mt-0 p-2 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground text-xs">
                  로딩중...
                </div>
              ) : trades.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-xs">
                  거래 내역이 없습니다
                </div>
              ) : (
                <div className="space-y-1">
                  {trades.map((trade) => (
                    <div key={trade.id} className="p-1.5 border-b border-[#2a2a2a] text-xs">
                      <div className="flex justify-between">
                        <span className={trade.side === 'BUY' ? 'text-green-500' : 'text-red-500'}>
                          {trade.side === 'BUY' ? '매수' : '매도'}
                        </span>
                        <span>{trade.symbol}</span>
                        <span className={trade.pnlPercent && trade.pnlPercent > 0 ? 'text-green-500' : 'text-red-500'}>
                          {trade.pnlPercent ? `${trade.pnlPercent > 0 ? '+' : ''}${trade.pnlPercent.toFixed(2)}%` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>진입: {formatPrice(trade.entryPrice)}</span>
                        {trade.exitPrice && <span>종료: {formatPrice(trade.exitPrice)}</span>}
                        <span>{formatDate(trade.entryTime)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

// 메인 페이지 컴포넌트 - 훨씬 더 깔끔해짐
export default function TradingSymbolPage() {
  const params = useParams();
  const symbol = params.symbol as string;

  // 커스텀 훅으로 복잡한 로직 분리
  const {
    showMarketList,
    showOrderBook,
    showOrderForm,
    isCompactMode,
    toggleMarketList,
    toggleOrderBook,
    toggleOrderForm,
  } = useResponsiveLayout();

  const { ticker, currentPrice } = useTicker(symbol);

  // 차트 높이 계산 - 상수로 분리
  const HEADER_HEIGHT = 280;
  const MIN_CHART_HEIGHT = 500;
  const chartHeight = typeof window !== 'undefined'
    ? Math.max(window.innerHeight - HEADER_HEIGHT, MIN_CHART_HEIGHT)
    : MIN_CHART_HEIGHT;

  return (
    <div className="h-screen bg-[#0d0d0d] flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측: 마켓 리스트 */}
        <MarketList
          isCollapsed={!showMarketList}
          onToggleCollapse={toggleMarketList}
        />

        {/* 오른쪽: 트레이딩 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 마켓 헤더 */}
          <div className="flex-shrink-0">
            <MarketHeader symbol={symbol} ticker={ticker} />
          </div>

          {/* 트레이딩 레이아웃 */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 flex gap-0.5 min-h-0">
              {/* 왼쪽: 호가창 */}
              {showOrderBook && (
                <div className={cn(
                  "flex-shrink-0 transition-all duration-300 bg-[#161616]",
                  isCompactMode ? "w-[280px]" : "w-[320px]",
                  !showOrderForm && "lg:block hidden"
                )}>
                  <div className="h-full overflow-y-auto">
                    <ProfessionalOrderBook symbol={symbol} limit={25} />
                  </div>
                </div>
              )}

              {/* 중앙: 차트 */}
              <div className="flex-1 min-w-0 relative bg-[#0d0d0d]">
                <LayoutToggleButtons
                  showOrderBook={showOrderBook}
                  showOrderForm={showOrderForm}
                  onToggleOrderBook={toggleOrderBook}
                  onToggleOrderForm={toggleOrderForm}
                />
                <div className="h-full">
                  <TradingViewAdvancedChart
                    symbol={symbol}
                    theme="dark"
                    height={chartHeight}
                    interval="60"
                  />
                </div>
              </div>

              {/* 오른쪽: 주문 폼 */}
              {showOrderForm && (
                <div className={cn(
                  "flex-shrink-0 transition-all duration-300 bg-[#161616]",
                  isCompactMode ? "w-[280px]" : "w-[320px]",
                  !showOrderBook && "lg:block hidden"
                )}>
                  <div className="h-full">
                    <ProfessionalOrderForm
                      symbol={symbol}
                      currentPrice={currentPrice}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 하단: 주문 및 거래 내역 */}
            <TradingHistoryTabs symbol={symbol} />
          </div>
        </div>
      </div>
    </div>
  );
}