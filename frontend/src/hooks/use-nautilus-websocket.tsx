'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type NautilusEvent = {
  channel: string;
  type?: string;
  data?: any;
  timestamp?: string;
};

type SubscriptionEntry = {
  channel: string;
  params: Record<string, any>;
  count: number;
};

type NautilusRealtimeContextValue = {
  isConnected: boolean;
  lastEvent: NautilusEvent | null;
  subscribe: (channel: string, params?: Record<string, any>) => void;
  unsubscribe: (channel: string, params?: Record<string, any>) => void;
  sendMessage: (payload: any) => void;
  reconnect: () => void;
  disconnect: () => void;
  reconnectAttempts: number;
};

const NautilusRealtimeContext = createContext<NautilusRealtimeContextValue | undefined>(undefined);

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 5000;

const buildSubscriptionKey = (channel: string, params?: Record<string, any>) => {
  const normalizedParams = params ? JSON.stringify(params) : '{}';
  return `${channel}:${normalizedParams}`;
};

export const NautilusRealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const manualDisconnectRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const queueRef = useRef<string[]>([]);
  const subscriptionsRef = useRef<Map<string, SubscriptionEntry>>(new Map());

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<NautilusEvent | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const flushQueue = useCallback(() => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    while (queueRef.current.length > 0) {
      const message = queueRef.current.shift();
      if (message) {
        socket.send(message);
      }
    }
  }, []);

  const sendRaw = useCallback((payload: any) => {
    try {
      const serialized = JSON.stringify(payload);
      const socket = wsRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(serialized);
      } else {
        queueRef.current.push(serialized);
      }
    } catch (error) {
      console.error('Failed to serialize Nautilus payload', error);
    }
  }, []);

  const sendSubscribeMessage = useCallback(
    (entry: SubscriptionEntry) => {
      sendRaw({ type: 'subscribe', channel: entry.channel, params: entry.params });
    },
    [sendRaw]
  );

  const sendUnsubscribeMessage = useCallback(
    (entry: SubscriptionEntry) => {
      sendRaw({ type: 'unsubscribe', channel: entry.channel, params: entry.params });
    },
    [sendRaw]
  );

  const subscribe = useCallback(
    (channel: string, params: Record<string, any> = {}) => {
      const key = buildSubscriptionKey(channel, params);
      const map = subscriptionsRef.current;
      const existing = map.get(key);

      if (existing) {
        existing.count += 1;
        map.set(key, existing);
        return;
      }

      const entry: SubscriptionEntry = { channel, params, count: 1 };
      map.set(key, entry);

      if (isConnected) {
        sendSubscribeMessage(entry);
      }
    },
    [isConnected, sendSubscribeMessage]
  );

  const unsubscribe = useCallback(
    (channel: string, params: Record<string, any> = {}) => {
      const key = buildSubscriptionKey(channel, params);
      const map = subscriptionsRef.current;
      const existing = map.get(key);
      if (!existing) return;

      existing.count -= 1;
      if (existing.count <= 0) {
        map.delete(key);
        if (isConnected) {
          sendUnsubscribeMessage(existing);
        } else {
          sendRaw({ type: 'unsubscribe', channel, params });
        }
      } else {
        map.set(key, existing);
      }
    },
    [isConnected, sendRaw, sendUnsubscribeMessage]
  );

  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    manualDisconnectRef.current = false;

    const current = wsRef.current;
    if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const endpoint = process.env.NEXT_PUBLIC_NAUTILUS_WS_URL || 'ws://localhost:8002/ws/trading';
    const socket = new WebSocket(endpoint);
    wsRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setReconnectAttempts(0);
      reconnectAttemptsRef.current = 0;
      flushQueue();
      subscriptionsRef.current.forEach((entry) => {
        if (entry.count > 0) {
          sendSubscribeMessage(entry);
        }
      });
      console.info('Connected to Nautilus WebSocket');
    };

    socket.onmessage = (event) => {
      try {
        const parsed: NautilusEvent = JSON.parse(event.data);
        setLastEvent(parsed);
      } catch (error) {
        console.error('Failed to parse Nautilus message', error);
      }
    };

    socket.onerror = (error) => {
      console.error('Nautilus WebSocket error', error);
    };

    socket.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      if (manualDisconnectRef.current) {
        return;
      }

      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current += 1;
        const attempt = reconnectAttemptsRef.current;
        setReconnectAttempts(attempt);
        const delay = Math.min(BASE_RECONNECT_DELAY * attempt, 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current();
        }, delay);
      } else {
        toast.error('Nautilus WebSocket ?곌껐??諛섎났?곸쑝濡??ㅽ뙣?덉뒿?덈떎.');
      }
    };
  }, [flushQueue, sendSubscribeMessage]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      manualDisconnectRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  useEffect(() => {
    subscribe('heartbeat', {});
    return () => unsubscribe('heartbeat', {});
  }, [subscribe, unsubscribe]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    const socket = wsRef.current;
    if (socket) {
      socket.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    const socket = wsRef.current;
    if (socket) {
      socket.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setReconnectAttempts(0);
    reconnectAttemptsRef.current = 0;
    connectRef.current();
  }, []);

  const value = useMemo<NautilusRealtimeContextValue>(
    () => ({
      isConnected,
      lastEvent,
      subscribe,
      unsubscribe,
      sendMessage: sendRaw,
      reconnect,
      disconnect,
      reconnectAttempts,
    }),
    [disconnect, isConnected, lastEvent, reconnect, reconnectAttempts, sendRaw, subscribe, unsubscribe]
  );

  return <NautilusRealtimeContext.Provider value={value}>{children}</NautilusRealtimeContext.Provider>;
};

