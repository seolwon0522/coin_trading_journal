'use client';

import { useState } from 'react';
import { useSyncBinanceTrades, useQuickSync, useApiKeys } from '@/hooks/use-api-keys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  RefreshCw, 
  Calendar, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  Zap,
  Settings
} from 'lucide-react';
import type { TradeSyncRequest } from '@/types/api-key';
import { format } from 'date-fns';

// 인기 거래 심볼
const POPULAR_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'MATICUSDT',
];

export function TradeSync() {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [customSymbol, setCustomSymbol] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const { data: apiKeys } = useApiKeys();
  const syncTrades = useSyncBinanceTrades();
  const quickSync = useQuickSync();

  const hasBinanceKey = apiKeys?.some(
    (key) => key.exchange === 'BINANCE' && key.isActive
  );

  const handleQuickSync = () => {
    quickSync.mutate();
  };

  const handleAdvancedSync = () => {
    const request: TradeSyncRequest = {
      symbols: selectedSymbols.length > 0 ? selectedSymbols : undefined,
      startTime: dateRange.startDate 
        ? new Date(dateRange.startDate).getTime() 
        : undefined,
      endTime: dateRange.endDate 
        ? new Date(dateRange.endDate).getTime() 
        : undefined,
      limit: 500,
    };

    syncTrades.mutate(request);
    setIsAdvancedOpen(false);
  };

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol]
    );
  };

  const addCustomSymbol = () => {
    const symbol = customSymbol.toUpperCase();
    if (symbol && !selectedSymbols.includes(symbol)) {
      setSelectedSymbols([...selectedSymbols, symbol]);
      setCustomSymbol('');
    }
  };

  if (!hasBinanceKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>거래 자동 동기화</CardTitle>
          <CardDescription>
            Binance에서 거래 내역을 자동으로 가져옵니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              동기화를 사용하려면 먼저 Binance API 키를 등록해주세요.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>거래 자동 동기화</CardTitle>
          <CardDescription>
            Binance에서 거래 내역을 자동으로 가져옵니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 동기화 상태 */}
            {(syncTrades.data || quickSync.data) && (
              <SyncResult 
                result={syncTrades.data || quickSync.data} 
              />
            )}

            {/* 동기화 진행 중 */}
            {(syncTrades.isPending || quickSync.isPending) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>동기화 진행 중...</span>
                </div>
                <Progress value={33} className="w-full" />
              </div>
            )}

            {/* 동기화 버튼 */}
            <div className="flex gap-2">
              <Button
                onClick={handleQuickSync}
                disabled={quickSync.isPending || syncTrades.isPending}
                className="flex-1"
              >
                <Zap className="h-4 w-4 mr-2" />
                빠른 동기화 (24시간)
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAdvancedOpen(true)}
                disabled={quickSync.isPending || syncTrades.isPending}
              >
                <Settings className="h-4 w-4 mr-2" />
                고급 설정
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              • 빠른 동기화: 최근 24시간 거래 내역
              <br />
              • 고급 설정: 기간 및 심볼 선택 가능
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 고급 설정 다이얼로그 */}
      <Dialog open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>고급 동기화 설정</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 심볼 선택 */}
            <div className="space-y-2">
              <Label>거래 심볼 선택</Label>
              <div className="grid grid-cols-4 gap-2">
                {POPULAR_SYMBOLS.map((symbol) => (
                  <div key={symbol} className="flex items-center space-x-2">
                    <Checkbox
                      id={symbol}
                      checked={selectedSymbols.includes(symbol)}
                      onCheckedChange={() => toggleSymbol(symbol)}
                    />
                    <Label
                      htmlFor={symbol}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {symbol}
                    </Label>
                  </div>
                ))}
              </div>
              
              {/* 사용자 정의 심볼 */}
              <div className="flex gap-2">
                <Input
                  placeholder="사용자 정의 심볼 (예: DOTUSDT)"
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomSymbol()}
                />
                <Button onClick={addCustomSymbol} size="sm">
                  추가
                </Button>
              </div>
              
              {selectedSymbols.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedSymbols.map((symbol) => (
                    <Badge
                      key={symbol}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleSymbol(symbol)}
                    >
                      {symbol} ✕
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 기간 선택 */}
            <div className="space-y-2">
              <Label>기간 선택</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" className="text-sm">
                    시작일
                  </Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, startDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-sm">
                    종료일
                  </Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                • 심볼을 선택하지 않으면 기본 심볼(BTC, ETH, BNB)을 사용합니다.
                <br />
                • 기간을 설정하지 않으면 전체 기간을 대상으로 합니다.
                <br />
                • 한 번에 최대 500개의 거래를 가져옵니다.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAdvancedOpen(false)}>
                취소
              </Button>
              <Button onClick={handleAdvancedSync} disabled={syncTrades.isPending}>
                <Download className="h-4 w-4 mr-2" />
                동기화 시작
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 동기화 결과 표시 컴포넌트
function SyncResult({ result }: { result: any }) {
  const hasErrors = result.errors && result.errors.length > 0;

  return (
    <Alert variant={hasErrors ? 'destructive' : 'default'}>
      <div className="flex items-start gap-2">
        {hasErrors ? (
          <XCircle className="h-4 w-4 mt-0.5" />
        ) : (
          <CheckCircle2 className="h-4 w-4 mt-0.5" />
        )}
        <div className="flex-1">
          <AlertDescription>
            <div className="font-medium mb-2">
              동기화 결과 ({format(new Date(result.syncTime), 'HH:mm:ss')})
            </div>
            <div className="space-y-1 text-sm">
              <div>• 처리된 거래: {result.totalProcessed}개</div>
              <div>• 새로 추가: {result.newTrades}개</div>
              <div>• 중복 제외: {result.duplicates}개</div>
              {hasErrors && (
                <div className="mt-2">
                  <div className="font-medium text-destructive">오류 발생:</div>
                  {result.errors.map((error: string, idx: number) => (
                    <div key={idx} className="text-xs ml-2">
                      - {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}