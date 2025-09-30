import { useEffect, useRef, useState } from 'react'
import { Client, IMessage } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

interface BackendWebSocketConfig {
  url: string
  topics: string[]
  onMessage?: (destination: string, message: unknown) => void
  onConnect?: () => void
  onError?: (error: Error) => void
}

export function useBackendWebSocket(config: BackendWebSocketConfig) {
  const [isConnected, setIsConnected] = useState(false)
  const clientRef = useRef<Client | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const subscriptionsRef = useRef<Map<string, any>>(new Map())

  useEffect(() => {
    const connect = () => {
      if (clientRef.current?.connected) return

      const client = new Client({
        webSocketFactory: () => new SockJS(config.url) as any,
        debug: (str) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[STOMP Debug]', str)
          }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          console.log('[Backend WebSocket] Connected')
          setIsConnected(true)
          config.onConnect?.()

          // Subscribe to topics
          config.topics.forEach((topic) => {
            const subscription = client.subscribe(topic, (message: IMessage) => {
              try {
                const data = JSON.parse(message.body)
                config.onMessage?.(topic, data)
              } catch (error) {
                console.error('[Backend WebSocket] Parse error:', error)
              }
            })
            subscriptionsRef.current.set(topic, subscription)
          })
        },
        onStompError: (frame) => {
          console.error('[Backend WebSocket] STOMP error:', frame)
          const error = new Error(frame.headers['message'] || 'Unknown error')
          config.onError?.(error)
        },
        onWebSocketError: (event) => {
          console.error('[Backend WebSocket] WebSocket error:', event)
          setIsConnected(false)
        },
        onDisconnect: () => {
          console.log('[Backend WebSocket] Disconnected')
          setIsConnected(false)
          subscriptionsRef.current.clear()

          // Auto reconnect
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[Backend WebSocket] Attempting to reconnect...')
            connect()
          }, 5000)
        },
      })

      clientRef.current = client
      client.activate()
    }

    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      // Unsubscribe all
      subscriptionsRef.current.forEach((subscription) => {
        subscription.unsubscribe()
      })
      subscriptionsRef.current.clear()

      // Disconnect
      if (clientRef.current) {
        clientRef.current.deactivate()
        clientRef.current = null
      }
    }
  }, [config.url, config.topics.join(',')]) // Re-connect if URL or topics change

  const publish = (destination: string, body: unknown) => {
    if (!clientRef.current?.connected) {
      console.warn('[Backend WebSocket] Not connected, cannot publish')
      return
    }

    clientRef.current.publish({
      destination,
      body: JSON.stringify(body),
    })
  }

  return {
    isConnected,
    publish,
    client: clientRef.current,
  }
}