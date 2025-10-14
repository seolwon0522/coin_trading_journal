'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subDays } from 'date-fns';
import {
  Calendar as CalendarIcon,
  PlayCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { toast } from 'sonner';

interface BacktestRequest {
  strategy_type: string;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_balance: number;
  parameters: Record<string, any>;
  use_tick_data?: boolean;
  include_fees?: boolean;
  risk_free_rate?: number;
}

interface BacktestResult {
  strategy_id: string;
  status: string;
  total_return: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  long_trades: number;
  short_trades: number;
  win_rate: number;
  max_drawdown: number;
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
  largest_win: number;
  largest_loss: number;
  start_date: string;
  end_date: string;
  initial_balance: number;
  final_balance: number;
  execution_time_seconds: number;
}

const NAUTILUS_API = process.env.NEXT_PUBLIC_NAUTILUS_API_URL || 'http://localhost:8002';

export const BacktestRunner: React.FC = () => {
  // Form state
  const [strategyType, setStrategyType] = useState('ema_cross');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1m');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [initialBalance, setInitialBalance] = useState(10000);
  const [parameters, setParameters] = useState<Record<string, any>>({
    fast_period: 10,
    slow_period: 20,
    trade_size: '0.001'
  });

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [backtestId, setBacktestId] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [tradeStats, setTradeStats] = useState({ long: 0, short: 0, total: 0 });

  // WebSocket connection for progress updates
  React.useEffect(() => {
    if (!isRunning) return;

    const ws = new WebSocket(`${WS_URL}/ws/backtest`);
    let reconnectTimer: NodeJS.Timeout;

    ws.onopen = () => {
      console.log('✅ WebSocket connected for backtest progress');
      // Subscribe to backtest channel
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['backtest']
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', data);

        if (data.type === 'backtest_progress') {
          setProgress(data.progress || 0);
          setProgressMessage(data.message || '');

          // Update trade statistics if available
          if (data.long_trades !== undefined || data.short_trades !== undefined) {
            setTradeStats({
              long: data.long_trades || 0,
              short: data.short_trades || 0,
              total: data.total_trades || 0
            });
          }

          console.log(`📊 Progress: ${data.progress}% - ${data.message}`);
          console.log(`📈 Trades - Long: ${data.long_trades}, Short: ${data.short_trades}, Total: ${data.total_trades}`);
        } else if (data.type === 'subscribed') {
          console.log(`✅ Subscribed to channel: ${data.channel}`);
        } else if (data.type === 'connected') {
          console.log(`🔗 Connected to channel: ${data.channel}`);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      // Auto-reconnect if still running
      if (isRunning) {
        console.log('🔄 Attempting to reconnect in 2 seconds...');
        reconnectTimer = setTimeout(() => {
          console.log('🔄 Reconnecting WebSocket...');
        }, 2000);
      }
    };

    return () => {
      clearTimeout(reconnectTimer);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [isRunning]);

  // Start backtest
  const runBacktest = async () => {
    try {
      setIsRunning(true);
      setProgress(0);
      setProgressMessage('백테스트 초기화 중...');
      setResult(null);
      setTradeStats({ long: 0, short: 0, total: 0 });

      const request = {
        strategy_type: strategyType,
        instrument_id: `${symbol}.BINANCE`,
        timeframe: timeframe,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        initial_balance: initialBalance,
        parameters: parameters
      };

      console.log('📤 Sending backtest request:', request);
      console.log('🔗 API endpoint:', `${NAUTILUS_API}/api/backtest/run`);

      // Start backtest - 실시간 진행률은 WebSocket으로 수신
      const { data } = await axios.post(`${NAUTILUS_API}/api/backtest/run`, request);

      console.log('✅ Backtest result received:', data);

      // 결과 구조 확인 및 설정
      if (data) {
        // API 응답에서 필요한 필드 매핑
        const mappedResult = {
          strategy_id: data.strategy_id || `${strategyType}-${Date.now()}`,
          status: data.status || 'completed',
          total_return: data.total_return || 0,
          total_trades: data.total_trades || 0,
          winning_trades: data.winning_trades || 0,
          losing_trades: data.losing_trades || 0,
          long_trades: data.long_trades || 0,
          short_trades: data.short_trades || 0,
          win_rate: data.win_rate || 0,
          max_drawdown: data.max_drawdown || 0,
          profit_factor: data.profit_factor || 0,
          avg_win: data.avg_win || 0,
          avg_loss: data.avg_loss || 0,
          largest_win: data.largest_win || 0,
          largest_loss: data.largest_loss || 0,
          start_date: data.start_date || request.start_date,
          end_date: data.end_date || request.end_date,
          initial_balance: data.initial_balance || initialBalance,
          final_balance: data.final_balance || initialBalance,
          execution_time_seconds: data.execution_time_seconds || 0,
          equity_curve: data.equity_curve || [],
          trades: data.trades || []
        };

        setResult(mappedResult);
        setProgress(100);
        setProgressMessage('백테스트 완료!');
        toast.success(`백테스트 완료 - 수익률: ${mappedResult.total_return.toFixed(2)}%`);
      }

      setIsRunning(false);

    } catch (error: any) {
      console.error('❌ Backtest error:', error);
      const errorMessage = error.response?.data?.detail || error.message || '백테스트 실행 중 오류가 발생했습니다';
      toast.error(errorMessage);
      setProgress(0);
      setProgressMessage('');
      setIsRunning(false);
    }
  };

  // Update parameters based on strategy type
  const updateStrategyParameters = (type: string) => {
    setStrategyType(type);

    switch (type) {
      case 'ema_cross':
        setParameters({
          fast_period: 10,
          slow_period: 20,
          trade_size: '0.001'
        });
        break;
      case 'market_maker':
        setParameters({
          atr_period: 20,
          atr_multiple: 6.0,
          max_inventory: 0.1,
          spread_multiplier: 1.0
        });
        break;
      case 'orderbook_imbalance':
        setParameters({
          book_depth: 10,
          imbalance_threshold: 0.6,
          trade_size: 0.001,
          min_holding_secs: 30
        });
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">백테스트 설정</CardTitle>
              <CardDescription className="mt-1">
                Nautilus Trader를 사용한 전략 백테스트 - 과거 데이터로 전략 성능 검증
              </CardDescription>
            </div>
            <Badge variant="outline" className="h-fit">
              <Activity className="h-3 w-3 mr-1" />
              Nautilus Engine
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Strategy Selection Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="strategy">전략 유형</Label>
              <Select value={strategyType} onValueChange={updateStrategyParameters}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ema_cross">📈 EMA Cross</SelectItem>
                  <SelectItem value="market_maker">💱 Market Maker</SelectItem>
                  <SelectItem value="orderbook_imbalance">📊 Orderbook Imbalance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">거래 심볼</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="BTCUSDT"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeframe">타임프레임</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1분</SelectItem>
                  <SelectItem value="5m">5분</SelectItem>
                  <SelectItem value="15m">15분</SelectItem>
                  <SelectItem value="30m">30분</SelectItem>
                  <SelectItem value="1h">1시간</SelectItem>
                  <SelectItem value="4h">4시간</SelectItem>
                  <SelectItem value="1d">1일</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range and Balance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>시작일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>종료일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">초기 자본금 (USDT)</Label>
              <Input
                id="balance"
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(Number(e.target.value))}
                step="1000"
                min="100"
              />
            </div>
          </div>

          {/* Strategy Parameters */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">전략 파라미터</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg">
              {Object.entries(parameters).map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{key}</Label>
                  <Input
                    type={typeof value === 'boolean' ? 'checkbox' : 'text'}
                    value={value}
                    onChange={(e) =>
                      setParameters({
                        ...parameters,
                        [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
                      })
                    }
                    className="h-9"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Run Button */}
          <Button
            onClick={runBacktest}
            disabled={isRunning}
            className="w-full"
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                실행 중...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-5 w-5" />
                백테스트 실행
              </>
            )}
          </Button>

          {/* Progress Display */}
          {isRunning && (
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">백테스트 진행 중</p>
                    <p className="text-xs text-muted-foreground">{progressMessage || '처리 중...'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{progress.toFixed(0)}%</p>
                  </div>
                </div>

                <Progress value={progress} className="h-3" />

                {/* Real-time trade statistics */}
                {(tradeStats.long > 0 || tradeStats.short > 0) && (
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                    <div className="text-center space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-muted-foreground">롱 거래</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{tradeStats.long}</p>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                        <span className="text-xs text-muted-foreground">숏 거래</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600">{tradeStats.short}</p>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Activity className="h-4 w-4 text-blue-600" />
                        <span className="text-xs text-muted-foreground">총 거래</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{tradeStats.total}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">백테스트 결과</CardTitle>
                <CardDescription className="mt-1">
                  {result.start_date} ~ {result.end_date} • {timeframe} • {symbol}
                </CardDescription>
              </div>
              <Badge
                variant={result.total_return >= 0 ? "default" : "destructive"}
                className="text-lg px-4 py-2"
              >
                {result.total_return >= 0 ? '+' : ''}{result.total_return.toFixed(2)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">개요</TabsTrigger>
                <TabsTrigger value="chart">차트</TabsTrigger>
                <TabsTrigger value="trades">거래 내역</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">총 수익률</p>
                        <div className="flex items-end gap-2">
                          {result.total_return >= 0 ? (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )}
                          <p className={cn(
                            "text-2xl font-bold",
                            result.total_return > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {result.total_return > 0 ? '+' : ''}{result.total_return.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">승률</p>
                        <p className="text-2xl font-bold">{result.win_rate.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">
                          {result.winning_trades}승 {result.losing_trades}패
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">총 거래</p>
                        <p className="text-2xl font-bold">{result.total_trades}</p>
                        <div className="flex gap-2 text-xs">
                          <span className="text-green-600">롱 {result.long_trades || 0}</span>
                          <span className="text-red-600">숏 {result.short_trades || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">최대 손실률</p>
                        <p className="text-2xl font-bold text-red-600">
                          -{result.max_drawdown.toFixed(2)}%
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">거래 통계</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">롱 거래</span>
                        <span className="text-sm font-medium text-green-600">{result.long_trades || 0}회</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">숏 거래</span>
                        <span className="text-sm font-medium text-red-600">{result.short_trades || 0}회</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">승리 거래</span>
                        <span className="text-sm font-medium text-green-600">{result.winning_trades}회</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">패배 거래</span>
                        <span className="text-sm font-medium text-red-600">{result.losing_trades}회</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">평균 수익</span>
                        <span className="text-sm font-medium text-green-600">+${result.avg_win.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">평균 손실</span>
                        <span className="text-sm font-medium text-red-600">-${result.avg_loss.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">위험 및 성과 지표</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">Profit Factor</span>
                        <span className="text-sm font-medium">{result.profit_factor.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">최대 승리</span>
                        <span className="text-sm font-medium text-green-600">+${result.largest_win.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">최대 손실</span>
                        <span className="text-sm font-medium text-red-600">-${result.largest_loss.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">초기 자본금</span>
                        <span className="text-sm font-medium">${result.initial_balance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">최종 잔고</span>
                        <span className="text-sm font-medium">${result.final_balance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">실행 시간</span>
                        <span className="text-sm font-medium">{result.execution_time_seconds.toFixed(1)}초</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Risk Alert */}
                {result.max_drawdown > 20 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      최대 손실률이 20%를 초과했습니다. 리스크 관리 파라미터를 조정하는 것을 권장합니다.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Chart Tab */}
              <TabsContent value="chart">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.equity_curve || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              {/* Trades Tab */}
              <TabsContent value="trades">
                <div className="border rounded-lg">
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium text-sm">일시</th>
                          <th className="text-left p-3 font-medium text-sm">방향</th>
                          <th className="text-right p-3 font-medium text-sm">진입가</th>
                          <th className="text-right p-3 font-medium text-sm">청산가</th>
                          <th className="text-right p-3 font-medium text-sm">수량</th>
                          <th className="text-right p-3 font-medium text-sm">손익</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.trades?.slice(0, 100).map((trade, idx) => (
                          <tr key={idx} className="border-t hover:bg-muted/30 transition-colors">
                            <td className="p-3 text-sm text-muted-foreground">
                              {new Date(trade.entry_time).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <Badge variant={trade.side === 'BUY' ? 'default' : 'secondary'}>
                                {trade.side}
                              </Badge>
                            </td>
                            <td className="text-right p-3 text-sm">${trade.entry_price.toFixed(2)}</td>
                            <td className="text-right p-3 text-sm">${trade.exit_price.toFixed(2)}</td>
                            <td className="text-right p-3 text-sm">{trade.quantity}</td>
                            <td className={cn(
                              "text-right p-3 text-sm font-medium",
                              trade.pnl > 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BacktestRunner;