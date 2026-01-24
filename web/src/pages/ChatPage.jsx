import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { Avatar } from '../components/Avatar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function ChatPage() {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [league, setLeague] = useState(null)
  const messagesEndRef = useRef(null)
  const wsRef = useRef(null)

  useEffect(() => {
    fetchMessages()
    fetchLeague()
    connectWebSocket()
    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [leagueId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function fetchLeague() {
    try {
      const data = await api.get(`/api/leagues/${leagueId}`)
      setLeague(data.league)
    } catch {}
  }

  async function fetchMessages() {
    try {
      const data = await api.get(`/api/chat/league/${leagueId}?limit=100`)
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
      setTimeout(() => {
        if (wsRef.current === ws) connectWebSocket()
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

  // Group messages by date
  function groupByDate(msgs) {
    const groups = []
    let currentDate = null
    for (const msg of msgs) {
      const date = new Date(msg.created_at).toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric'
      })
      if (date !== currentDate) {
        groups.push({ type: 'date', date })
        currentDate = date
      }
      groups.push({ type: 'message', ...msg })
    }
    return groups
  }

  const grouped = groupByDate(messages)

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] md:h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link to={`/leagues/${leagueId}`} className="text-white/40 hover:text-white text-sm">&larr; {league?.name || 'Back'}</Link>
          <h1 className="font-display text-xl text-gold mt-0.5">League Chat</h1>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-black/20 border border-white/5 rounded-2xl p-4 space-y-3">
        {loading ? (
          <p className="text-white/40 text-sm text-center py-8">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-8">No messages yet. Start the conversation!</p>
        ) : (
          grouped.map((item, idx) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${idx}`} className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-white/30">{item.date}</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              )
            }

            const isMe = item.user_id === user?.id

            return (
              <div key={item.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                {!isMe && <Avatar name={item.display_name} size="sm" />}
                <div className={`max-w-[75%] ${isMe ? 'text-right' : ''}`}>
                  {!isMe && (
                    <p className="text-xs text-gold font-medium mb-0.5">{item.display_name}</p>
                  )}
                  <div className={`inline-block rounded-xl px-3 py-2 ${isMe ? 'bg-felt-light text-white' : 'bg-black/30 text-white border border-white/5'}`}>
                    <p className="text-sm break-words">{item.message}</p>
                  </div>
                  <p className="text-xs text-white/30 mt-0.5">
                    {new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 mt-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          maxLength={1000}
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="btn btn-primary disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
