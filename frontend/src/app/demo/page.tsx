'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Bot, 
  Brain, 
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
  Bell,
  Zap,
  Shield,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Target,
  Sparkles,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// 코인 종류
const COINS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX'];

// 가짜 차트 데이터 생성 함수
function generateChartData(points: number = 50) {
  const data = [];
  let basePrice = 45000 + Math.random() * 5000;
  
  for (let i = 0; i < points; i++) {
    basePrice += (Math.random() - 0.5) * 500;
    data.push({
      time: new Date(Date.now() - (points - i) * 60000).toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      price: Math.max(40000, basePrice),
      volume: Math.random() * 1000000,
    });
  }
  return data;
}

// 실시간 거래 생성 함수
function generateTrade() {
  const coin = COINS[Math.floor(Math.random() * COINS.length)];
  const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
  const price = coin === 'BTC' ? 45000 + Math.random() * 5000 : 
                coin === 'ETH' ? 2500 + Math.random() * 500 :
                Math.random() * 1000;
  const quantity = Math.random() * 10;
  const pnl = (Math.random() - 0.4) * 1000;
  
  return {
    id: Date.now() + Math.random(),
    coin,
    side,
    price: price.toFixed(2),
    quantity: quantity.toFixed(4),
    pnl: pnl.toFixed(2),
    time: new Date().toLocaleTimeString('ko-KR'),
  };
}

