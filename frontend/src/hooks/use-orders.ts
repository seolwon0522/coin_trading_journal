'use client';

import { useState, useCallback } from 'react';
import { OrderApi, OrderRequest, OrderResponse, BalanceInfo } from '@/lib/api/order-api';
import { toast } from 'sonner';

export function useOrders() {
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [openOrders, setOpenOrders] = useState<OrderResponse[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderResponse[]>([]);
  const [balance, setBalance] = useState<BalanceInfo[]>([]);
  const [balanceMap, setBalanceMap] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const orderApi = new OrderApi();

  const placeOrder = useCallback(async (
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT' | 'LIMIT_MAKER',
    quantity: string,
    price?: string,
    stopPrice?: string
  ) => {
    setIsPlacingOrder(true);
    try {
      const orderRequest: OrderRequest = {
        symbol,
        side,
        type,
        quantity: parseFloat(quantity),
        price: price ? parseFloat(price) : undefined,
        stopPrice: stopPrice ? parseFloat(stopPrice) : undefined,
        timeInForce: type === 'LIMIT' ? 'GTC' : undefined
      };
      const response = await orderApi.placeOrder(orderRequest);

      toast.success('주문 체결 완료', {
        description: `${orderRequest.side === 'BUY' ? '매수' : '매도'} ${orderRequest.quantity} ${orderRequest.symbol} @ ${orderRequest.price || '시장가'}`,
      });

      // Refresh open orders
      await fetchOpenOrders(symbol);

      return response;
    } catch (error) {
      toast.error('주문 실패', {
        description: error instanceof Error ? error.message : '주문 처리 중 오류가 발생했습니다',
      });
      throw error;
    } finally {
      setIsPlacingOrder(false);
    }
  }, []);

  const cancelOrder = useCallback(async (orderId: number) => {
    try {
      const response = await orderApi.cancelOrder(orderId);

      toast.success('주문 취소 완료', {
        description: `주문 #${orderId}가 취소되었습니다`,
      });

      // Remove from open orders
      setOpenOrders(prev => prev.filter(order => order.orderId !== orderId));

      return response;
    } catch (error) {
      toast.error('취소 실패', {
        description: error instanceof Error ? error.message : '주문 취소 중 오류가 발생했습니다',
      });
      throw error;
    }
  }, []);

  const fetchOpenOrders = useCallback(async (symbol?: string) => {
    try {
      const orders = await orderApi.getOpenOrders(symbol);
      // Ensure orders is an array
      const ordersArray = Array.isArray(orders) ? orders : [];
      setOpenOrders(ordersArray);
      return ordersArray;
    } catch (error) {
      console.error('Failed to fetch open orders:', error);
      setOpenOrders([]);
      return [];
    }
  }, []);

  const fetchOrderHistory = useCallback(async () => {
    try {
      const orders = await orderApi.getOrderHistory();
      // Ensure orders is an array
      const ordersArray = Array.isArray(orders) ? orders : [];
      setOrderHistory(ordersArray);
      return ordersArray;
    } catch (error) {
      console.error('Failed to fetch order history:', error);
      setOrderHistory([]);
      return [];
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    try {
      const balances = await orderApi.getBalance();
      console.log('Fetched balances:', balances); // 디버깅용
      // Ensure balances is an array
      const balancesArray = Array.isArray(balances) ? balances : [];
      setBalance(balancesArray);

      // Create a map for easy access
      const map: { [key: string]: number } = {};
      balancesArray.forEach(b => {
        map[b.asset] = b.free || 0; // Use free balance for trading
      });
      setBalanceMap(map);
      console.log('Balance map:', map); // 디버깅용

      return balancesArray;
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance([]);
      setBalanceMap({});
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getAssetBalance = useCallback((asset: string): BalanceInfo | undefined => {
    return balance.find(b => b.asset === asset);
  }, [balance]);

  return {
    placeOrder,
    cancelOrder,
    fetchOpenOrders,
    fetchOrderHistory,
    fetchBalance,
    getAssetBalance,
    isPlacingOrder,
    openOrders,
    orderHistory,
    balance: balanceMap, // Use balanceMap for easy access
    balanceArray: balance, // Original array format
    loading,
  };
}