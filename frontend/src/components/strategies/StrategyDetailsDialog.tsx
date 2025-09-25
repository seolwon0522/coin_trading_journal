'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StrategyResponse, getStrategyTypeLabel } from '@/lib/api/strategy-api';
import { Badge } from '@/components/ui/badge';

interface StrategyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategy: StrategyResponse;
}

export function StrategyDetailsDialog({ open, onOpenChange, strategy }: StrategyDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{strategy.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Badge>{getStrategyTypeLabel(strategy.type)}</Badge>
            <Badge variant="outline">{strategy.symbol}</Badge>
            {strategy.testnet && <Badge variant="secondary">테스트넷</Badge>}
            <Badge variant={strategy.active ? "default" : "secondary"}>
              {strategy.active ? '실행중' : '대기중'}
            </Badge>
          </div>

          {strategy.description && (
            <div>
              <h3 className="font-semibold mb-1">설명</h3>
              <p className="text-sm text-muted-foreground">{strategy.description}</p>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">성과 지표</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">총 거래수:</span>
                <span className="ml-2 font-medium">{strategy.totalTrades || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">승률:</span>
                <span className="ml-2 font-medium">
                  {strategy.winRate ? `${strategy.winRate}%` : '-'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">총 수익률:</span>
                <span className="ml-2 font-medium">
                  {strategy.totalReturn ? `${strategy.totalReturn}%` : '-'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">최대 손실:</span>
                <span className="ml-2 font-medium">
                  {strategy.maxDrawdown ? `${strategy.maxDrawdown}%` : '-'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">샤프 비율:</span>
                <span className="ml-2 font-medium">
                  {strategy.sharpeRatio || '-'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">실현 손익:</span>
                <span className="ml-2 font-medium">
                  ${strategy.realizedPnl || 0}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">전략 파라미터</h3>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto">
              {JSON.stringify(strategy.params, null, 2)}
            </pre>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>생성일: {new Date(strategy.createdAt).toLocaleString()}</p>
            {strategy.activatedAt && (
              <p>활성화: {new Date(strategy.activatedAt).toLocaleString()}</p>
            )}
            {strategy.lastTradeAt && (
              <p>마지막 거래: {new Date(strategy.lastTradeAt).toLocaleString()}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}