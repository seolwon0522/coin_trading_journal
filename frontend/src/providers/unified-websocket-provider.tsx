'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, PropsWithChildren } from 'react';
import { toast } from 'sonner';

// ==================== Types ====================

export type WebSocketSource = 'binance' | 'nautilus';

export interface WebSocketMessage {
  source: WebSocketSource;
  channel: string;
  data: any;
  timestamp: string;
}

type SubscriptionCallback = (data: any) => void;

interface SubscriptionEntry {
  callbacks: Set<SubscriptionCallback>;
}

interface ConnectionState {
  socket: WebSocket | null;
  isConnected: boolean;
  reconnectAttempts: number;
  reconnectTimeout: NodeJS.Timeout | null;
  messageQueue: string[];
}

interface UnifiedWebSocketContextValue {
  subscribe: (source: WebSocketSource, channel: string, params: Record<string, any>, callback: SubscriptionCallback) => () => void;
  isConnected: (source: WebSocketSource) => boolean;
  reconnect: (source: WebSocketSource) => void;
  getStats: () => { binance: any; nautilus: any };
}

// ==================== Constants ====================

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 3000;
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/stream?streams=';
const NAUTILUS_WS_URL = process.env.NEXT_PUBLIC_NAUTILUS_WS_URL || 'ws://localhost:8002/ws/trading';

// ==================== Context ====================

const UnifiedWebSocketContext = createContext<UnifiedWebSocketContextValue | undefined>(undefined);

// ==================== Provider ====================

