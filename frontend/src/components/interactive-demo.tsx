'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Brain,
  Bot,
  FileText,
  Smartphone,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Shield,
  Zap,
  DollarSign,
  BarChart3,
  LineChart,
  Layers,
  Database,
  Globe,
  Cpu,
  Timer,
  Bell,
  Lock,
  ArrowUp,
  ArrowDown,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Target,
  ChevronRight,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
} from 'lucide-react';

// 실시간 가격 데이터 시뮬레이션
const generatePriceData = (basePrice: number, volatility: number = 0.02) => {
  const change = (Math.random() - 0.5) * 2 * volatility;
  return basePrice * (1 + change);
};

// 거래 데이터 생성
const generateTrade = () => {
  const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA'];
  const types = ['BUY', 'SELL'];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const type = types[Math.floor(Math.random() * types.length)];
  const price = Math.random() * 10000 + 1000;
  const amount = Math.random() * 2;
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    symbol,
    type,
    price: price.toFixed(2),
    amount: amount.toFixed(4),
    time: new Date().toLocaleTimeString(),
    profit: (Math.random() - 0.5) * 100,
  };
};

// 데이터 수집 데모 컴포넌트
function DataCollectionDemo() {
  const [isRunning, setIsRunning] = useState(true);
  const [trades, setTrades] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalVolume: 0,
    avgLatency: 48,
    activeConnections: 5,
    dataPoints: 0,
  });

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // 새 거래 추가
      setTrades(prev => {
        const newTrade = generateTrade();
        return [newTrade, ...prev.slice(0, 4)];
      });

      // 통계 업데이트
      setStats(prev => ({
        ...prev,
        totalVolume: prev.totalVolume + Math.random() * 1000,
        avgLatency: Math.floor(Math.random() * 20 + 40),
        dataPoints: prev.dataPoints + 1,
      }));
    }, 1500);

    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          <span className="font-semibold">실시간 데이터 수집</span>
          <Badge variant="outline" className="animate-pulse">
            <span className="h-2 w-2 bg-green-500 rounded-full mr-1"></span>
            LIVE
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
          <p className="text-xs text-muted-foreground">지연시간</p>
          <p className="text-lg font-bold">{stats.avgLatency}ms</p>
          <div className="flex items-center gap-1 mt-1">
            <Zap className="h-3 w-3 text-yellow-500" />
            <span className="text-xs text-green-500">초고속</span>
          </div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
          <p className="text-xs text-muted-foreground">연결 거래소</p>
          <p className="text-lg font-bold">{stats.activeConnections}개</p>
          <div className="flex items-center gap-1 mt-1">
            <Globe className="h-3 w-3 text-blue-500" />
            <span className="text-xs text-muted-foreground">실시간</span>
          </div>
        </Card>
      </div>

      {/* 거래 피드 */}
      <div className="flex-1 space-y-2 overflow-hidden">
        <p className="text-xs text-muted-foreground font-medium">최근 거래</p>
        <div className="space-y-2">
          {trades.map((trade, idx) => (
            <div
              key={trade.id}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg bg-muted/50 transition-all",
                idx === 0 && "animate-slide-in-right border border-primary/30"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold",
                  trade.type === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                )}>
                  {trade.type === 'BUY' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{trade.symbol}/USDT</p>
                  <p className="text-xs text-muted-foreground">{trade.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">${trade.price}</p>
                <p className={cn(
                  "text-xs",
                  trade.profit > 0 ? 'text-green-500' : 'text-red-500'
                )}>
                  {trade.profit > 0 ? '+' : ''}{trade.profit.toFixed(2)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 푸터 */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {stats.dataPoints.toLocaleString()} 데이터 포인트
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-500" />
          <span className="text-xs text-green-500">보안 연결</span>
        </div>
      </div>
    </div>
  );
}

// AI 분석 데모 컴포넌트
function AIAnalysisDemo() {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [accuracy, setAccuracy] = useState(87);

  const analysisSteps = [
    { name: '데이터 수집', icon: Database, color: 'text-blue-500' },
    { name: '패턴 인식', icon: Brain, color: 'text-purple-500' },
    { name: '예측 모델링', icon: Cpu, color: 'text-pink-500' },
    { name: '결과 생성', icon: BarChart3, color: 'text-green-500' },
  ];

  useEffect(() => {
    if (!isAnalyzing) return;

    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % analysisSteps.length);
      
      // 예측 생성
      if (Math.random() > 0.5) {
        const newPrediction = {
          coin: ['BTC', 'ETH', 'SOL'][Math.floor(Math.random() * 3)],
          direction: Math.random() > 0.5 ? 'UP' : 'DOWN',
          confidence: Math.floor(Math.random() * 30 + 70),
          timeframe: ['1H', '4H', '1D'][Math.floor(Math.random() * 3)],
        };
        setPredictions(prev => [newPrediction, ...prev.slice(0, 2)]);
      }

      // 정확도 변동
      setAccuracy(prev => {
        const change = (Math.random() - 0.5) * 2;
        return Math.max(85, Math.min(92, prev + change));
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isAnalyzing, analysisSteps.length]);

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          <span className="font-semibold">AI 분석 엔진</span>
          {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
          GPT-4 기반
        </Badge>
      </div>

      {/* 분석 단계 */}
      <div className="space-y-2">
        {analysisSteps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          
          return (
            <div
              key={idx}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-all",
                isActive && "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30",
                isCompleted && "opacity-60"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center",
                isActive ? "bg-gradient-to-br from-purple-500 to-pink-500" : "bg-muted"
              )}>
                <Icon className={cn(
                  "h-4 w-4",
                  isActive ? "text-white" : step.color
                )} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{step.name}</p>
                {isActive && (
                  <Progress value={100} className="h-1 mt-1" />
                )}
              </div>
              {isCompleted && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
          );
        })}
      </div>

      {/* 예측 결과 */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">실시간 예측</p>
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3 text-green-500" />
            <span className="text-xs font-bold">{accuracy.toFixed(1)}% 정확도</span>
          </div>
        </div>
        
        <div className="space-y-2">
          {predictions.map((pred, idx) => (
            <Card
              key={idx}
              className={cn(
                "p-3 transition-all",
                idx === 0 && "border-primary/30 animate-pulse-border"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{pred.coin}</Badge>
                  <Badge
                    variant={pred.direction === 'UP' ? 'default' : 'destructive'}
                    className="gap-1"
                  >
                    {pred.direction === 'UP' ? 
                      <TrendingUp className="h-3 w-3" /> : 
                      <TrendingDown className="h-3 w-3" />
                    }
                    {pred.direction}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{pred.confidence}%</p>
                  <p className="text-xs text-muted-foreground">{pred.timeframe}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 메트릭 */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">분석 속도</p>
          <p className="text-sm font-bold">0.3초</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">데이터 포인트</p>
          <p className="text-sm font-bold">200K+</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">모델 버전</p>
          <p className="text-sm font-bold">v4.2</p>
        </div>
      </div>
    </div>
  );
}

// 자동매매 봇 데모 컴포넌트
function AutoTradingDemo() {
  const [isRunning, setIsRunning] = useState(true);
  const [botStatus, setBotStatus] = useState('TRADING');
  const [positions, setPositions] = useState<any[]>([]);
  const [totalProfit, setTotalProfit] = useState(1234.56);
  const [winRate, setWinRate] = useState(68);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // 봇 상태 업데이트
      const statuses = ['TRADING', 'ANALYZING', 'WAITING'];
      setBotStatus(statuses[Math.floor(Math.random() * statuses.length)]);

      // 포지션 업데이트
      if (Math.random() > 0.6) {
        const newPosition = {
          id: Math.random().toString(36).substr(2, 9),
          coin: ['BTC', 'ETH', 'BNB'][Math.floor(Math.random() * 3)],
          type: Math.random() > 0.5 ? 'LONG' : 'SHORT',
          entry: (Math.random() * 10000 + 30000).toFixed(2),
          current: (Math.random() * 10000 + 30000).toFixed(2),
          pnl: (Math.random() - 0.5) * 200,
          size: (Math.random() * 0.5 + 0.1).toFixed(3),
          leverage: Math.floor(Math.random() * 5 + 1),
        };
        setPositions(prev => {
          const updated = [newPosition, ...prev.slice(0, 2)];
          return updated;
        });
      }

      // 수익 업데이트
      setTotalProfit(prev => prev + (Math.random() - 0.45) * 50);
      setWinRate(prev => {
        const change = (Math.random() - 0.5) * 2;
        return Math.max(60, Math.min(75, prev + change));
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isRunning]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TRADING': return 'text-green-500';
      case 'ANALYZING': return 'text-yellow-500';
      case 'WAITING': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-orange-500" />
          <span className="font-semibold">자동매매 봇</span>
          <Badge 
            variant="outline" 
            className={cn("gap-1", getStatusColor(botStatus))}
          >
            <span className="h-2 w-2 bg-current rounded-full animate-pulse"></span>
            {botStatus}
          </Badge>
        </div>
        <Button
          size="sm"
          variant={isRunning ? 'destructive' : 'default'}
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? 'STOP' : 'START'}
        </Button>
      </div>

      {/* 수익 카드 */}
      <Card className={cn(
        "p-4",
        totalProfit > 0 
          ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20"
          : "bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/20"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">오늘 수익</p>
            <p className={cn(
              "text-2xl font-bold",
              totalProfit > 0 ? 'text-green-500' : 'text-red-500'
            )}>
              {totalProfit > 0 ? '+' : ''}{totalProfit.toFixed(2)} USDT
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">승률</p>
            <p className="text-lg font-bold">{winRate.toFixed(1)}%</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
          <span className="text-muted-foreground">거래 횟수: 42</span>
          <span className="text-muted-foreground">평균 수익: +2.8%</span>
        </div>
      </Card>

      {/* 활성 포지션 */}
      <div className="flex-1 space-y-2">
        <p className="text-xs text-muted-foreground font-medium">활성 포지션</p>
        <div className="space-y-2">
          {positions.map((position) => (
            <Card key={position.id} className="p-3 hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={position.type === 'LONG' ? 'default' : 'destructive'}>
                    {position.type} {position.leverage}x
                  </Badge>
                  <span className="text-sm font-medium">{position.coin}</span>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-bold",
                    position.pnl > 0 ? 'text-green-500' : 'text-red-500'
                  )}>
                    {position.pnl > 0 ? '+' : ''}{position.pnl.toFixed(2)} USDT
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {((position.pnl / parseFloat(position.entry)) * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>진입: ${position.entry}</span>
                <span>현재: ${position.current}</span>
                <span>수량: {position.size}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 전략 정보 */}
      <div className="pt-2 border-t space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">전략</span>
          <Badge variant="secondary">Grid + DCA Hybrid</Badge>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">리스크 관리</span>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-green-500" />
            <span>자동 손절 활성화</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 리포팅 데모 컴포넌트
function ReportingDemo() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [chartData, setChartData] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // 차트 데이터 생성
    const data = Array.from({ length: 20 }, () => Math.random() * 100 + 50);
    setChartData(data);
  }, [selectedPeriod]);

  const generateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  const periods = [
    { value: '1d', label: '1일' },
    { value: '7d', label: '7일' },
    { value: '30d', label: '30일' },
    { value: '1y', label: '1년' },
  ];

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-500" />
          <span className="font-semibold">리포트 & 분석</span>
        </div>
        <div className="flex items-center gap-2">
          {periods.map((period) => (
            <Button
              key={period.value}
              size="sm"
              variant={selectedPeriod === period.value ? 'default' : 'ghost'}
              onClick={() => setSelectedPeriod(period.value)}
              className="h-7 px-2"
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 차트 영역 */}
      <Card className="p-4 flex-1 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">수익률 추이</p>
          <Badge variant="outline" className="text-green-500">
            <ArrowUp className="h-3 w-3 mr-1" />
            +32.4%
          </Badge>
        </div>
        
        {/* 미니 차트 */}
        <div className="h-32 flex items-end justify-between gap-1">
          {chartData.map((value, idx) => (
            <div
              key={idx}
              className="flex-1 bg-gradient-to-t from-green-500 to-emerald-500 rounded-t transition-all hover:opacity-80"
              style={{ height: `${value}%` }}
            />
          ))}
        </div>
        
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">총 수익</p>
            <p className="font-bold">+$4,234.56</p>
          </div>
          <div>
            <p className="text-muted-foreground">최대 손실</p>
            <p className="font-bold text-red-500">-$234.12</p>
          </div>
          <div>
            <p className="text-muted-foreground">샤프 비율</p>
            <p className="font-bold">1.82</p>
          </div>
        </div>
      </Card>

      {/* 리포트 타입 */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">리포트 타입</p>
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3 hover:border-primary/30 cursor-pointer transition-all">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">성과 분석</p>
                <p className="text-xs text-muted-foreground">PDF, 12페이지</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 hover:border-primary/30 cursor-pointer transition-all">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">세금 리포트</p>
                <p className="text-xs text-muted-foreground">CSV, Excel</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 생성 버튼 */}
      <Button 
        className="w-full" 
        onClick={generateReport}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            리포트 생성 중...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            리포트 생성하기
          </>
        )}
      </Button>

      {/* 최근 리포트 */}
      <div className="pt-2 border-t space-y-1">
        <p className="text-xs text-muted-foreground mb-2">최근 생성된 리포트</p>
        <div className="flex items-center justify-between text-xs">
          <span>2024년 1월 성과 리포트</span>
          <ChevronRight className="h-3 w-3" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span>Q4 2023 세금 리포트</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}

// 모바일 앱 데모 컴포넌트
function MobileAppDemo() {
  const [selectedTab, setSelectedTab] = useState('portfolio');
  const [notifications, setNotifications] = useState(3);

  const tabs = [
    { id: 'portfolio', label: '포트폴리오', icon: Layers },
    { id: 'trades', label: '거래', icon: Activity },
    { id: 'alerts', label: '알림', icon: Bell },
    { id: 'settings', label: '설정', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* 모바일 프레임 */}
      <div className="flex-1 rounded-3xl bg-gray-900 p-2 shadow-2xl">
        <div className="h-full rounded-3xl bg-background overflow-hidden flex flex-col">
          {/* 상태바 */}
          <div className="h-6 bg-muted/50 flex items-center justify-between px-4 text-xs">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              <span>●●●</span>
              <span>100%</span>
            </div>
          </div>

          {/* 헤더 */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">CryptoManager</h3>
              <div className="flex items-center gap-2">
                {notifications > 0 && (
                  <div className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                      {notifications}
                    </span>
                  </div>
                )}
                <Eye className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* 콘텐츠 */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {selectedTab === 'portfolio' && (
              <>
                {/* 총 자산 */}
                <Card className="p-4 bg-gradient-to-br from-primary/10 to-purple-600/10">
                  <p className="text-xs text-muted-foreground">총 자산</p>
                  <p className="text-2xl font-bold">$45,234.56</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-green-500">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      +12.4%
                    </Badge>
                    <span className="text-xs text-muted-foreground">오늘</span>
                  </div>
                </Card>

                {/* 코인 목록 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <span className="text-xs font-bold">BTC</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Bitcoin</p>
                        <p className="text-xs text-muted-foreground">0.234 BTC</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">$12,345</p>
                      <p className="text-xs text-green-500">+5.2%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="text-xs font-bold">ETH</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Ethereum</p>
                        <p className="text-xs text-muted-foreground">2.45 ETH</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">$4,567</p>
                      <p className="text-xs text-red-500">-2.1%</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedTab === 'trades' && (
              <div className="space-y-2">
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">BUY</Badge>
                    <span className="text-xs text-muted-foreground">2분 전</span>
                  </div>
                  <p className="text-sm font-medium mt-2">BTC/USDT</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs">0.01 BTC</span>
                    <span className="text-xs">@ $43,234</span>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* 하단 탭 */}
          <div className="border-t p-2">
            <div className="flex items-center justify-around">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "flex-col gap-1 h-auto py-2",
                      selectedTab === tab.id && "text-primary"
                    )}
                    onClick={() => setSelectedTab(tab.id)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{tab.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 앱 정보 */}
      <div className="mt-4 text-center space-y-2">
        <div className="flex items-center justify-center gap-4">
          <Badge variant="secondary">iOS</Badge>
          <Badge variant="secondary">Android</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          네이티브 앱으로 언제 어디서나 관리
        </p>
      </div>
    </div>
  );
}

// 메인 Interactive Demo 컴포넌트
export function InteractiveDemo({ featureId }: { featureId: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getDemoComponent = () => {
    switch (featureId) {
      case 'data-collection':
        return <DataCollectionDemo />;
      case 'ai-engine':
        return <AIAnalysisDemo />;
      case 'auto-trading':
        return <AutoTradingDemo />;
      case 'reporting':
        return <ReportingDemo />;
      case 'mobile':
        return <MobileAppDemo />;
      default:
        return <DataCollectionDemo />;
    }
  };

  return (
    <div className="relative w-full h-full min-h-[400px] animate-fade-in">
      {/* 데모 컨테이너 */}
      <div className={cn(
        "h-full rounded-2xl bg-background/95 border shadow-xl overflow-hidden",
        isFullscreen && "fixed inset-4 z-50"
      )}>
        {getDemoComponent()}
      </div>

      {/* 전체화면 토글 */}
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 z-10"
        onClick={() => setIsFullscreen(!isFullscreen)}
      >
        {isFullscreen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>

      {/* 전체화면 배경 */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40"
          onClick={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}