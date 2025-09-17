'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ProfessionalOrderBook } from '@/components/trading/professional-orderbook';
import { ProfessionalOrderForm } from '@/components/trading/professional-order-form';
import { TradingViewAdvancedChart } from '@/components/trading/tradingview-advanced-chart';
import { MarketHeader } from '@/components/trading/market-header';
import { MarketList } from '@/components/trading/market-list';
import { BinanceApi, Ticker24hr } from '@/lib/api/binance-api';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, History, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function TradingSymbolPage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const [ticker, setTicker] = useState<Ticker24hr | null>(null);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [showOrderBook, setShowOrderBook] = useState(true);
  const [showOrderForm, setShowOrderForm] = useState(true);
  const [showMarketList, setShowMarketList] = useState(true);
  const api = new BinanceApi();

  // 티커 데이터 페치
  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const tickerData = await api.get24hrTicker(symbol);
        setTicker(tickerData);
      } catch (error) {
        console.error('Failed to fetch ticker:', error);
      }
    };

    if (symbol) {
      fetchTicker();
      const interval = setInterval(fetchTicker, 3000);
      return () => clearInterval(interval);
    }
  }, [symbol]);

  // 화면 크기에 따른 반응형 처리
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) { // 모바일
        setShowMarketList(false);
        setShowOrderBook(false);
        setShowOrderForm(false);
        setIsCompactMode(true);
      } else if (width < 1280) { // 태블릿
        setShowMarketList(false);
        setShowOrderBook(true);
        setShowOrderForm(false);
        setIsCompactMode(true);
      } else if (width < 1920) { // 랩톱
        setShowMarketList(true);
        setShowOrderBook(true);
        setShowOrderForm(true);
        setIsCompactMode(true);
      } else { // 데스크톱
        setShowMarketList(true);
        setShowOrderBook(true);
        setShowOrderForm(true);
        setIsCompactMode(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentPrice = ticker ? parseFloat(ticker.lastPrice) : 0;

  // 레이아웃 토글 버튼 (태블릿용)
  const LayoutToggle = () => (
    <div className="flex gap-1 lg:hidden absolute top-2 right-2 z-10">
      <Button
        size="sm"
        variant={showOrderBook ? "secondary" : "outline"}
        onClick={() => {
          setShowOrderBook(!showOrderBook);
          if (!showOrderBook) setShowOrderForm(false);
        }}
        className="text-xs h-7"
      >
        호가창
      </Button>
      <Button
        size="sm"
        variant={showOrderForm ? "secondary" : "outline"}
        onClick={() => {
          setShowOrderForm(!showOrderForm);
          if (!showOrderForm) setShowOrderBook(false);
        }}
        className="text-xs h-7"
      >
        주문
      </Button>
    </div>
  );

  return (
    <div className="h-screen bg-[#0d0d0d] flex flex-col overflow-hidden">
      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측: 마켓 리스트 */}
        <MarketList
          isCollapsed={!showMarketList}
          onToggleCollapse={() => setShowMarketList(!showMarketList)}
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
                <LayoutToggle />
                <div className="h-full">
                  <TradingViewAdvancedChart
                    symbol={symbol}
                    theme="dark"
                    height={typeof window !== 'undefined' ? Math.max(window.innerHeight - 280, 500) : 500}
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
            <div className="flex-shrink-0 border-t border-[#2a2a2a] h-[120px] bg-[#0d0d0d]">
              <Card className="bg-background/50 backdrop-blur border-0 rounded-none p-0 h-full">
                <Tabs defaultValue="orders" className="w-full h-full flex flex-col">
                  <TabsList className="w-full justify-start rounded-none bg-transparent border-b border-border/50 h-9 p-0 flex-shrink-0">
                    <TabsTrigger
                      value="orders"
                      className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3"
                    >
                      <List className="h-3 w-3 mr-1" />
                      <span className="text-xs">미체결</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="history"
                      className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3"
                    >
                      <History className="h-3 w-3 mr-1" />
                      <span className="text-xs">주문내역</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="trades"
                      className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      <span className="text-xs">거래내역</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="orders" className="mt-0 p-2 flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto">
                      <div className="text-center py-4 text-muted-foreground text-xs">
                        미체결 주문이 없습니다
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="mt-0 p-2 flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto">
                      <div className="text-center py-4 text-muted-foreground text-xs">
                        주문 내역이 없습니다
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="trades" className="mt-0 p-2 flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto">
                      <div className="text-center py-4 text-muted-foreground text-xs">
                        거래 내역이 없습니다
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}