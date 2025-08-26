'use client';

import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, RefreshCw, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function ExchangeRateBadge() {
  const { exchangeRate, lastUpdate, loading, error, updateRate } = useExchangeRate();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(exchangeRate.toString());

  const handleSave = () => {
    const newRate = parseFloat(editValue);
    if (!isNaN(newRate) && newRate > 0) {
      updateRate(newRate);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(exchangeRate.toString());
    setIsEditing(false);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge 
          variant="outline" 
          className="cursor-pointer hover:bg-muted transition-colors"
        >
          <DollarSign className="h-3 w-3 mr-1" />
          {loading ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <span className="font-mono">₩{exchangeRate.toLocaleString()}</span>
          )}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">USD/KRW 환율</h4>
            {error && (
              <Badge variant="destructive" className="text-xs">
                오프라인
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <span className="text-sm">1 USD =</span>
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-8 w-24"
                  autoFocus
                />
                <span className="text-sm">KRW</span>
                <Button size="icon" className="h-6 w-6" onClick={handleSave}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-6 w-6" 
                  onClick={handleCancel}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  1 USD = ₩{exchangeRate.toLocaleString()}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-6 w-6"
                  onClick={() => {
                    setEditValue(exchangeRate.toString());
                    setIsEditing(true);
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              마지막 업데이트: {format(new Date(lastUpdate), 'MM월 dd일 HH:mm', { locale: ko })}
            </div>
            
            {error && (
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                {error}
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• 환율은 30분마다 자동 업데이트됩니다</p>
                <p>• 수동으로 환율을 변경할 수 있습니다</p>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}