export const UnifiedWebSocketProvider = ({ children }: PropsWithChildren) => {
  // Connection states
  const binanceRef = useRef<ConnectionState>({
    socket: null,
    isConnected: false,
    reconnectAttempts: 0,
    reconnectTimeout: null,
    messageQueue: [],
  });

  const nautilusRef = useRef<ConnectionState>({
    socket: null,
    isConnected: false,
    reconnectAttempts: 0,
    reconnectTimeout: null,
    messageQueue: [],
  });

  // Subscriptions: "source:channel:params" -> { callbacks: Set<Function> }
  const subscriptionsRef = useRef<Map<string, SubscriptionEntry>>(new Map());

  // Binance active streams
  const binanceStreamsRef = useRef<Set<string>>(new Set());

  // State (for React re-renders)
  const [binanceConnected, setBinanceConnected] = useState(false);
  const [nautilusConnected, setNautilusConnected] = useState(false);

  // Manual disconnect flags
  const binanceManualDisconnect = useRef(false);
  const nautilusManualDisconnect = useRef(false);

  // ==================== Binance Connection ====================

  const connectBinance = useCallback(() => {
    const state = binanceRef.current;
    binanceManualDisconnect.current = false;

    // Already connected
    if (state.socket?.readyState === WebSocket.OPEN) return;

    // No streams to subscribe
    const streams = Array.from(binanceStreamsRef.current);
    if (streams.length === 0) {
      console.log('[Binance WS] No streams, skipping connection');
      return;
    }

    // Close existing connection
    if (state.socket) {
      state.socket.close();
      state.socket = null;
    }

    const url = BINANCE_WS_URL + streams.join('/');
    console.log('[Binance WS] Connecting...', { streams });

    const socket = new WebSocket(url);
    state.socket = socket;

    socket.onopen = () => {
      console.log('[Binance WS] ✅ Connected');
      state.isConnected = true;
      state.reconnectAttempts = 0;
      setBinanceConnected(true);

      // Flush queue
      while (state.messageQueue.length > 0) {
        const msg = state.messageQueue.shift();
        if (msg) socket.send(msg);
      }
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        
        // Binance format: { stream: "btcusdt@ticker", data: {...} }
        if (parsed.stream && parsed.data) {
          const [symbolPart, channelPart] = parsed.stream.split('@');
          const key = buildKey('binance', channelPart, { symbol: symbolPart });
          const entry = subscriptionsRef.current.get(key);
          
          if (entry) {
            const message = {
              ...parsed.data,
              symbol: symbolPart.toUpperCase(),
            };
            entry.callbacks.forEach(cb => cb(message));
          }
        }
      } catch (error) {
        console.error('[Binance WS] Parse error:', error);
      }
    };

    socket.onerror = (error) => {
      console.warn('[Binance WS] Error:', error);
    };

    socket.onclose = (event) => {
      console.log('[Binance WS] Closed:', event.code);
      state.isConnected = false;
      state.socket = null;
      setBinanceConnected(false);

      if (binanceManualDisconnect.current) return;

      // Auto reconnect
      if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS && binanceStreamsRef.current.size > 0) {
        state.reconnectAttempts += 1;
        const delay = Math.min(BASE_RECONNECT_DELAY * state.reconnectAttempts, 30000);
        
        state.reconnectTimeout = setTimeout(() => {
          console.log(`[Binance WS] Reconnecting... (${state.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
          connectBinance();
        }, delay);
      } else if (state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        toast.error('Binance 연결 실패. 페이지를 새로고침 해주세요.');
      }
    };
  }, []);

  // ==================== Nautilus Connection ====================

  const connectNautilus = useCallback(() => {
    const state = nautilusRef.current;
    nautilusManualDisconnect.current = false;

    if (state.socket?.readyState === WebSocket.OPEN) return;

    if (state.socket) {
      state.socket.close();
      state.socket = null;
    }

    console.log('[Nautilus WS] Connecting...');
    const socket = new WebSocket(NAUTILUS_WS_URL);
    state.socket = socket;

    socket.onopen = () => {
      console.log('[Nautilus WS] ✅ Connected');
      state.isConnected = true;
      state.reconnectAttempts = 0;
      setNautilusConnected(true);

      // Flush queue
      while (state.messageQueue.length > 0) {
        const msg = state.messageQueue.shift();
        if (msg) socket.send(msg);
      }

      // Resubscribe
      subscriptionsRef.current.forEach((entry, key) => {
        if (key.startsWith('nautilus:')) {
          const [_, channel, paramsStr] = key.split(':');
          const params = JSON.parse(paramsStr || '{}');
          socket.send(JSON.stringify({ type: 'subscribe', channel, params }));
        }
      });
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        
        // Nautilus format: { channel: "positions", type: "update", data: {...} }
        const channel = parsed.channel || 'unknown';
        const params = parsed.params || {};
        const key = buildKey('nautilus', channel, params);
        const entry = subscriptionsRef.current.get(key);
        
        if (entry) {
          entry.callbacks.forEach(cb => cb(parsed.data || parsed));
        }
      } catch (error) {
        console.error('[Nautilus WS] Parse error:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('[Nautilus WS] Error:', error);
    };

    socket.onclose = () => {
      console.log('[Nautilus WS] Closed');
      state.isConnected = false;
      state.socket = null;
      setNautilusConnected(false);

      if (nautilusManualDisconnect.current) return;

      if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        state.reconnectAttempts += 1;
        const delay = Math.min(BASE_RECONNECT_DELAY * state.reconnectAttempts, 30000);
        
        state.reconnectTimeout = setTimeout(() => {
          console.log(`[Nautilus WS] Reconnecting... (${state.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
          connectNautilus();
        }, delay);
      } else {
        toast.error('Nautilus 연결 실패. 페이지를 새로고침 해주세요.');
      }
    };
  }, []);

  // ==================== Subscribe ====================

  const subscribe = useCallback((
    source: WebSocketSource,
    channel: string,
    params: Record<string, any>,
    callback: SubscriptionCallback
  ) => {
    const key = buildKey(source, channel, params);
    
    let entry = subscriptionsRef.current.get(key);
    if (!entry) {
      entry = { callbacks: new Set() };
      subscriptionsRef.current.set(key, entry);

      // Handle source-specific subscription
      if (source === 'binance') {
        const symbol = params.symbol?.toLowerCase() || '';
        const stream = `${symbol}@${channel}`;
        const wasEmpty = binanceStreamsRef.current.size === 0;
        binanceStreamsRef.current.add(stream);
        
        if (wasEmpty || !binanceRef.current.isConnected) {
          connectBinance();
        } else {
          // Need to reconnect with new stream
          binanceManualDisconnect.current = true;
          binanceRef.current.socket?.close();
          setTimeout(() => connectBinance(), 100);
        }
      } else if (source === 'nautilus') {
        if (!nautilusRef.current.isConnected) {
          connectNautilus();
        } else {
          // Send subscribe message
          nautilusRef.current.socket?.send(JSON.stringify({
            type: 'subscribe',
            channel,
            params,
          }));
        }
      }
    }

    entry.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      const entry = subscriptionsRef.current.get(key);
      if (!entry) return;

      entry.callbacks.delete(callback);

      // If no more callbacks, remove subscription
      if (entry.callbacks.size === 0) {
        subscriptionsRef.current.delete(key);

        if (source === 'binance') {
          const symbol = params.symbol?.toLowerCase() || '';
          const stream = `${symbol}@${channel}`;
          binanceStreamsRef.current.delete(stream);
          
          if (binanceStreamsRef.current.size === 0) {
            binanceManualDisconnect.current = true;
            binanceRef.current.socket?.close();
          } else {
            // Reconnect with updated streams
            binanceManualDisconnect.current = true;
            binanceRef.current.socket?.close();
            setTimeout(() => connectBinance(), 100);
          }
        } else if (source === 'nautilus') {
          nautilusRef.current.socket?.send(JSON.stringify({
            type: 'unsubscribe',
            channel,
            params,
          }));
        }
      }
    };
  }, [connectBinance, connectNautilus]);

  // ==================== Utilities ====================

  const isConnected = useCallback((source: WebSocketSource) => {
    return source === 'binance' ? binanceConnected : nautilusConnected;
  }, [binanceConnected, nautilusConnected]);

  const reconnect = useCallback((source: WebSocketSource) => {
    if (source === 'binance') {
      binanceManualDisconnect.current = true;
      const state = binanceRef.current;
      if (state.reconnectTimeout) clearTimeout(state.reconnectTimeout);
      state.socket?.close();
      state.reconnectAttempts = 0;
      setTimeout(() => connectBinance(), 100);
    } else {
      nautilusManualDisconnect.current = true;
      const state = nautilusRef.current;
      if (state.reconnectTimeout) clearTimeout(state.reconnectTimeout);
      state.socket?.close();
      state.reconnectAttempts = 0;
      setTimeout(() => connectNautilus(), 100);
    }
  }, [connectBinance, connectNautilus]);

  const getStats = useCallback(() => {
    return {
      binance: {
        isConnected: binanceRef.current.isConnected,
        reconnectAttempts: binanceRef.current.reconnectAttempts,
        activeStreams: binanceStreamsRef.current.size,
        subscriptionCount: Array.from(subscriptionsRef.current.keys())
          .filter(k => k.startsWith('binance:')).length,
      },
      nautilus: {
        isConnected: nautilusRef.current.isConnected,
        reconnectAttempts: nautilusRef.current.reconnectAttempts,
        subscriptionCount: Array.from(subscriptionsRef.current.keys())
          .filter(k => k.startsWith('nautilus:')).length,
      },
    };
  }, []);

  // ==================== Cleanup ====================

  useEffect(() => {
    // Initialize Nautilus connection on mount
    connectNautilus();

    return () => {
      // Cleanup on unmount
      binanceManualDisconnect.current = true;
      nautilusManualDisconnect.current = true;

      const binanceState = binanceRef.current;
      const nautilusState = nautilusRef.current;

      if (binanceState.reconnectTimeout) clearTimeout(binanceState.reconnectTimeout);
      if (nautilusState.reconnectTimeout) clearTimeout(nautilusState.reconnectTimeout);

      binanceState.socket?.close();
      nautilusState.socket?.close();
    };
  }, [connectNautilus]);

  // ==================== Context Value ====================

  const value = useMemo<UnifiedWebSocketContextValue>(() => ({
    subscribe,
    isConnected,
    reconnect,
    getStats,
  }), [subscribe, isConnected, reconnect, getStats]);

  return (
    <UnifiedWebSocketContext.Provider value={value}>
      {children}
    </UnifiedWebSocketContext.Provider>
  );
};

