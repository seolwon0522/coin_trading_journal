'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertTriangle, Save } from 'lucide-react';
import { useCreateStrategy, useStrategyTemplates } from '@/hooks/useStrategies';
import { StrategyType } from '@/lib/api/strategies';

export default function NewStrategyPage() {
  const router = useRouter();
  const createMutation = useCreateStrategy();
  const { data: templates = [] } = useStrategyTemplates();

  const [formData, setFormData] = useState({
    name: '',
    type: '' as StrategyType,
    symbol: 'BTCUSDT',
    testnet: true,
    params: {} as Record<string, any>,
  });

  const [paramInputs, setParamInputs] = useState<Record<string, string>>({});

  const selectedTemplate = templates.find((t) => t.type === formData.type);

  // 전략 타입 변경 시 기본 파라미터 로드
  React.useEffect(() => {
    if (selectedTemplate) {
      setFormData((prev) => ({
        ...prev,
        params: selectedTemplate.defaultParams,
      }));
      // 파라미터 입력 필드 초기화
      const inputs: Record<string, string> = {};
      Object.entries(selectedTemplate.defaultParams).forEach(([key, value]) => {
        inputs[key] = String(value);
      });
      setParamInputs(inputs);
    }
  }, [selectedTemplate]);

  const handleParamChange = (key: string, value: string) => {
    setParamInputs((prev) => ({ ...prev, [key]: value }));

    // 숫자인 경우 number로 변환
    const numValue = Number(value);
    const finalValue = !isNaN(numValue) && value !== '' ? numValue : value;

    setFormData((prev) => ({
      ...prev,
      params: {
        ...prev.params,
        [key]: finalValue,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type) {
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        type: formData.type,
        symbol: formData.symbol,
        params: formData.params,
        testnet: formData.testnet,
      });
      router.push('/admin/auto-trading');
    } catch (error) {
      console.error('전략 생성 실패:', error);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">새 전략 생성</h1>
          <p className="text-muted-foreground">Nautilus 자동매매 전략을 설정합니다</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>전략의 기본 설정을 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">전략 이름 *</Label>
              <Input
                id="name"
                placeholder="예: BTC EMA 크로스오버"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">전략 타입 *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as StrategyType })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="전략 선택" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.type} value={template.type}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">거래 심볼 *</Label>
              <Input
                id="symbol"
                placeholder="BTCUSDT"
                value={formData.symbol}
                onChange={(e) =>
                  setFormData({ ...formData, symbol: e.target.value.toUpperCase() })
                }
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="testnet">테스트넷 모드</Label>
                <p className="text-sm text-muted-foreground">
                  테스트넷에서 안전하게 전략을 테스트합니다
                </p>
              </div>
              <Switch
                id="testnet"
                checked={formData.testnet}
                onCheckedChange={(checked) => setFormData({ ...formData, testnet: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* 전략 파라미터 */}
        {selectedTemplate && Object.keys(selectedTemplate.defaultParams).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>전략 파라미터</CardTitle>
              <CardDescription>
                {selectedTemplate.name} 전략의 설정값을 조정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(selectedTemplate.defaultParams).map(([key, defaultValue]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{key.replace(/_/g, ' ').toUpperCase()}</Label>
                  <Input
                    id={key}
                    type={typeof defaultValue === 'number' ? 'number' : 'text'}
                    value={paramInputs[key] || String(defaultValue)}
                    onChange={(e) => handleParamChange(key, e.target.value)}
                    step={typeof defaultValue === 'number' ? 'any' : undefined}
                  />
                  <p className="text-xs text-muted-foreground">기본값: {String(defaultValue)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 경고 */}
        {!formData.testnet && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              실거래 모드입니다. 실제 자금이 사용되니 신중하게 설정하세요!
            </AlertDescription>
          </Alert>
        )}

        {/* 제출 버튼 */}
        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || !formData.name || !formData.type}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? '생성 중...' : '전략 생성'}
          </Button>
        </div>
      </form>
    </div>
  );
}
