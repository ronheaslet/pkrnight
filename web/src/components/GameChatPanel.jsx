import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function GameChatPanel({ leagueId }) {
  const [activeTab, setActiveTab] = useState('chat')
  const [expanded, setExpanded] = useState(false)
  const [chatUnread, setChatUnread] = useState(0)
  const [notifUnread, setNotifUnread] = useState(0)

  // Fetch notification count on mount
  useEffect(() => {
    api.get('/api/notifications/count').then(data => {
      setNotifUnread(data.count)
    }).catch(() => {})
  }, [])

  if (!leagueId) return null

  if (!expanded) {
    return (
      <div className="mt-6">
        <button
          onClick={() => setExpanded(true)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center justify-between hover:border-green-600 transition-colors"
        >
          <span className="text-white text-sm font-medium">Chat & Notifications</span>
          <div className="flex gap-2">
            {chatUnread > 0 && (
              <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full">{chatUnread}</span>
            )}
            {notifUnread > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{notifUnread}</span>
            )}
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      {/* Tab header */}
      <div className="flex items-center border-b border-gray-700">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'chat' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}
        >
          Chat {chatUnread > 0 && <span className="ml-1 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full">{chatUnread}</span>}
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}
        >
          Notifications {notifUnread > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{notifUnread}</span>}
        </button>
        <button
          onClick={() => setExpanded(false)}
          className="px-3 py-2 text-gray-500 hover:text-white text-sm"
        >
          Hide
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'chat' ? (
        <ChatTab leagueId={leagueId} onUnreadChange={setChatUnread} />
      ) : (
        <NotificationsTab onUnreadChange={setNotifUnread} />
      )}
    </div>
  )
}

function ChatTab({ leagueId, onUnreadChange }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const wsRef = useRef(null)
  const isVisibleRef = useRef(true)

  useEffect(() => {
    fetchMessages()
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
        // Show toast for messages from others
        if (data.message.user_id !== user?.id && window.__pkrToast) {
          window.__pkrToast({
            title: data.message.display_name,
            body: data.message.message
          })
        }
      }
    }

    ws.onclose = () => {
      setTimeout(() => {
        if (wsRef.current === ws) connectWebSocket()
      }, 3000)
    }

    ws.onerror = () => {}
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

  return (
    <div>
      <div className="h-48 overflow-y-auto px-3 py-2 space-y-1.5">
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-4">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No messages yet</p>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={msg.user_id === user?.id ? 'text-right' : ''}>
              <div className={`inline-block max-w-[80%] ${msg.user_id === user?.id ? 'bg-green-900/40' : 'bg-gray-700'} rounded-lg px-2.5 py-1`}>
                {msg.user_id !== user?.id && (
                  <p className="text-xs text-green-400 font-medium">{msg.display_name}</p>
                )}
                <p className="text-sm text-white break-words">{msg.message}</p>
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
          placeholder="Message..."
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

function NotificationsTab({ onUnreadChange }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/notifications?limit=10').then(data => {
      setNotifications(data.notifications)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function markAsRead(id) {
    try {
      await api.patch(`/api/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      onUnreadChange(prev => Math.max(0, prev - 1))
    } catch {}
  }

  return (
    <div className="h-48 overflow-y-auto">
      {loading ? (
        <p className="text-gray-500 text-sm text-center py-4">Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">No notifications</p>
      ) : (
        <div className="divide-y divide-gray-700">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && markAsRead(n.id)}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-700/50 ${!n.read ? 'bg-gray-700/20' : ''}`}
            >
              <div className="flex items-center gap-2">
                {!n.read && <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0" />}
                <p className={`text-sm truncate ${!n.read ? 'text-white font-medium' : 'text-gray-400'}`}>{n.title}</p>
              </div>
              {n.body && <p className="text-xs text-gray-500 mt-0.5 truncate ml-3.5">{n.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
