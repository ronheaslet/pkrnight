import { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [notifications, setNotifications] = useState([])
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (user) {
      fetchUnreadCount()
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchUnreadCount() {
    try {
      const data = await api.get('/api/notifications/count')
      setUnreadCount(data.count)
    } catch {}
  }

  async function toggleDropdown() {
    if (!showDropdown) {
      try {
        const data = await api.get('/api/notifications?limit=5')
        setNotifications(data.notifications)
      } catch {}
    }
    setShowDropdown(!showDropdown)
  }

  async function markAsRead(id) {
    try {
      await api.patch(`/api/notifications/${id}/read`)
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n))
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.post('/api/notifications/read-all')
      setNotifications(notifications.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {}
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white hover:text-green-400 transition-colors">
            PKR Night
          </Link>
          {user && (
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={toggleDropdown}
                  className="relative text-gray-400 hover:text-white transition-colors p-1"
                  title="Notifications"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                      <span className="text-white text-sm font-medium">Notifications</span>
                      <div className="flex gap-2">
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-green-400 hover:text-green-300">
                            Mark all read
                          </button>
                        )}
                        <Link
                          to="/notifications"
                          onClick={() => setShowDropdown(false)}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          View all
                        </Link>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">No notifications</p>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => !n.read && markAsRead(n.id)}
                            className={`px-4 py-3 border-b border-gray-700 last:border-0 cursor-pointer hover:bg-gray-700/50 ${!n.read ? 'bg-gray-700/30' : ''}`}
                          >
                            <p className={`text-sm ${!n.read ? 'text-white font-medium' : 'text-gray-400'}`}>{n.title}</p>
                            {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                            <p className="text-xs text-gray-600 mt-1">{formatTimeAgo(n.created_at)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <span className="text-gray-400 text-sm hidden sm:inline">{user.displayName}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
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
