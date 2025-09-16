'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pingIntervalRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);
  const intentionalCloseRef = useRef(false);
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
      const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streamNames}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('Binance WebSocket connected');
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempts(0);
        intentionalCloseRef.current = false;

        // Setup ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ method: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds

        onOpen?.();
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          // Ignore pong responses
          if (data.result === 'pong') return;
          onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        if (!mountedRef.current) return;
        console.error('Binance WebSocket error:', error);
        onError?.(error);
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        console.log('Binance WebSocket disconnected');
        setIsConnected(false);

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = undefined;
        }

        onClose?.();

        // Only attempt reconnect if it wasn't an intentional close
        if (enabled && !intentionalCloseRef.current && mountedRef.current &&
            reconnectAttempts < maxReconnectAttempts) {
          setIsReconnecting(true);

          // Exponential backoff with jitter
          const backoffDelay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttempts) +
            Math.random() * 1000,
            30000 // Max 30 seconds
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && enabled) {
              console.log(`Reconnect attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
              setReconnectAttempts(prev => prev + 1);
              connect();
            }
          }, backoffDelay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          setIsReconnecting(false);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
      setIsReconnecting(false);
    }
  }, [streams, enabled, reconnectInterval, onMessage, onError, onOpen, onClose, reconnectAttempts]);

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
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (enabled && streams.length > 0) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [enabled, streams.join(',')]); // Re-connect when streams change

  return {
    isConnected,
    isReconnecting,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
}