'use client';

import React, { useState, useEffect } from 'react';
import { Trade, TradeRequest } from '@/types/trade';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';

interface TradeFormProps {
  trade?: Trade;
  onSubmit: (data: TradeRequest) => Promise<void>;
  onCancel: () => void;
}

export function TradeForm({ trade, onSubmit, onCancel }: TradeFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TradeRequest>({
    symbol: trade?.symbol || '',
    side: trade?.side || 'BUY',
    entryPrice: trade?.entryPrice || 0,
    entryQuantity: trade?.entryQuantity || 0,
    entryTime: trade?.entryTime || new Date().toISOString(),
    exitPrice: trade?.exitPrice,
    exitQuantity: trade?.exitQuantity,
    exitTime: trade?.exitTime,
    notes: trade?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit(formData);
      onCancel(); // 성공 시 폼 닫기
    } catch (error) {
      // 에러는 hook에서 처리
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof TradeRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 심볼 */}
      <div>
        <Label htmlFor="symbol">심볼 *</Label>
        <Input
          id="symbol"
          value={formData.symbol}
          onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
          placeholder="예: BTC/USDT"
          required
        />
      </div>

      {/* 매수/매도 */}
      <div>
        <Label htmlFor="side">매수/매도 *</Label>
        <Select
          value={formData.side}
          onValueChange={(value: 'BUY' | 'SELL') => handleChange('side', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BUY">매수</SelectItem>
            <SelectItem value="SELL">매도</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 진입 가격 */}
      <div>
        <Label htmlFor="entryPrice">진입 가격 *</Label>
        <Input
          id="entryPrice"
          type="number"
          step="0.00000001"
          value={formData.entryPrice || ''}
          onChange={(e) => handleChange('entryPrice', parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          required
        />
      </div>

      {/* 진입 수량 */}
      <div>
        <Label htmlFor="entryQuantity">진입 수량 *</Label>
        <Input
          id="entryQuantity"
          type="number"
          step="0.00000001"
          value={formData.entryQuantity || ''}
          onChange={(e) => handleChange('entryQuantity', parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          required
        />
      </div>

      {/* 진입 시간 */}
      <div>
        <Label htmlFor="entryTime">진입 시간 *</Label>
        <Input
          id="entryTime"
          type="datetime-local"
          value={formData.entryTime ? formData.entryTime.slice(0, 16) : ''}
          onChange={(e) => handleChange('entryTime', new Date(e.target.value).toISOString())}
          required
        />
      </div>

      {/* 구분선 */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-3">청산 정보 (선택)</h3>
      </div>

      {/* 청산 가격 */}
      <div>
        <Label htmlFor="exitPrice">청산 가격</Label>
        <Input
          id="exitPrice"
          type="number"
          step="0.00000001"
          value={formData.exitPrice || ''}
          onChange={(e) => handleChange('exitPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
          placeholder="0.00"
        />
      </div>

      {/* 청산 수량 */}
      <div>
        <Label htmlFor="exitQuantity">청산 수량</Label>
        <Input
          id="exitQuantity"
          type="number"
          step="0.00000001"
          value={formData.exitQuantity || ''}
          onChange={(e) => handleChange('exitQuantity', e.target.value ? parseFloat(e.target.value) : undefined)}
          placeholder="0.00"
        />
      </div>

      {/* 청산 시간 */}
      <div>
        <Label htmlFor="exitTime">청산 시간</Label>
        <Input
          id="exitTime"
          type="datetime-local"
          value={formData.exitTime ? formData.exitTime.slice(0, 16) : ''}
          onChange={(e) => handleChange('exitTime', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
        />
      </div>

      {/* 메모 */}
      <div>
        <Label htmlFor="notes">메모</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="거래에 대한 메모를 입력하세요"
          rows={3}
        />
      </div>

      {/* 버튼 */}
      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? '처리중...' : (trade ? '수정' : '등록')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          취소
        </Button>
      </div>
    </form>
  );
}