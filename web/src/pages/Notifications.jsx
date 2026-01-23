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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="text-gray-400 hover:text-white text-sm">&larr; Home</Link>
          <h1 className="text-2xl font-bold text-white mt-1">Notifications</h1>
        </div>
        {notifications.some(n => !n.read) && (
          <button
            onClick={markAllRead}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Mark All Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">No notifications yet.</p>
          <p className="text-gray-500 text-sm mt-1">You'll be notified about game results, trophies, and more.</p>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg divide-y divide-gray-700">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && markAsRead(n.id)}
              className={`px-4 py-4 cursor-pointer hover:bg-gray-700/50 transition-colors ${!n.read ? 'bg-gray-700/20' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />}
                    <p className={`text-sm ${!n.read ? 'text-white font-medium' : 'text-gray-300'}`}>{n.title}</p>
                  </div>
                  {n.body && <p className="text-sm text-gray-500 mt-0.5 ml-4">{n.body}</p>}
                  <div className="flex gap-3 mt-1 ml-4">
                    {n.league_name && <span className="text-xs text-gray-600">{n.league_name}</span>}
                    <span className="text-xs text-gray-600">{formatTimeAgo(n.created_at)}</span>
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
