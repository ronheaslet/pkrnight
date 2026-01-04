import { useState, useEffect, useRef } from 'react'
import { useLeague } from '../../contexts/LeagueContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { getInitials, getOrdinal, timeAgo } from '../../utils/helpers'

export default function MessagesTab() {
  const { currentLeague } = useLeague()
  const { user } = useAuth()
  const [activeSubTab, setActiveSubTab] = useState('chat')
  const [messages, setMessages] = useState([])
  const [notifications, setNotifications] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const [members, setMembers] = useState({})

  useEffect(() => {
    let channel = null
    
    if (currentLeague) {
      fetchMessages()
      fetchNotifications()
      fetchMembers()
      
      channel = supabase
        .channel(`chat-messages-${currentLeague.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `league_id=eq.${currentLeague.id}`
          },
          async (payload) => {
            const { data } = await supabase
              .from('chat_messages')
              .select(`
                id,
                message,
                created_at,
                user_id,
                users (id, full_name, display_name)
              `)
              .eq('id', payload.new.id)
              .single()
            
            if (data) {
              setMessages(prev => [...prev, data])
            }
          }
        )
        .subscribe()
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [currentLeague])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('league_members')
      .select(`
        user_id,
        role,
        users (id, full_name, display_name)
      `)
      .eq('league_id', currentLeague.id)

    if (data) {
      const memberMap = {}
      data.forEach(m => {
        if (m.users) {
          memberMap[m.user_id] = {
            ...m.users,
            role: m.role
          }
        }
      })
      setMembers(memberMap)
    }
  }

  const fetchMessages = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        id,
        message,
        created_at,
        user_id,
        users (
          id,
          full_name,
          display_name
        )
      `)
      .eq('league_id', currentLeague.id)
      .order('created_at', { ascending: true })
      .limit(100)

    if (!error && data) {
      setMessages(data)
    }
    setLoading(false)
  }

  const fetchNotifications = async () => {
    // Get recent game results
    const { data: gameResults } = await supabase
      .from('game_sessions')
      .select(`
        id,
        ended_at,
        events (
          id,
          title,
          event_date,
          league_id
        ),
        game_participants (
          user_id,
          finish_position,
          winnings,
          users (full_name, display_name)
        )
      `)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(10)

    // Get RSVP confirmations for user
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select(`
        id,
        status,
        responded_at,
        events (
          id,
          title,
          event_date,
          league_id
        )
      `)
      .eq('user_id', user?.id)
      .order('responded_at', { ascending: false })
      .limit(5)

    const notifs = []

    // Add game results as notifications
    gameResults?.forEach(game => {
      if (game.events?.league_id !== currentLeague.id) return
      
      const winner = game.game_participants?.find(p => p.finish_position === 1)
      const myResult = game.game_participants?.find(p => p.user_id === user?.id)
      
      if (winner) {
        notifs.push({
          id: `game-${game.id}`,
          type: 'result',
          title: `Game Results - ${game.events?.title}`,
          preview: myResult 
            ? `You finished ${getOrdinal(myResult.finish_position)}${myResult.winnings > 0 ? ` ($${myResult.winnings})` : ''}`
            : `${winner.users?.display_name || winner.users?.full_name} wins!`,
          time: timeAgo(game.ended_at),
          timestamp: game.ended_at
        })
      }
    })

    // Add RSVP confirmations
    rsvps?.forEach(rsvp => {
      if (rsvp.events?.league_id !== currentLeague.id) return
      
      notifs.push({
        id: `rsvp-${rsvp.id}`,
        type: 'rsvp',
        title: 'RSVP Confirmed',
        preview: `You're ${rsvp.status === 'going' ? 'confirmed' : rsvp.status} for ${rsvp.events?.title}`,
        time: timeAgo(rsvp.responded_at),
        timestamp: rsvp.responded_at
      })
    })

    // Sort by time
    notifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    setNotifications(notifs.slice(0, 10))
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!message.trim() || sending) return

    setSending(true)
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        league_id: currentLeague.id,
        user_id: user.id,
        message: message.trim()
      })

    if (!error) {
      setMessage('')
    }
    setSending(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getAvatarColor = (userId) => {
    const member = members[userId]
    if (member?.role === 'owner') return 'bg-gold text-felt-dark'
    if (member?.role === 'admin') return 'bg-chip-blue'
    
    // Generate consistent color based on user ID
    const colors = ['bg-chip-red', 'bg-green-600', 'bg-purple-600', 'bg-pink-600', 'bg-orange-600', 'bg-cyan-600']
    const index = userId ? userId.charCodeAt(0) % colors.length : 0
    return colors[index]
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'result': return '🏆'
      case 'rsvp': return '✅'
      case 'announcement': return '📢'
      default: return '📬'
    }
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.created_at)
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
    return groups
  }, {})

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Sub-tabs */}
      <div className="px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
              activeSubTab === 'chat' ? 'bg-gold text-felt-dark' : 'bg-white/10 text-white/70'
            }`}
          >
            💬 Group Chat
          </button>
          <button
            onClick={() => setActiveSubTab('inbox')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
              activeSubTab === 'inbox' ? 'bg-gold text-felt-dark' : 'bg-white/10 text-white/70'
            }`}
          >
            📬 Notifications
            {notifications.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Chat */}
      {activeSubTab === 'chat' && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 space-y-4">
            {loading ? (
              <div className="text-center py-8 text-white/50">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">💬</div>
                <div className="text-white/60">No messages yet</div>
                <div className="text-white/40 text-sm">Be the first to say something!</div>
              </div>
            ) : (
              Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="flex items-center gap-4 my-4">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <span className="text-xs text-white/40">{date}</span>
                    <div className="flex-1 h-px bg-white/10"></div>
                  </div>

                  {/* Messages for this date */}
                  <div className="space-y-3">
                    {dateMessages.map((msg, idx) => {
                      const isMe = msg.user_id === user?.id
                      const displayName = msg.users?.display_name || msg.users?.full_name || 'Unknown'
                      const showAvatar = idx === 0 || 
                        dateMessages[idx - 1]?.user_id !== msg.user_id

                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                        >
                          {showAvatar ? (
                            <div className={`w-8 h-8 rounded-full ${getAvatarColor(msg.user_id)} flex-shrink-0 flex items-center justify-center text-xs font-semibold`}>
                              {getInitials(displayName)}
                            </div>
                          ) : (
                            <div className="w-8 flex-shrink-0"></div>
                          )}
                          <div className={`max-w-[75%] ${isMe ? 'text-right' : ''}`}>
                            {showAvatar && (
                              <div className={`text-xs text-white/40 mb-1 ${isMe ? 'text-right' : ''}`}>
                                {isMe ? 'You' : displayName} • {formatTime(msg.created_at)}
                              </div>
                            )}
                            <div className={`inline-block px-4 py-2 rounded-2xl text-sm ${
                              isMe
                                ? 'bg-gold text-felt-dark rounded-tr-sm'
                                : 'bg-white/10 text-white rounded-tl-sm'
                            }`}>
                              {msg.message}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="input flex-1"
                disabled={sending}
              />
              <button 
                onClick={handleSend} 
                disabled={!message.trim() || sending}
                className="btn btn-primary px-4 disabled:opacity-50"
              >
                {sending ? '...' : '➤'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Notifications / Inbox */}
      {activeSubTab === 'inbox' && (
        <div className="flex-1 overflow-y-auto px-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📬</div>
              <div className="text-white/60">No notifications</div>
              <div className="text-white/40 text-sm">You're all caught up!</div>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map(notif => (
                <div key={notif.id} className="card">
                  <div className="flex gap-3">
                    <div className="text-2xl">{getNotificationIcon(notif.type)}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm">{notif.title}</span>
                        <span className="text-xs text-white/40">{notif.time}</span>
                      </div>
                      <p className="text-sm text-white/60">{notif.preview}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
