import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface NautilusMessage {
  type: 'ticker' | 'position' | 'order' | 'strategy_status' | 'error';
  data: any;
  timestamp?: string;
}

interface UseNautilusWebSocketOptions {
  enabled?: boolean;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export const useNautilusWebSocket = (options?: UseNautilusWebSocketOptions) => {
  const {
    enabled = true,
    autoReconnect = true,
    reconnectDelay = 5000,
    maxReconnectAttempts = 10
  } = options || {};

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<NautilusMessage | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const clientId = useRef(Math.random().toString(36).substring(7));

  // Subscribe to channels
  const subscribe = useCallback((channel: string, params: Record<string, any> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        channel,
        params
      }));
    }
  }, []);

  // Unsubscribe from channels
  const unsubscribe = useCallback((channel: string, params: Record<string, any> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        channel,
        params
      }));
    }
  }, []);

  // Send custom message
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      // Nautilus Service WebSocket endpoint
      const wsUrl = process.env.NEXT_PUBLIC_NAUTILUS_WS_URL || 'ws://localhost:8002/ws';
      wsRef.current = new WebSocket(`${wsUrl}/${clientId.current}`);

      wsRef.current.onopen = () => {
        console.log('Connected to Nautilus WebSocket');
        setIsConnected(true);
        setReconnectAttempts(0);

        // Auto-subscribe to default channels
        setTimeout(() => {
          subscribe('heartbeat', {});
        }, 100);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as NautilusMessage;
          setLastMessage(message);

          // Handle specific message types
          switch (message.type) {
            case 'ticker':
              // Update ticker data in global state or context
              console.log('Ticker update:', message.data);
              break;
            case 'position':
              // Update position data
              console.log('Position update:', message.data);
              break;
            case 'strategy_status':
              // Update strategy status
              console.log('Strategy status:', message.data);
              break;
            case 'error':
              toast.error(`Nautilus error: ${message.data.message}`);
              break;
            default:
              console.log('Unknown message type:', message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('WebSocket 연결 오류');
      };

      wsRef.current.onclose = () => {
        console.log('Disconnected from Nautilus WebSocket');
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect logic
        if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
          setReconnectAttempts(prev => prev + 1);
          const delay = reconnectDelay * Math.min(reconnectAttempts + 1, 5);

          console.log(`Reconnecting in ${delay / 1000} seconds... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  }, [enabled, autoReconnect, reconnectAttempts, maxReconnectAttempts, reconnectDelay, subscribe]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Initialize connection
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled]);

  return {
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe,
    sendMessage,
    reconnect: connect,
    disconnect,
    reconnectAttempts
  };
};

// Specialized hooks for specific data streams
export const useNautilusTicker = (symbol: string) => {
  const { isConnected, lastMessage, subscribe, unsubscribe } = useNautilusWebSocket();
  const [tickerData, setTickerData] = useState<any>(null);

  useEffect(() => {
    if (isConnected && symbol) {
      subscribe('ticker', { symbol });

      return () => {
        unsubscribe('ticker', { symbol });
      };
    }
  }, [isConnected, symbol, subscribe, unsubscribe]);

  useEffect(() => {
    if (lastMessage?.type === 'ticker' && lastMessage.data?.symbol === symbol) {
      setTickerData(lastMessage.data);
    }
  }, [lastMessage, symbol]);

  return { tickerData, isConnected };
};

export const useNautilusPositions = (strategyId?: string) => {
  const { isConnected, lastMessage, subscribe, unsubscribe } = useNautilusWebSocket();
  const [positions, setPositions] = useState<any[]>([]);

  useEffect(() => {
    if (isConnected) {
      const params = strategyId ? { strategy_id: strategyId } : {};
      subscribe('positions', params);

      return () => {
        unsubscribe('positions', params);
      };
    }
  }, [isConnected, strategyId, subscribe, unsubscribe]);

  useEffect(() => {
    if (lastMessage?.type === 'position') {
      setPositions(prev => {
        const updated = [...prev];
        const index = updated.findIndex(p => p.id === lastMessage.data.id);

        if (index >= 0) {
          updated[index] = lastMessage.data;
        } else {
          updated.push(lastMessage.data);
        }

        return updated;
      });
    }
  }, [lastMessage]);

  return { positions, isConnected };
};

export const useNautilusStrategyStatus = (strategyId: string) => {
  const { isConnected, lastMessage, subscribe, unsubscribe } = useNautilusWebSocket();
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (isConnected && strategyId) {
      subscribe('strategy_status', { strategy_id: strategyId });

      return () => {
        unsubscribe('strategy_status', { strategy_id: strategyId });
      };
    }
  }, [isConnected, strategyId, subscribe, unsubscribe]);

  useEffect(() => {
    if (lastMessage?.type === 'strategy_status' &&
        lastMessage.data?.strategy_id === strategyId) {
      setStatus(lastMessage.data);
    }
  }, [lastMessage, strategyId]);

  return { status, isConnected };
};