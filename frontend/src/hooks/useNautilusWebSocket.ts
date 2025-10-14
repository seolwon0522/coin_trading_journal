/**
 * Nautilus WebSocket Hook
 * Nautilus Trading Service WebSocket 연결을 관리하고 실시간 데이터를 처리합니다.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface BacktestProgress {
  type: 'backtest_progress';
  stage: string;
  progress: number;
  message: string;
  long_trades?: number;
  short_trades?: number;
  total_trades?: number;
  win_rate?: number;
  total_bars?: number;
  strategy_type?: string;
  symbol?: string;
  timestamp?: string;
}

export interface StrategyEvent {
  type: string;
  channel: string;
  data: any;
  timestamp?: string;
}

export type NautilusMessage = BacktestProgress | StrategyEvent;

interface UseNautilusWebSocketOptions {
  channels?: string[];
  onMessage?: (data: NautilusMessage) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
  onOpen?: () => void;
  reconnect?: boolean;
  reconnectDelay?: number;
  enabled?: boolean;
}

const NAUTILUS_WS_BASE_URL = process.env.NEXT_PUBLIC_NAUTILUS_WS_URL || 'ws://localhost:8001/ws/trading';

export function useNautilusWebSocket({
  channels = [],
  onMessage,
  onError,
  onClose,
  onOpen,
  reconnect = true,
  reconnectDelay = 3000,
  enabled = true,
}: UseNautilusWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<NautilusMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(true);
  const mountedRef = useRef(true);

  const subscribe = useCallback((channelList: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[Nautilus WS] Cannot subscribe: WebSocket not connected');
      return;
    }

    channelList.forEach(channel => {
      const message = JSON.stringify({
        type: 'subscribe',
        channel: channel
      });
      wsRef.current?.send(message);
      console.log('[Nautilus WS] Subscribed to channel:', channel);
    });
  }, []);

  const unsubscribe = useCallback((channelList: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    channelList.forEach(channel => {
      const message = JSON.stringify({
        type: 'unsubscribe',
        channel: channel
      });
      wsRef.current?.send(message);
      console.log('[Nautilus WS] Unsubscribed from channel:', channel);
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      // WebSocket 비활성화
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    mountedRef.current = true;
    shouldConnectRef.current = true;

    const connect = () => {
      if (!shouldConnectRef.current || !mountedRef.current) return;

      // Cleanup previous connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      try {
        console.log('[Nautilus WS] Connecting to:', NAUTILUS_WS_BASE_URL);
        console.log('[Nautilus WS] Environment check:', {
          isSecureContext: window.isSecureContext,
          location: window.location.href,
          protocol: window.location.protocol
        });

        const ws = new WebSocket(NAUTILUS_WS_BASE_URL);
        wsRef.current = ws;
        
        console.log('[Nautilus WS] WebSocket created:', {
          readyState: ws.readyState,
          url: ws.url,
          protocol: ws.protocol
        });

        ws.onopen = () => {
          if (!mountedRef.current) {
            ws.close();
            return;
          }
          console.log('[Nautilus WS] Connected successfully');
          setIsConnected(true);
          onOpen?.();

          // Send ping message to keep connection alive
          try {
            ws.send(JSON.stringify({ type: 'ping' }));
            console.log('[Nautilus WS] Sent ping message');
          } catch (error) {
            console.error('[Nautilus WS] Failed to send ping:', error);
          }

          // Subscribe to channels after connection
          if (channels.length > 0) {
            subscribe(channels);
          }
        };

        ws.onmessage = (event) => {
          if (!mountedRef.current) return;

          try {
            const data = JSON.parse(event.data) as NautilusMessage;
            setLastMessage(data);
            onMessage?.(data);

            // Log specific message types
            if (data.type === 'backtest_progress') {
              console.log('[Nautilus WS] Backtest progress:', data.stage, data.progress + '%');
            }
          } catch (error) {
            console.error('[Nautilus WS] Parse error:', error instanceof Error ? error.message : 'Unknown error');
          }
        };

        ws.onerror = (event) => {
          if (!mountedRef.current) return;

          console.error('[Nautilus WS] WebSocket error occurred', {
            type: event.type,
            target: event.target,
            currentTarget: event.currentTarget,
            event: event
          });
          
          if (event instanceof ErrorEvent) {
            console.error('[Nautilus WS] Error message:', event.message);
            console.error('[Nautilus WS] Error filename:', event.filename);
            console.error('[Nautilus WS] Error lineno:', event.lineno);
            console.error('[Nautilus WS] Error colno:', event.colno);
          }
          
          // Log WebSocket state
          console.error('[Nautilus WS] WebSocket state:', {
            readyState: ws.readyState,
            url: ws.url,
            protocol: ws.protocol,
            extensions: ws.extensions
          });
          
          onError?.(event);
        };

        ws.onclose = (event) => {
          if (!mountedRef.current) return;

          console.log('[Nautilus WS] Disconnected', {
            code: event.code,
            reason: event.reason || 'No reason provided',
            wasClean: event.wasClean
          });
          setIsConnected(false);
          onClose?.();

          // 재연결 시도
          if (reconnect && shouldConnectRef.current && mountedRef.current) {
            console.log(`[Nautilus WS] Reconnecting in ${reconnectDelay}ms...`);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                connect();
              }
            }, reconnectDelay);
          }
        };
      } catch (error) {
        console.error('[Nautilus WS] Connection error:', error instanceof Error ? error.message : 'Unknown error');
      }
    };

    connect();

    // Cleanup
    return () => {
      mountedRef.current = false;
      shouldConnectRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, reconnect, reconnectDelay, onMessage, onError, onClose, onOpen, channels, subscribe]);

  return {
    isConnected,
    lastMessage,
    ws: wsRef.current,
    subscribe,
    unsubscribe,
  };
}