// ==================== Hook ====================

export const useUnifiedWebSocket = () => {
  const context = useContext(UnifiedWebSocketContext);
  if (!context) {
    throw new Error('useUnifiedWebSocket must be used within UnifiedWebSocketProvider');
  }
  return context;
};

// ==================== Helper Functions ====================

function buildKey(source: WebSocketSource, channel: string, params: Record<string, any>): string {
  const paramsStr = JSON.stringify(params || {});
  return `${source}:${channel}:${paramsStr}`;
}

// ==================== Specialized Hooks ====================

/**
 * Binance Ticker Hook
 */
export function useTicker(symbol: string) {
  const { subscribe, isConnected } = useUnifiedWebSocket();
  const [ticker, setTicker] = useState<any>(null);

  useEffect(() => {
    if (!symbol) return;

    const unsubscribe = subscribe('binance', 'ticker', { symbol: symbol.toLowerCase() }, setTicker);
    return unsubscribe;
  }, [symbol, subscribe]);

  return {
    ticker,
    isConnected: isConnected('binance'),
    currentPrice: ticker ? parseFloat(ticker.c || '0') : 0,
    priceChange: ticker ? parseFloat(ticker.p || '0') : 0,
    priceChangePercent: ticker ? parseFloat(ticker.P || '0') : 0,
    volume: ticker ? parseFloat(ticker.v || '0') : 0,
    quoteVolume: ticker ? parseFloat(ticker.q || '0') : 0,
  };
}

/**
 * Binance Orderbook Hook
 */
