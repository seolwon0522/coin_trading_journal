'use client';

import { useState } from 'react';
import { useTrades } from '@/hooks/use-trades';
import { Trade } from '@/lib/api/trades-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function TradeFormSimple({ trade, onClose }: { trade?: Trade; onClose?: () => void }) {
  const { createTrade, updateTrade } = useTrades();
  const isEdit = !!trade?.id;
  
  const [formData, setFormData] = useState<Trade>({
    symbol: trade?.symbol || '',
    type: trade?.type || 'SPOT',
    side: trade?.side || 'BUY',
    quantity: trade?.quantity || 0,
    price: trade?.price || 0,
    executedAt: trade?.executedAt || new Date().toISOString(),
    notes: trade?.notes || '',
    fee: trade?.fee || 0,
    stopLoss: trade?.stopLoss,
    takeProfit: trade?.takeProfit,
    tradingStrategy: trade?.tradingStrategy || 'TREND',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEdit && trade.id) {
        await updateTrade(trade.id, formData);
        toast.success('거래가 수정되었습니다');
      } else {
        await createTrade(formData);
        toast.success('거래가 등록되었습니다');
      }
      onClose?.();
    } catch (error) {
      toast.error(isEdit ? '수정 실패' : '등록 실패');
    }
  };

  const handleChange = (field: keyof Trade, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>심볼</Label>
          <Input
            value={formData.symbol}
            onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
            placeholder="BTCUSDT"
            required
          />
        </div>
        
        <div>
          <Label>거래 타입</Label>
          <select
            className="w-full p-2 border rounded"
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
          >
            <option value="SPOT">현물</option>
            <option value="FUTURES">선물</option>
            <option value="MARGIN">마진</option>
          </select>
        </div>
        
        <div>
          <Label>매매 방향</Label>
          <select
            className="w-full p-2 border rounded"
            value={formData.side}
            onChange={(e) => handleChange('side', e.target.value)}
          >
            <option value="BUY">매수</option>
            <option value="SELL">매도</option>
          </select>
        </div>
        
        <div>
          <Label>수량</Label>
          <Input
            type="number"
            step="any"
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', parseFloat(e.target.value))}
            required
          />
        </div>
        
        <div>
          <Label>가격</Label>
          <Input
            type="number"
            step="any"
            value={formData.price}
            onChange={(e) => handleChange('price', parseFloat(e.target.value))}
            required
          />
        </div>
        
        <div>
          <Label>체결 시간</Label>
          <Input
            type="datetime-local"
            value={formData.executedAt.slice(0, 16)}
            onChange={(e) => handleChange('executedAt', new Date(e.target.value).toISOString())}
            required
          />
        </div>
        
        <div>
          <Label>수수료</Label>
          <Input
            type="number"
            step="any"
            value={formData.fee || ''}
            onChange={(e) => handleChange('fee', parseFloat(e.target.value) || 0)}
          />
        </div>
        
        <div>
          <Label>매매 전략</Label>
          <select
            className="w-full p-2 border rounded"
            value={formData.tradingStrategy}
            onChange={(e) => handleChange('tradingStrategy', e.target.value)}
          >
            <option value="TREND">추세매매</option>
            <option value="BREAKOUT">돌파매매</option>
            <option value="COUNTER_TREND">역추세매매</option>
            <option value="SCALPING">스캘핑</option>
            <option value="SWING">스윙</option>
            <option value="POSITION">포지션</option>
          </select>
        </div>
        
        <div>
          <Label>손절가</Label>
          <Input
            type="number"
            step="any"
            value={formData.stopLoss || ''}
            onChange={(e) => handleChange('stopLoss', parseFloat(e.target.value) || undefined)}
          />
        </div>
        
        <div>
          <Label>익절가</Label>
          <Input
            type="number"
            step="any"
            value={formData.takeProfit || ''}
            onChange={(e) => handleChange('takeProfit', parseFloat(e.target.value) || undefined)}
          />
        </div>
      </div>
      
      <div>
        <Label>메모</Label>
        <textarea
          className="w-full p-2 border rounded"
          rows={3}
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="거래 메모..."
        />
      </div>
      
      <div className="flex gap-2 justify-end">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
        )}
        <Button type="submit">
          {isEdit ? '수정' : '등록'}
        </Button>
      </div>
    </form>
  );
}