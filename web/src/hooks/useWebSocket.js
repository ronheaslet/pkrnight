import { useState, useEffect, useRef, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const WS_URL = API_URL.replace(/^http/, 'ws')

export function useWebSocket(sessionId) {
  const [connectionState, setConnectionState] = useState('disconnected')
  const [lastMessage, setLastMessage] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimeout = useRef(null)
  const reconnectDelay = useRef(3000)

  const connect = useCallback(() => {
    const token = localStorage.getItem('pkr_token')
    if (!token || !sessionId) return

    const ws = new WebSocket(`${WS_URL}/ws?token=${token}&session=${sessionId}`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionState('connected')
      reconnectDelay.current = 3000
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setLastMessage(data)
      } catch {}
    }

    ws.onclose = () => {
      setConnectionState('disconnected')
      scheduleReconnect()
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [sessionId])

  function scheduleReconnect() {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
    reconnectTimeout.current = setTimeout(() => {
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000)
      connect()
    }, reconnectDelay.current)
  }

  useEffect(() => {
    connect()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && wsRef.current?.readyState !== 1) {
        connect()
      }
    }

    const handleOnline = () => {
      if (wsRef.current?.readyState !== 1) {
        connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      if (wsRef.current) wsRef.current.close()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
    }
  }, [connect])

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { connectionState, lastMessage, send }
}
