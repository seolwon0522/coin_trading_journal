import { useState, useCallback } from 'react'
import { useBackendWebSocket } from './use-backend-websocket'
import type {
  NautilusTrade,
  NautilusPosition,
  NautilusOrder,
  NautilusStrategyStatus,
} from '@/types/nautilus-events'

const BACKEND_WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'http://localhost:8080/ws'

export function useNautilusRealtime() {
  const [trades, setTrades] = useState<NautilusTrade[]>([])
  const [positions, setPositions] = useState<NautilusPosition[]>([])
  const [orders, setOrders] = useState<NautilusOrder[]>([])
  const [strategyStatuses, setStrategyStatuses] = useState<Map<string, NautilusStrategyStatus>>(
    new Map()
  )

  const handleMessage = useCallback((destination: string, message: unknown) => {
    console.log(`[Nautilus Realtime] Received from ${destination}:`, message)

    switch (destination) {
      case '/topic/trades':
        setTrades((prev) => [message as NautilusTrade, ...prev].slice(0, 100)) // Keep last 100
        break

      case '/topic/positions':
        setPositions((prev) => {
          const position = message as NautilusPosition
          const existingIndex = prev.findIndex((p) => p.positionId === position.positionId)

          if (existingIndex >= 0) {
            // Update existing
            const updated = [...prev]
            updated[existingIndex] = position
            return updated
          } else {
            // Add new
            return [position, ...prev]
          }
        })
        break

      case '/topic/orders':
        setOrders((prev) => {
          const order = message as NautilusOrder
          const existingIndex = prev.findIndex((o) => o.orderId === order.orderId)

          if (existingIndex >= 0) {
            // Update existing
            const updated = [...prev]
            updated[existingIndex] = order
            return updated
          } else {
            // Add new
            return [order, ...prev].slice(0, 100) // Keep last 100
          }
        })
        break

      case '/topic/strategies':
        const status = message as NautilusStrategyStatus
        setStrategyStatuses((prev) => new Map(prev).set(status.strategyId, status))
        break
    }
  }, [])

  const { isConnected, publish } = useBackendWebSocket({
    url: BACKEND_WS_URL,
    topics: ['/topic/trades', '/topic/positions', '/topic/orders', '/topic/strategies'],
    onMessage: handleMessage,
    onConnect: () => {
      console.log('[Nautilus Realtime] Connected to backend WebSocket')
    },
    onError: (error) => {
      console.error('[Nautilus Realtime] WebSocket error:', error)
    },
  })

  const clearTrades = useCallback(() => setTrades([]), [])
  const clearOrders = useCallback(() => setOrders([]), [])

  return {
    isConnected,
    trades,
    positions,
    orders,
    strategyStatuses,
    clearTrades,
    clearOrders,
    publish,
  }
}