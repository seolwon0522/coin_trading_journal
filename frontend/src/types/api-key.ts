/**
 * API 키 관련 타입 정의
 */

// 거래소 타입
export type Exchange = 'BINANCE' | 'UPBIT' | 'BITHUMB';

// API 키 응답 타입
export interface ApiKey {
  id: number;
  exchange: Exchange;
  keyName?: string;
  apiKeyMasked: string;
  isActive: boolean;
  canTrade: boolean;
  canWithdraw: boolean;
  lastUsedAt?: string;
  lastSyncAt?: string;
  syncFailureCount: number;
  createdAt: string;
}

// API 키 생성/수정 요청 타입
export interface ApiKeyRequest {
  exchange: Exchange;
  apiKey: string;
  secretKey: string;
  keyName?: string;
  isActive?: boolean;
  canTrade?: boolean;
}

// 거래 동기화 요청 타입
export interface TradeSyncRequest {
  symbols?: string[];
  startTime?: number;
  endTime?: number;
  limit?: number;
}

// 거래 동기화 응답 타입
export interface TradeSyncResponse {
  totalProcessed: number;
  newTrades: number;
  duplicates: number;
  errors: string[];
  syncTime: string;
  totalManualTrades?: number;
  totalApiTrades?: number;
  potentialDuplicates?: number;
  lastSyncTime?: string;
}

// 동기화 상태 타입
export interface SyncStatus {
  syncId: string;
  status: 'NOT_FOUND' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  message: string;
  progress: number;
  timestamp: string;
}