export const useNautilusWebSocket = () => {
  const ctx = useContext(NautilusRealtimeContext);
  if (!ctx) {
    throw new Error('useNautilusWebSocket must be used within NautilusRealtimeProvider');
  }
  return ctx;
};

export const useNautilusTicker = (symbol: string) => {
  const { isConnected, lastEvent, subscribe, unsubscribe } = useNautilusWebSocket();
  const [tickerData, setTickerData] = useState<any>(null);

  useEffect(() => {
    if (!symbol) return;
    subscribe('ticker', { symbol });
    return () => unsubscribe('ticker', { symbol });
  }, [symbol, subscribe, unsubscribe]);

  useEffect(() => {
    if (lastEvent?.channel === 'ticker' && lastEvent.data?.symbol === symbol) {
      setTickerData(lastEvent.data);
    }
  }, [lastEvent, symbol]);

  return { tickerData, isConnected };
};

export const useNautilusPositions = (strategyId?: string) => {
  const { isConnected, lastEvent, subscribe, unsubscribe } = useNautilusWebSocket();
  const [positions, setPositions] = useState<any[]>([]);

  useEffect(() => {
    const params = strategyId ? { strategy_id: strategyId } : {};
    subscribe('positions', params);
    return () => unsubscribe('positions', params);
  }, [strategyId, subscribe, unsubscribe]);

  useEffect(() => {
    if (lastEvent?.channel === 'positions' && lastEvent.data) {
      const payload = lastEvent.data;
      setPositions((prev) => {
        const next = [...prev];
        const index = next.findIndex(
          (item) => item.position_id === payload.position_id || item.id === payload.id
        );
        if (index >= 0) {
          next[index] = payload;
        } else {
          next.push(payload);
        }
        return next;
      });
    }
  }, [lastEvent]);

  return { positions, isConnected };
};

export const useNautilusStrategyStatus = (strategyId: string) => {
  const { isConnected, lastEvent, subscribe, unsubscribe } = useNautilusWebSocket();
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (!strategyId) return;
    subscribe('strategies', { strategy_id: strategyId });
    return () => unsubscribe('strategies', { strategy_id: strategyId });
  }, [strategyId, subscribe, unsubscribe]);

  useEffect(() => {
    if (lastEvent?.channel === 'strategies' && lastEvent.data?.strategy_id === strategyId) {
      setStatus(lastEvent.data);
    }
  }, [lastEvent, strategyId]);

  return { status, isConnected };
};
