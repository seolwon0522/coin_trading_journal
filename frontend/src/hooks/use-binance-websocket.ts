'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

export interface BinanceWebSocketOptions {
  streams: string[];
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectInterval?: number;
  enabled?: boolean;
}

export function useBinanceWebSocket({
  streams,
  onMessage,
  onError,
  onOpen,
  onClose,
  reconnectInterval = 5000,
  enabled = true,
}: BinanceWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const mountedRef = useRef(true);
  const intentionalCloseRef = useRef(false);
  const reconnectAttemptsRef = useRef(0); // Use ref to avoid dependency issues
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current || streams.length === 0) return;

    // Prevent multiple simultaneous connections
    if (wsRef.current?.readyState === WebSocket.CONNECTING ||
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Clean up existing connection
      if (wsRef.current) {
        intentionalCloseRef.current = true;
        wsRef.current.close();
        wsRef.current = null;
      }

      // Create WebSocket URL for multiple streams
      const streamNames = streams.join('/');
      // Use the correct Binance WebSocket endpoint without port
      const wsUrl = `wss://stream.binance.com/stream?streams=${streamNames}`;

      console.log('Attempting to connect to Binance WebSocket:', {
        streams: streams,
        streamNames: streamNames,
        url: wsUrl
      });

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('✅ Binance WebSocket connected successfully', {
          url: wsUrl,
          readyState: ws.readyState,
          streams: streams,
          timestamp: new Date().toISOString()
        });
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempts(0);
        reconnectAttemptsRef.current = 0;
        intentionalCloseRef.current = false;

        // Binance WebSocket handles ping/pong automatically
        // We don't need manual ping messages

        onOpen?.();
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        if (!mountedRef.current) return;
        // WebSocket error 이벤트는 상세 정보를 제공하지 않으므로,
        // readyState와 URL을 함께 로깅
        console.error('Binance WebSocket error occurred', {
          readyState: ws.readyState,
          url: wsUrl,
          error: error,
          type: error.type,
          streams: streams
        });
        onError?.(error);
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;

        // Provide meaningful close code descriptions
        const closeCodeDescription = {
          1000: 'Normal closure',
          1001: 'Going away',
          1002: 'Protocol error',
          1003: 'Unsupported data',
          1006: 'Abnormal closure (no close frame received)',
          1007: 'Invalid frame payload data',
          1008: 'Policy violation',
          1009: 'Message too big',
          1011: 'Internal server error',
        }[event.code] || 'Unknown reason';

        console.log(`❌ Binance WebSocket disconnected: ${closeCodeDescription}`, {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
          streams: streams,
          timestamp: new Date().toISOString()
        });
        setIsConnected(false);

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = undefined;
        }

        onClose?.();

        // Only attempt reconnect if it wasn't an intentional close
        if (enabled && !intentionalCloseRef.current && mountedRef.current &&
            reconnectAttemptsRef.current < maxReconnectAttempts) {
          setIsReconnecting(true);

          // Exponential backoff with jitter
          const backoffDelay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttemptsRef.current) +
            Math.random() * 1000,
            30000 // Max 30 seconds
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && enabled) {
              reconnectAttemptsRef.current += 1;
              console.log(`Reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
              setReconnectAttempts(reconnectAttemptsRef.current);
              connect();
            }
          }, backoffDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          setIsReconnecting(false);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
      setIsReconnecting(false);
    }
  }, [streams, enabled, reconnectInterval, onMessage, onError, onOpen, onClose]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = undefined;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsReconnecting(false);
    setReconnectAttempts(0);
    reconnectAttemptsRef.current = 0;
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  // Use useMemo to create stable streams key
  const streamsKey = useMemo(() => streams.join(','), [streams]);

  useEffect(() => {
    mountedRef.current = true;

    if (enabled && streams.length > 0) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [enabled, streamsKey]); // Only react to enabled and streams changes - avoid circular dependency

  return {
    isConnected,
    isReconnecting,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
}