export function useOrderbook(symbol: string, limit: number = 20) {
  const { subscribe, isConnected } = useUnifiedWebSocket();
  const [orderbook, setOrderbook] = useState<any>(null);

  useEffect(() => {
    if (!symbol) return;

    const channel = `depth${limit}`;
    const unsubscribe = subscribe('binance', channel, { symbol: symbol.toLowerCase() }, setOrderbook);
    return unsubscribe;
  }, [symbol, limit, subscribe]);

  return {
    orderbook,
    bids: orderbook?.b || [],
    asks: orderbook?.a || [],
    isConnected: isConnected('binance'),
  };
}

/**
 * Nautilus Positions Hook
 */
export function useNautilusPositions(strategyId?: string) {
  const { subscribe, isConnected } = useUnifiedWebSocket();
  const [positions, setPositions] = useState<any[]>([]);

  const handlePositionUpdate = useCallback((data: any) => {
    setPositions((prev) => {
      const positionId = data.position_id || data.id;
      if (!positionId) return [...prev, data];

      const index = prev.findIndex((p) => (p.position_id || p.id) === positionId);
      if (index >= 0) {
        const next = [...prev];
        next[index] = data;
        return next;
      }
      return [...prev, data];
    });
  }, []);

  useEffect(() => {
    const params = strategyId ? { strategy_id: strategyId } : {};
    const unsubscribe = subscribe('nautilus', 'positions', params, handlePositionUpdate);
    return unsubscribe;
  }, [strategyId, subscribe, handlePositionUpdate]);

  return {
    positions,
    isConnected: isConnected('nautilus'),
  };
}

/**
 * Nautilus Strategy Status Hook
 */
export function useNautilusStrategy(strategyId: string) {
  const { subscribe, isConnected } = useUnifiedWebSocket();
  const [status, setStatus] = useState<any>(null);

  const handleStrategyUpdate = useCallback((data: any) => {
    if (data.strategy_id === strategyId) {
      setStatus(data);
    }
  }, [strategyId]);

  useEffect(() => {
    if (!strategyId) return;

    const unsubscribe = subscribe('nautilus', 'strategies', { strategy_id: strategyId }, handleStrategyUpdate);
    return unsubscribe;
  }, [strategyId, subscribe, handleStrategyUpdate]);

  return {
    status,
    isConnected: isConnected('nautilus'),
  };
}

/**
 * Nautilus Trades Hook
 */
export function useNautilusTrades(strategyId?: string, limit: number = 100) {
  const { subscribe, isConnected } = useUnifiedWebSocket();
  const [trades, setTrades] = useState<any[]>([]);

  const handleTradeUpdate = useCallback((data: any) => {
    setTrades((prev) => [data, ...prev].slice(0, limit));
  }, [limit]);

  useEffect(() => {
    const params = strategyId ? { strategy_id: strategyId } : {};
    const unsubscribe = subscribe('nautilus', 'trades', params, handleTradeUpdate);
    return unsubscribe;
  }, [strategyId, subscribe, handleTradeUpdate]);

  return {
    trades,
    isConnected: isConnected('nautilus'),
  };
}

/**
 * Nautilus Orders Hook
 */
export function useNautilusOrders(strategyId?: string) {
  const { subscribe, isConnected } = useUnifiedWebSocket();
  const [orders, setOrders] = useState<any[]>([]);

  const handleOrderUpdate = useCallback((data: any) => {
    setOrders((prev) => {
      const orderId = data.order_id || data.id;
      if (!orderId) return [...prev, data];

      const index = prev.findIndex((o) => (o.order_id || o.id) === orderId);
      if (index >= 0) {
        const next = [...prev];
        next[index] = data;
        return next;
      }
      return [data, ...prev];
    });
  }, []);

  useEffect(() => {
    const params = strategyId ? { strategy_id: strategyId } : {};
    const unsubscribe = subscribe('nautilus', 'orders', params, handleOrderUpdate);
    return unsubscribe;
  }, [strategyId, subscribe, handleOrderUpdate]);

  return {
    orders,
    isConnected: isConnected('nautilus'),
  };
}

/**
 * Binance Kline/Candle Hook
 */
export function useKlines(symbol: string, interval: string = '1m') {
  const { subscribe, isConnected } = useUnifiedWebSocket();
  const [kline, setKline] = useState<any>(null);

  useEffect(() => {
    if (!symbol) return;

    const channel = `kline_${interval}`;
    const unsubscribe = subscribe('binance', channel, { symbol: symbol.toLowerCase() }, (data) => {
      setKline(data.k); // Binance sends kline data in 'k' field
    });
    return unsubscribe;
  }, [symbol, interval, subscribe]);

  return {
    kline,
    isConnected: isConnected('binance'),
  };
}
