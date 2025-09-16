'use client';

import { useState, useCallback } from 'react';
import { OrderApi, OrderRequest, OrderResponse, BalanceInfo } from '@/lib/api/order-api';
import { toast } from 'sonner';

export function useOrders() {
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [openOrders, setOpenOrders] = useState<OrderResponse[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderResponse[]>([]);
  const [balance, setBalance] = useState<BalanceInfo[]>([]);
  const orderApi = new OrderApi();

  const placeOrder = useCallback(async (orderRequest: OrderRequest) => {
    setIsPlacingOrder(true);
    try {
      const response = await orderApi.placeOrder(orderRequest);

      toast.success('주문 체결 완료', {
        description: `${orderRequest.side === 'BUY' ? '매수' : '매도'} ${orderRequest.quantity} ${orderRequest.symbol} @ ${orderRequest.price || '시장가'}`,
      });

      // Refresh open orders
      await fetchOpenOrders(orderRequest.symbol);

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
      setOpenOrders(orders);
      return orders;
    } catch (error) {
      console.error('Failed to fetch open orders:', error);
      return [];
    }
  }, []);

  const fetchOrderHistory = useCallback(async () => {
    try {
      const orders = await orderApi.getOrderHistory();
      setOrderHistory(orders);
      return orders;
    } catch (error) {
      console.error('Failed to fetch order history:', error);
      return [];
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    try {
      const balances = await orderApi.getBalance();
      console.log('Fetched balances:', balances); // 디버깅용
      setBalance(balances);
      return balances;
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return [];
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
    balance,
  };
}