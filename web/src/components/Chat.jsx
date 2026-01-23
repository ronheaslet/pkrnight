import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function Chat({ leagueId }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const messagesEndRef = useRef(null)
  const wsRef = useRef(null)

  useEffect(() => {
    fetchMessages()
    connectWebSocket()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [leagueId])

  useEffect(() => {
    if (expanded) {
      scrollToBottom()
    }
  }, [messages, expanded])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function fetchMessages() {
    try {
      const data = await api.get(`/api/chat/league/${leagueId}?limit=50`)
      setMessages(data.messages)
    } catch {} finally {
      setLoading(false)
    }
  }

  function connectWebSocket() {
    const token = localStorage.getItem('pkr_token')
    if (!token) return

    const wsUrl = API_URL.replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsUrl}/ws?token=${token}&league=${leagueId}`)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'CHAT_MESSAGE') {
        setMessages(prev => [...prev, data.message])
      }
    }

    ws.onerror = () => {}
    ws.onclose = () => {
      // Reconnect after 3s
      setTimeout(() => {
        if (wsRef.current === ws) {
          connectWebSocket()
        }
      }, 3000)
    }

    wsRef.current = ws
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || sending) return

    setSending(true)
    try {
      await api.post(`/api/chat/league/${leagueId}`, { message: input.trim() })
      setInput('')
    } catch {} finally {
      setSending(false)
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center justify-between hover:border-gray-600 transition-colors"
      >
        <span className="text-white text-sm font-medium">League Chat</span>
        <span className="text-gray-500 text-xs">{messages.length} messages</span>
      </button>
    )
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <span className="text-white text-sm font-medium">League Chat</span>
        <button onClick={() => setExpanded(false)} className="text-gray-400 hover:text-white text-sm">
          Minimize
        </button>
      </div>

      <div className="h-64 overflow-y-auto px-4 py-2 space-y-2">
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-4">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No messages yet. Start the conversation!</p>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`${msg.user_id === user?.id ? 'text-right' : ''}`}>
              <div className={`inline-block max-w-[80%] ${msg.user_id === user?.id ? 'bg-green-900/40' : 'bg-gray-700'} rounded-lg px-3 py-1.5`}>
                {msg.user_id !== user?.id && (
                  <p className="text-xs text-green-400 font-medium">{msg.display_name}</p>
                )}
                <p className="text-sm text-white break-words">{msg.message}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 p-2 border-t border-gray-700">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          maxLength={1000}
          className="flex-1 px-3 py-1.5 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
