'use client';

/**
 * Orderbook Hook - Re-exported from unified WebSocket provider
 * 
 * 이 파일은 호환성을 위해 유지되며, unified-websocket-provider의 useOrderbook을 재수출합니다.
 */

export { useOrderbook as useBinanceOrderBook } from '@/providers/unified-websocket-provider';

// Default export for compatibility
export { useOrderbook as default } from '@/providers/unified-websocket-provider';