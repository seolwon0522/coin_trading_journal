'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StrategyResponse } from '@/lib/api/strategy-api';

interface BacktestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategy: StrategyResponse;
}

export function BacktestDialog({ open, onOpenChange, strategy }: BacktestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>백테스팅 - {strategy.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-muted-foreground">백테스팅 기능은 준비중입니다.</p>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}