'use client';

import { useState } from 'react';
import { useCreateApiKey, useValidateApiKey } from '@/hooks/use-api-keys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import type { ApiKeyRequest, Exchange } from '@/types/api-key';

interface ApiKeyFormProps {
  onSuccess: () => void;
}

export function ApiKeyForm({ onSuccess }: ApiKeyFormProps) {
  const [formData, setFormData] = useState<ApiKeyRequest>({
    exchange: 'BINANCE',
    apiKey: '',
    secretKey: '',
    keyName: '',
    canTrade: false,
    isActive: true,
  });
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [validationError, setValidationError] = useState('');

  const createApiKey = useCreateApiKey();
  const validateApiKey = useValidateApiKey();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // 먼저 API 키 유효성 검증
    try {
      const isValid = await validateApiKey.mutateAsync(formData);
      if (!isValid) {
        setValidationError('유효하지 않은 API 키입니다. 키를 다시 확인해주세요.');
        return;
      }
    } catch (error) {
      setValidationError('API 키 검증 중 오류가 발생했습니다.');
      return;
    }

    // API 키 등록
    createApiKey.mutate(formData, {
      onSuccess: () => {
        onSuccess();
        setFormData({
          exchange: 'BINANCE',
          apiKey: '',
          secretKey: '',
          keyName: '',
          canTrade: false,
          isActive: true,
        });
      },
      onError: (error: any) => {
        console.error('API 키 등록 오류:', error);
        const errorMessage = error?.response?.data?.message || 
                           error?.response?.data?.error || 
                           error?.message || 
                           'API 키 등록 중 오류가 발생했습니다.';
        setValidationError(errorMessage);
      },
    });
  };

  const handleChange = (field: keyof ApiKeyRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="exchange">거래소</Label>
        <Select
          value={formData.exchange}
          onValueChange={(value: Exchange) => handleChange('exchange', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BINANCE">Binance</SelectItem>
            <SelectItem value="UPBIT" disabled>
              Upbit (준비중)
            </SelectItem>
            <SelectItem value="BITHUMB" disabled>
              Bithumb (준비중)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="keyName">키 이름 (선택)</Label>
        <Input
          id="keyName"
          value={formData.keyName}
          onChange={(e) => handleChange('keyName', e.target.value)}
          placeholder="예: 메인 계정"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="apiKey">API Key</Label>
        <Input
          id="apiKey"
          value={formData.apiKey}
          onChange={(e) => handleChange('apiKey', e.target.value)}
          placeholder="API 키를 입력하세요"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="secretKey">Secret Key</Label>
        <div className="relative">
          <Input
            id="secretKey"
            type={showSecretKey ? 'text' : 'password'}
            value={formData.secretKey}
            onChange={(e) => handleChange('secretKey', e.target.value)}
            placeholder="Secret 키를 입력하세요"
            required
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowSecretKey(!showSecretKey)}
          >
            {showSecretKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          API 키는 AES-256 암호화되어 안전하게 저장됩니다.
          거래 권한이 있는 키는 신중하게 관리해주세요.
        </AlertDescription>
      </Alert>

      {formData.exchange === 'BINANCE' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Binance API 키 생성 방법:</strong>
            <ol className="mt-2 ml-4 text-sm space-y-1">
              <li>1. Binance 계정 설정 → API Management</li>
              <li>2. "Create API" 클릭</li>
              <li>3. 라벨 입력 후 생성</li>
              <li>4. "Enable Reading" 권한 필수</li>
              <li>5. IP 제한 설정 권장 (보안)</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={createApiKey.isPending || validateApiKey.isPending}
      >
        {createApiKey.isPending || validateApiKey.isPending
          ? '처리 중...'
          : 'API 키 등록'}
      </Button>
    </form>
  );
}