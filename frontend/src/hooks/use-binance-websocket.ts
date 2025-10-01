/**
 * Binance WebSocket Hook
 * 바이낸스 WebSocket 연결을 관리하고 실시간 데이터를 처리합니다.
 */

import { useEffect, useRef, useState, useMemo } from 'react';

interface UseBinanceWebSocketOptions {
  streams: string[];
  onMessage: (data: any) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
  reconnect?: boolean;
  reconnectDelay?: number;
}

const BINANCE_WS_BASE_URL = 'wss://stream.binance.com:9443/ws';

export function useBinanceWebSocket({
  streams,
  onMessage,
  onError,
  onClose,
  reconnect = true,
  reconnectDelay = 3000,
}: UseBinanceWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(true);
  const mountedRef = useRef(true);

  // Memoize stream key for dependency
  const streamKey = useMemo(() => streams.sort().join(','), [streams]);

  useEffect(() => {
    if (!streams || streams.length === 0) return;

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
        // WebSocket URL 생성
        // Binance uses: wss://stream.binance.com:9443/ws/streamName for single stream
        // or wss://stream.binance.com:9443/stream?streams=stream1/stream2 for combined streams
        let wsUrl: string;

        console.log('[Binance WS] Building URL for streams:', streams);

        if (streams.length === 1) {
          // Single stream: /ws/streamName
          wsUrl = `${BINANCE_WS_BASE_URL}/${streams[0]}`;
        } else {
          // Multiple streams: /stream?streams=stream1/stream2/stream3
          const streamPath = streams.join('/');
          wsUrl = `wss://stream.binance.com:9443/stream?streams=${streamPath}`;
        }

        console.log('[Binance WS] Final URL:', wsUrl);
        console.log('[Binance WS] Attempting connection...');

        // WebSocket 연결
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        console.log('[Binance WS] WebSocket object created, readyState:', ws.readyState);

        ws.onopen = () => {
          if (!mountedRef.current) {
            ws.close();
            return;
          }
          console.log('[Binance WS] Connected successfully');
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          if (!mountedRef.current) return;

          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (error) {
            console.error('[Binance WS] Parse error:', error instanceof Error ? error.message : 'Unknown error');
          }
        };

        ws.onerror = (event) => {
          if (!mountedRef.current) return;

          console.error('[Binance WS] WebSocket error occurred');
          if (event instanceof ErrorEvent) {
            console.error('[Binance WS] Error message:', event.message);
          }
          onError?.(event);
        };

        ws.onclose = (event) => {
          if (!mountedRef.current) return;

          console.log('[Binance WS] Disconnected', {
            code: event.code,
            reason: event.reason || 'No reason provided',
            wasClean: event.wasClean
          });
          setIsConnected(false);
          onClose?.();

          // 재연결 시도
          if (reconnect && shouldConnectRef.current && mountedRef.current) {
            console.log(`[Binance WS] Reconnecting in ${reconnectDelay}ms...`);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                connect();
              }
            }, reconnectDelay);
          }
        };
      } catch (error) {
        console.error('[Binance WS] Connection error:', error instanceof Error ? error.message : 'Unknown error');
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
  }, [streamKey, reconnect, reconnectDelay, onMessage, onError, onClose]);

  return {
    isConnected,
    ws: wsRef.current,
  };
}

