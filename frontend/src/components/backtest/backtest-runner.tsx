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
import { Calendar as CalendarIcon, PlayCircle, AlertCircle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
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
  backtest_id: string;
  status: string;
  period?: string;
  total_return: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number;
  expectancy: number;
  final_balance: number;
  equity_curve: Array<{ date: string; value: number }>;
  trades: Array<any>;
}

const NAUTILUS_API = process.env.NEXT_PUBLIC_NAUTILUS_API_URL || 'http://localhost:8002';

export const BacktestRunner: React.FC = () => {
  // Form state
  const [strategyType, setStrategyType] = useState('ema_cross');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [initialBalance, setInitialBalance] = useState(10000);
  const [parameters, setParameters] = useState<Record<string, any>>({
    fast_ema_period: 10,
    slow_ema_period: 20,
    trade_size: 0.001
  });

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [backtestId, setBacktestId] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  // Start backtest
  const runBacktest = async () => {
    try {
      setIsRunning(true);
      setProgress(0);
      setResult(null);

      const request: BacktestRequest = {
        strategy_type: strategyType,
        symbol,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        initial_balance: initialBalance,
        parameters,
        include_fees: true,
        risk_free_rate: 0.02
      };

      // Start backtest
      const { data } = await axios.post(`${NAUTILUS_API}/api/v1/backtest/run`, request);
      setBacktestId(data.backtest_id);

      toast.success('?袁⑸즲??????덉쉐 ??筌믨퀣援??);

      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await axios.get(`${NAUTILUS_API}/api/v1/backtest/${data.backtest_id}/status`);
          const status = statusRes.data;

          setProgress(status.progress);

          if (status.status === 'completed') {
            clearInterval(pollInterval);

            // Get result
            const resultRes = await axios.get(`${NAUTILUS_API}/api/v1/backtest/${data.backtest_id}/result`);
            setResult(resultRes.data);
            toast.success('?袁⑸즲??????덉쉐 ??ш끽維??);
            setIsRunning(false);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            toast.error(`?袁⑸즲??????덉쉐 ????됰꽡: ${status.message}`);
            setIsRunning(false);
          }
        } catch (error) {
          console.error('Status polling error:', error);
        }
      }, 2000);

      // Cleanup after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000);

    } catch (error) {
      console.error('Backtest error:', error);
      toast.error('?袁⑸즲??????덉쉐 ????덈틖 ????됰꽡');
      setIsRunning(false);
    }
  };

  // Update parameters based on strategy type
  const updateStrategyParameters = (type: string) => {
    setStrategyType(type);

    switch (type) {
      case 'ema_cross':
        setParameters({
          fast_ema_period: 10,
          slow_ema_period: 20,
          trade_size: 0.001,
          use_bracket_orders: true
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
          <CardTitle>?袁⑸즲??????덉쉐 ???源놁젳</CardTitle>
          <CardDescription>
            Nautilus Trader?????????ш끽維???袁⑸즲??????됯튅
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strategy Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="strategy">??ш끽維?????ャ뀕??/Label>
              <Select value={strategyType} onValueChange={updateStrategyParameters}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ema_cross">EMA Cross</SelectItem>
                  <SelectItem value="market_maker">Market Maker</SelectItem>
                  <SelectItem value="orderbook_imbalance">Orderbook Imbalance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="symbol">????/Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="BTCUSDT"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>??筌믨퀣援??/Label>
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

            <div>
              <Label>???ろ꼤嶺??/Label>
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
          </div>

          {/* Initial Balance */}
          <div>
            <Label htmlFor="balance">?縕?猿녿뎨????亦?(USDT)</Label>
            <Input
              id="balance"
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(Number(e.target.value))}
            />
          </div>

          {/* Strategy Parameters */}
          <div>
            <Label>??ш끽維??????앗꾩쒀?濡?뎄??/Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(parameters).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <Label className="text-sm">{key}:</Label>
                  <Input
                    type={typeof value === 'boolean' ? 'checkbox' : 'text'}
                    value={value}
                    onChange={(e) =>
                      setParameters({
                        ...parameters,
                        [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
                      })
                    }
                    className="h-8"
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
            <PlayCircle className="mr-2 h-4 w-4" />
            {isRunning ? '????덈틖 濚?..' : '?袁⑸즲??????덉쉐 ????덈틖'}
          </Button>

          {/* Progress */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>癲ル슣???몄춿?臾먦걫?/span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>?袁⑸즲??????덉쉐 ?濡ろ뜏???/CardTitle>
            <CardDescription>
              {result.period} 勇?{result.total_trades}??癲꾧퀗????
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">??좊즵獒??/TabsTrigger>
                <TabsTrigger value="chart">癲ル슓堉곁땟??/TabsTrigger>
                <TabsTrigger value="trades">癲꾧퀗???????⑤９肉?/TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">?????쒓낮???/p>
                    <p className={cn(
                      "text-2xl font-bold",
                      result.total_return > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {result.total_return > 0 ? '+' : ''}{result.total_return.toFixed(2)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">??꾩룆梨??/p>
                    <p className="text-2xl font-bold">{result.win_rate.toFixed(1)}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">????덈뭷 ?????/p>
                    <p className="text-2xl font-bold">{result.sharpe_ratio.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">癲ル슔?됭짆? ?????/p>
                    <p className="text-2xl font-bold text-red-600">
                      -{result.max_drawdown.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Detailed Metrics */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <h4 className="font-medium mb-2">癲꾧퀗?????????/h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">??癲꾧퀗????/span>
                        <span>{result.total_trades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">??꾩룆침??/span>
                        <span className="text-green-600">{result.winning_trades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">???釉먮틯</span>
                        <span className="text-red-600">{result.losing_trades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">????????쒓낮??/span>
                        <span className="text-green-600">+{result.avg_win.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">??????????/span>
                        <span className="text-red-600">-{result.avg_loss.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">?域밸Ŧ遊얕짆??癲ル슢????용끏??/h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sortino Ratio</span>
                        <span>{result.sortino_ratio.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profit Factor</span>
                        <span>{result.profit_factor.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">??れ삀????/span>
                        <span>{result.expectancy.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">?縕?猿녿뎨????亦?/span>
                        <span>${initialBalance}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">癲ル슔?됭짆?륂렭???釉???/span>
                        <span className="font-medium">${result.final_balance.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Alert */}
                {result.max_drawdown > 20 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      癲ル슔?됭짆? ??????20%???縕?????怨?????덊렡. ?域밸Ŧ遊얕짆?????굿??????앗꾩쒀?濡?뎄???釉뚰??????關履???筌뚯뼚???
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
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">??癰???/th>
                        <th className="text-left p-2">?袁⑸젻泳?떑??/th>
                        <th className="text-right p-2">癲ル슣????筌?</th>
                        <th className="text-right p-2">癲?雅?굞?깍㎗?</th>
                        <th className="text-right p-2">??嚥???/th>
                        <th className="text-right p-2">?????/th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades?.slice(0, 50).map((trade, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2 text-muted-foreground">
                            {new Date(trade.entry_time).toLocaleDateString()}
                          </td>
                          <td className="p-2">
                            <Badge variant={trade.side === 'BUY' ? 'default' : 'secondary'}>
                              {trade.side}
                            </Badge>
                          </td>
                          <td className="text-right p-2">{trade.entry_price.toFixed(2)}</td>
                          <td className="text-right p-2">{trade.exit_price.toFixed(2)}</td>
                          <td className="text-right p-2">{trade.quantity}</td>
                          <td className={cn(
                            "text-right p-2 font-medium",
                            trade.pnl > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
