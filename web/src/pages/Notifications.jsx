import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { PageSpinner } from '../components/Spinner'

export function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    try {
      const data = await api.get('/api/notifications?limit=100')
      setNotifications(data.notifications)
    } catch {} finally {
      setLoading(false)
    }
  }

  async function markAsRead(id) {
    try {
      await api.patch(`/api/notifications/${id}/read`)
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n))
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.post('/api/notifications/read-all')
      setNotifications(notifications.map(n => ({ ...n, read: true })))
    } catch {}
  }

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="text-white/40 hover:text-white text-sm">&larr; Home</Link>
          <h1 className="font-display text-xl text-gold mt-1">Notifications</h1>
        </div>
        {notifications.some(n => !n.read) && (
          <button onClick={markAllRead} className="btn btn-primary text-sm">
            Mark All Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-white/50">No notifications yet.</p>
          <p className="text-white/40 text-sm mt-1">You'll be notified about game results, trophies, and more.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && markAsRead(n.id)}
              className={`card cursor-pointer hover:bg-white/5 transition-colors ${!n.read ? 'border-gold/30 border' : ''}`}
            >
              <div className="flex items-start gap-3">
                {!n.read && <span className="w-2 h-2 bg-gold rounded-full flex-shrink-0 mt-1.5" />}
                <div className="flex-1">
                  <p className={`text-sm ${!n.read ? 'text-white font-medium' : 'text-white/60'}`}>{n.title}</p>
                  {n.body && <p className="text-sm text-white/40 mt-0.5">{n.body}</p>}
                  <div className="flex gap-3 mt-1">
                    {n.league_name && <span className="text-xs text-white/30">{n.league_name}</span>}
                    <span className="text-xs text-white/30">{formatTimeAgo(n.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