// AI 분석 메시지 생성
function generateAIMessage() {
  const messages = [
    { type: 'success', text: 'BTC 상승 추세 감지 - 매수 신호 포착', icon: TrendingUp },
    { type: 'warning', text: 'ETH RSI 70 초과 - 과매수 구간 진입', icon: AlertCircle },
    { type: 'info', text: 'SOL 볼린저 밴드 하단 터치 - 반등 가능성', icon: Info },
    { type: 'success', text: 'ADA 골든크로스 형성 - 상승 전환 신호', icon: CheckCircle },
    { type: 'danger', text: 'XRP 거래량 급감 - 변동성 주의', icon: TrendingDown },
    { type: 'info', text: 'BNB 삼각수렴 패턴 완성 임박', icon: BarChart3 },
    { type: 'success', text: 'DOGE 지지선 방어 성공 - 추가 상승 기대', icon: Shield },
    { type: 'warning', text: 'AVAX 저항선 접근 - 단기 조정 가능', icon: AlertCircle },
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
}

// 미니 차트 컴포넌트
function MiniChart({ data, color }: { data: number[], color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  return (
    <svg className="w-full h-12" viewBox="0 0 100 40">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={data.map((value, i) => 
          `${(i / (data.length - 1)) * 100},${35 - ((value - min) / range) * 30}`
        ).join(' ')}
      />
      <polyline
        fill={color}
        fillOpacity="0.1"
        points={`0,40 ${data.map((value, i) => 
          `${(i / (data.length - 1)) * 100},${35 - ((value - min) / range) * 30}`
        ).join(' ')} 100,40`}
      />
    </svg>
  );
}

// 포트폴리오 아이템
function PortfolioItem({ coin, holding, value, pnl, pnlPercent }: any) {
  const isProfit = pnl >= 0;
  
  return (
    <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-xs font-bold">{coin}</span>
        </div>
        <div>
          <p className="font-medium">{coin}USDT</p>
          <p className="text-xs text-muted-foreground">{holding} {coin}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium">${value}</p>
        <p className={cn(
          "text-xs flex items-center justify-end gap-1",
          isProfit ? "text-green-500" : "text-red-500"
        )}>
          {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {isProfit ? '+' : ''}{pnl} ({pnlPercent}%)
        </p>
      </div>
    </div>
  );
}

export default function LiveDemoPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [aiMessages, setAiMessages] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState(45234.56);
  const [priceChange, setPriceChange] = useState(2.34);
  const [botStatus, setBotStatus] = useState('running');
  const [totalPnL, setTotalPnL] = useState(12543.67);
  const [winRate, setWinRate] = useState(68);
  const [activePositions, setActivePositions] = useState(7);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  // 실시간 데이터 업데이트
  useEffect(() => {
    // 클라이언트에서만 실행
    setIsClient(true);
    
    // 초기 데이터 생성
    setChartData(generateChartData());
    setTrades(Array.from({ length: 5 }, generateTrade));
    setAiMessages([generateAIMessage()]);

    // 실시간 업데이트
    intervalRef.current = setInterval(() => {
      // 새로운 거래 추가
      if (Math.random() > 0.3) {
        const newTrade = generateTrade();
        setTrades(prev => [newTrade, ...prev].slice(0, 10));
        
        // 거래 알림 추가
        if (Math.random() > 0.5) {
          setNotifications(prev => [{
            id: Date.now(),
            text: `${newTrade.coin} ${newTrade.side === 'BUY' ? '매수' : '매도'} 체결 - $${newTrade.price}`,
            type: newTrade.pnl > 0 ? 'success' : 'warning',
            time: new Date().toLocaleTimeString('ko-KR'),
          }, ...prev].slice(0, 5));
        }
      }

      // AI 메시지 업데이트
      if (Math.random() > 0.7) {
        const newMessage = generateAIMessage();
        setAiMessages(prev => [{ ...newMessage, id: Date.now() }, ...prev].slice(0, 5));
      }

      // 가격 업데이트
      setCurrentPrice(prev => {
        const change = (Math.random() - 0.5) * 100;
        return Math.max(40000, prev + change);
      });
      setPriceChange((Math.random() - 0.4) * 5);

      // 차트 데이터 업데이트
      setChartData(prev => {
        const newData = [...prev.slice(1)];
        const lastPrice = prev[prev.length - 1].price;
        newData.push({
          time: new Date().toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          price: lastPrice + (Math.random() - 0.5) * 500,
          volume: Math.random() * 1000000,
        });
        return newData;
      });

      // PnL 업데이트
      setTotalPnL(prev => prev + (Math.random() - 0.45) * 100);
      setWinRate(prev => Math.min(100, Math.max(0, prev + (Math.random() - 0.5) * 2)));
      setActivePositions(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
    }, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // 봇 상태 토글
  const toggleBot = () => {
    setBotStatus(prev => prev === 'running' ? 'paused' : 'running');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <span className="font-bold text-xl">CryptoTradeManager</span>
              </Link>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                <Sparkles className="h-3 w-3 mr-1" />
                라이브 데모
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Activity className="h-3 w-3 text-green-500" />
                실시간 연결됨
              </Badge>
              <Link href="/register">
                <Button size="sm" className="hidden sm:inline-flex">
                  무료로 시작하기
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 대시보드 */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* 상단 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 수익</p>
                <p className={cn(
                  "text-2xl font-bold",
                  totalPnL >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  ${totalPnL.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  오늘 +$543.21 (4.5%)
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">승률</p>
                <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
                <Progress value={winRate} className="mt-2 h-1" />
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">진행중 포지션</p>
                <p className="text-2xl font-bold">{activePositions}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  매수 {Math.floor(activePositions * 0.6)} / 매도 {Math.ceil(activePositions * 0.4)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">자동매매 봇</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={botStatus === 'running' ? 'default' : 'secondary'}
                    className="gap-1"
                  >
                    {botStatus === 'running' ? (
                      <>
                        <Activity className="h-3 w-3" />
                        실행중
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3" />
                        일시정지
                      </>
                    )}
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0"
                    onClick={toggleBot}
                  >
                    {botStatus === 'running' ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  24H 거래: 143건
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 왼쪽 영역 - 차트와 거래 */}
          <div className="xl:col-span-2 space-y-6">
            {/* 실시간 차트 */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="font-semibold text-lg">BTC/USDT</h3>
                  <Badge variant="outline">실시간</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost">1분</Button>
                  <Button size="sm" variant="default">5분</Button>
                  <Button size="sm" variant="ghost">15분</Button>
                  <Button size="sm" variant="ghost">1시간</Button>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold">${currentPrice.toFixed(2)}</span>
                  <Badge 
                    variant={priceChange >= 0 ? "default" : "destructive"}
                    className="gap-1"
                  >
                    {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  24H 거래량: ${isClient ? (Math.random() * 100000000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "45,000,000"}
                </p>
              </div>

              {/* 간단한 차트 시뮬레이션 */}
              <div className="h-64 bg-muted/30 rounded-lg p-4">
                {isClient && chartData.length > 0 && (
                  <MiniChart 
                    data={chartData.map(d => d.price)} 
                    color={priceChange >= 0 ? "#10b981" : "#ef4444"}
                  />
                )}
                <div className="grid grid-cols-4 gap-2 mt-4 text-xs">
                  <div>
                    <p className="text-muted-foreground">시가</p>
                    <p className="font-medium">$44,123</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">고가</p>
                    <p className="font-medium text-green-500">$46,789</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">저가</p>
                    <p className="font-medium text-red-500">$43,456</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">종가</p>
                    <p className="font-medium">${currentPrice.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* 실시간 거래 내역 */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">실시간 거래</h3>
                <Badge variant="outline" className="gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  자동 업데이트
                </Badge>
              </div>
              
              <div className="space-y-2">
                {trades.map((trade) => (
                  <div 
                    key={trade.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all animate-in slide-in-from-top duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={trade.side === 'BUY' ? 'default' : 'destructive'}
                        className="w-12"
                      >
                        {trade.side === 'BUY' ? '매수' : '매도'}
                      </Badge>
                      <div>
                        <p className="font-medium">{trade.coin}/USDT</p>
                        <p className="text-xs text-muted-foreground">
                          {trade.quantity} {trade.coin} @ ${trade.price}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-medium",
                        parseFloat(trade.pnl) >= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {parseFloat(trade.pnl) >= 0 ? '+' : ''}${trade.pnl}
                      </p>
                      <p className="text-xs text-muted-foreground">{trade.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* 오른쪽 영역 - AI 분석과 포트폴리오 */}
          <div className="space-y-6">
            {/* AI 실시간 분석 */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  AI 실시간 분석
                </h3>
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3" />
                  실시간
                </Badge>
              </div>
              
              <div className="space-y-3">
                {aiMessages.map((message, index) => {
                  const Icon = message.icon;
                  return (
                    <div 
                      key={message.id || index}
                      className="p-3 rounded-lg bg-muted/30 animate-in slide-in-from-right duration-300"
                    >
                      <div className="flex items-start gap-2">
                        <Icon className={cn(
                          "h-4 w-4 mt-0.5",
                          message.type === 'success' && "text-green-500",
                          message.type === 'warning' && "text-yellow-500",
                          message.type === 'danger' && "text-red-500",
                          message.type === 'info' && "text-blue-500"
                        )} />
                        <div className="flex-1">
                          <p className="text-sm">{message.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            방금 전
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* 포트폴리오 현황 */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">포트폴리오</h3>
                <Button size="sm" variant="ghost">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-1">
                <PortfolioItem 
                  coin="BTC"
                  holding="0.543"
                  value="24,543.21"
                  pnl="2,134.56"
                  pnlPercent="9.5"
                />
                <PortfolioItem 
                  coin="ETH"
                  holding="5.234"
                  value="13,085.00"
                  pnl="1,085.00"
                  pnlPercent="9.0"
                />
                <PortfolioItem 
                  coin="BNB"
                  holding="12.5"
                  value="3,906.25"
                  pnl="-156.25"
                  pnlPercent="-3.8"
                />
                <PortfolioItem 
                  coin="SOL"
                  holding="45.8"
                  value="4,512.30"
                  pnl="512.30"
                  pnlPercent="12.8"
                />
                <PortfolioItem 
                  coin="ADA"
                  holding="2500"
                  value="1,250.00"
                  pnl="125.00"
                  pnlPercent="11.1"
                />
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">총 자산</p>
                  <p className="font-bold text-lg">$47,296.76</p>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-muted-foreground">총 수익률</p>
                  <p className="font-medium text-green-500">+8.7%</p>
                </div>
              </div>
            </Card>

            {/* 실시간 알림 */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  실시간 알림
                </h3>
                <Badge variant="secondary">{notifications.length}</Badge>
              </div>
              
              <div className="space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    새로운 알림이 없습니다
                  </p>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className="p-2 rounded-lg bg-muted/30 text-sm animate-in slide-in-from-top duration-300"
                    >
                      <p className="text-xs text-muted-foreground">{notif.time}</p>
                      <p className="mt-1">{notif.text}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* CTA 섹션 */}
        <Card className="p-8 bg-gradient-to-r from-primary/10 via-purple-600/10 to-pink-600/10 border-primary/20">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">이 모든 기능을 무료로 시작하세요</h2>
            <p className="text-muted-foreground mb-6">
              실제 Binance 계정과 연동하여 실시간 거래를 시작하세요
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  지금 시작하기
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline">
                  더 알아보기
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}