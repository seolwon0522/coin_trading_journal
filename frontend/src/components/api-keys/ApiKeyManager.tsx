'use client';

import { useState } from 'react';
import { 
  useApiKeys, 
  useCreateApiKey, 
  useDeleteApiKey, 
  useTestApiKey 
} from '@/hooks/use-api-keys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Plus, TestTube, AlertCircle } from 'lucide-react';
import { ApiKeyForm } from './ApiKeyForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ApiKey } from '@/types/api-key';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export function ApiKeyManager() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { data: apiKeys, isLoading } = useApiKeys();
  const deleteApiKey = useDeleteApiKey();
  const testApiKey = useTestApiKey();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API 키 관리</CardTitle>
          <CardDescription>거래소 API 키를 안전하게 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleDelete = (keyId: number) => {
    if (confirm('정말로 이 API 키를 삭제하시겠습니까?')) {
      deleteApiKey.mutate(keyId);
    }
  };

  const handleTest = (keyId: number) => {
    testApiKey.mutate(keyId);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>API 키 관리</CardTitle>
            <CardDescription>거래소 API 키를 안전하게 관리합니다.</CardDescription>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            API 키 추가
          </Button>
        </CardHeader>
        <CardContent>
          {apiKeys?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>등록된 API 키가 없습니다.</p>
              <p className="text-sm mt-2">API 키를 추가하여 거래 내역을 자동으로 동기화하세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys?.map((apiKey) => (
                <ApiKeyCard
                  key={apiKey.id}
                  apiKey={apiKey}
                  onDelete={() => handleDelete(apiKey.id)}
                  onTest={() => handleTest(apiKey.id)}
                  isTestLoading={testApiKey.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API 키 추가</DialogTitle>
          </DialogHeader>
          <ApiKeyForm onSuccess={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ApiKeyCardProps {
  apiKey: ApiKey;
  onDelete: () => void;
  onTest: () => void;
  isTestLoading: boolean;
}

function ApiKeyCard({ apiKey, onDelete, onTest, isTestLoading }: ApiKeyCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>
            {apiKey.exchange}
          </Badge>
          <span className="font-medium">{apiKey.keyName || 'API Key'}</span>
          {apiKey.isActive ? (
            <Badge variant="outline" className="text-green-600">
              활성
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-500">
              비활성
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onTest}
            disabled={isTestLoading}
          >
            <TestTube className="h-4 w-4 mr-1" />
            테스트
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">API 키:</span>
          <span className="ml-2 font-mono">{apiKey.apiKeyMasked}</span>
        </div>
        <div>
          <span className="text-muted-foreground">권한:</span>
          <span className="ml-2">
            {apiKey.canTrade ? '거래 가능' : '읽기 전용'}
          </span>
        </div>
      </div>

      {apiKey.lastSyncAt && (
        <div className="text-sm text-muted-foreground">
          마지막 동기화: {format(new Date(apiKey.lastSyncAt), 'PPP HH:mm', { locale: ko })}
        </div>
      )}

      {apiKey.syncFailureCount > 0 && (
        <Badge variant="destructive" className="text-xs">
          동기화 실패 {apiKey.syncFailureCount}회
        </Badge>
      )}
    </div>
  );
}