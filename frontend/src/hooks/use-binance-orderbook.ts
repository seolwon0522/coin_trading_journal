'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useBinanceWebSocket } from './use-binance-websocket';

export interface OrderBookLevel {
  price: string;
  quantity: string;
  total?: number;
}

export interface OrderBookData {
  lastUpdateId: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercent: number;
}

interface OrderBookSnapshot {
  lastUpdateId: number;
  bids: string[][];
  asks: string[][];
}

interface OrderBookUpdate {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  U: number; // First update ID in event
  u: number; // Final update ID in event
  b: string[][]; // Bids to be updated
  a: string[][]; // Asks to be updated
}

export function useBinanceOrderBook(symbol: string, limit: number = 20) {
  const [orderBook, setOrderBook] = useState<OrderBookData>({
    lastUpdateId: 0,
    bids: [],
    asks: [],
    spread: 0,
    spreadPercent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());

  const orderBookRef = useRef<Map<string, OrderBookLevel>>(new Map());
  const bidsRef = useRef<Map<string, OrderBookLevel>>(new Map());
  const asksRef = useRef<Map<string, OrderBookLevel>>(new Map());
  const lastUpdateIdRef = useRef<number>(0);
  const snapshotReceivedRef = useRef<boolean>(false);

  const processOrderBookData = useCallback((bids: Map<string, OrderBookLevel>, asks: Map<string, OrderBookLevel>) => {
    // Convert maps to arrays and sort
    const sortedBids = Array.from(bids.values())
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      .slice(0, limit);

    const sortedAsks = Array.from(asks.values())
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
      .slice(0, limit);

    // Calculate spread
    const bestBid = sortedBids[0] ? parseFloat(sortedBids[0].price) : 0;
    const bestAsk = sortedAsks[0] ? parseFloat(sortedAsks[0].price) : 0;
    const spread = bestAsk - bestBid;
    const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;

    // Calculate cumulative totals
    let bidTotal = 0;
    sortedBids.forEach(bid => {
      bidTotal += parseFloat(bid.quantity);
      bid.total = bidTotal;
    });

    let askTotal = 0;
    sortedAsks.forEach(ask => {
      askTotal += parseFloat(ask.quantity);
      ask.total = askTotal;
    });

    setOrderBook({
      lastUpdateId: lastUpdateIdRef.current,
      bids: sortedBids,
      asks: sortedAsks,
      spread,
      spreadPercent,
    });
  }, [limit]);

  const fetchOrderBookSnapshot = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `https://api.binance.com/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch order book: ${response.statusText}`);
      }

      const data: OrderBookSnapshot = await response.json();

      // Clear existing data
      bidsRef.current.clear();
      asksRef.current.clear();

      // Process snapshot
      data.bids.forEach(([price, quantity]) => {
        bidsRef.current.set(price, { price, quantity });
      });

      data.asks.forEach(([price, quantity]) => {
        asksRef.current.set(price, { price, quantity });
      });

      lastUpdateIdRef.current = data.lastUpdateId;
      snapshotReceivedRef.current = true;

      processOrderBookData(bidsRef.current, asksRef.current);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching order book snapshot:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch order book');
      setIsLoading(false);
    }
  }, [symbol, limit, processOrderBookData]);

  const handleWebSocketMessage = useCallback((data: any) => {
    // Binance WebSocket sends data in different formats depending on the stream
    // For combined streams: { stream: "btcusdt@depth", data: {...} }
    // For single stream: {...} directly

    const streamData = data.data || data;

    // depth20@100ms sends snapshot data, not depthUpdate events
    // It has format: { lastUpdateId, bids: [[price, qty], ...], asks: [[price, qty], ...] }
    if (streamData.lastUpdateId && streamData.bids && streamData.asks) {
      // This is a depth snapshot from depth5/10/20 streams

      // Clear and update with snapshot data
      bidsRef.current.clear();
      asksRef.current.clear();

      streamData.bids.forEach(([price, quantity]: [string, string]) => {
        bidsRef.current.set(price, { price, quantity });
      });

      streamData.asks.forEach(([price, quantity]: [string, string]) => {
        asksRef.current.set(price, { price, quantity });
      });

      lastUpdateIdRef.current = streamData.lastUpdateId;
      snapshotReceivedRef.current = true;
      processOrderBookData(bidsRef.current, asksRef.current);
      return;
    }

    // Check if this is a depth update (from @depth stream)
    if (streamData.e === 'depthUpdate') {
      const update: OrderBookUpdate = streamData;

      // Skip updates until we have a snapshot
      if (!snapshotReceivedRef.current) return;

      // Skip old updates
      if (update.u <= lastUpdateIdRef.current) return;

      // Process updates
      update.b.forEach(([price, quantity]) => {
        if (parseFloat(quantity) === 0) {
          bidsRef.current.delete(price);
        } else {
          bidsRef.current.set(price, { price, quantity });
        }
      });

      update.a.forEach(([price, quantity]) => {
        if (parseFloat(quantity) === 0) {
          asksRef.current.delete(price);
        } else {
          asksRef.current.set(price, { price, quantity });
        }
      });

      lastUpdateIdRef.current = update.u;
      processOrderBookData(bidsRef.current, asksRef.current);
    }
  }, [processOrderBookData]);

  // Use depth20@100ms for fast updates with 20 levels
  const { isConnected, isReconnecting } = useBinanceWebSocket({
    streams: [`${symbol.toLowerCase()}@depth20@100ms`], // 100ms updates with 20 levels
    onMessage: handleWebSocketMessage,
    enabled: !!symbol,
  });

  // Fetch initial snapshot when component mounts or symbol changes
  useEffect(() => {
    if (symbol) {
      snapshotReceivedRef.current = false;
      fetchOrderBookSnapshot();
    }
  }, [symbol, fetchOrderBookSnapshot]);

  // Refetch snapshot if WebSocket reconnects
  useEffect(() => {
    if (isConnected && !snapshotReceivedRef.current) {
      fetchOrderBookSnapshot();
    }
  }, [isConnected, fetchOrderBookSnapshot]);

  return {
    orderBook,
    isLoading,
    error,
    isConnected,
    isReconnecting,
    refetch: fetchOrderBookSnapshot,
  };
}