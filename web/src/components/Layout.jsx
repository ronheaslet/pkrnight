import { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [notifications, setNotifications] = useState([])
  const dropdownRef = useRef(null)

  // Extract leagueId from URL if we're in a league context
  const leagueMatch = location.pathname.match(/\/leagues\/([^/]+)/)
  const leagueId = leagueMatch ? leagueMatch[1] : null

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

  const isActive = (path) => location.pathname === path
  const isActivePrefix = (prefix) => location.pathname.startsWith(prefix)

  return (
    <div className="min-h-screen bg-gradient-to-b from-pkr-green-800 to-pkr-green-900 pb-20 md:pb-0">
      {/* Top nav */}
      <nav className="bg-pkr-green-900/80 border-b border-pkr-green-700/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-xl font-display font-bold text-pkr-gold-400 hover:text-pkr-gold-300 transition-colors">
            PKR Night
          </Link>
          {user && (
            <div className="flex items-center gap-4">
              {/* Notification Bell - desktop only */}
              <div className="relative hidden md:block" ref={dropdownRef}>
                <button
                  onClick={toggleDropdown}
                  className="relative text-pkr-gold-300/70 hover:text-pkr-gold-300 transition-colors p-1"
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
                  <div className="absolute right-0 mt-2 w-80 bg-pkr-green-800 border border-pkr-green-700 rounded-lg shadow-xl z-50">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-pkr-green-700">
                      <span className="text-white text-sm font-medium">Notifications</span>
                      <div className="flex gap-2">
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-pkr-gold-400 hover:text-pkr-gold-300">
                            Mark all read
                          </button>
                        )}
                        <Link
                          to="/notifications"
                          onClick={() => setShowDropdown(false)}
                          className="text-xs text-pkr-gold-300/60 hover:text-white"
                        >
                          View all
                        </Link>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-pkr-gold-300/40 text-sm text-center py-4">No notifications</p>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => !n.read && markAsRead(n.id)}
                            className={`px-4 py-3 border-b border-pkr-green-700 last:border-0 cursor-pointer hover:bg-pkr-green-700/50 ${!n.read ? 'bg-pkr-green-700/30' : ''}`}
                          >
                            <p className={`text-sm ${!n.read ? 'text-white font-medium' : 'text-pkr-gold-300/60'}`}>{n.title}</p>
                            {n.body && <p className="text-xs text-pkr-gold-300/40 mt-0.5">{n.body}</p>}
                            <p className="text-xs text-pkr-gold-300/30 mt-1">{formatTimeAgo(n.created_at)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link to="/profile" className="text-pkr-gold-300/70 text-sm hidden md:inline hover:text-pkr-gold-300 transition-colors">
                {user.displayName}
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-pkr-gold-300/50 hover:text-pkr-gold-300 transition-colors hidden md:inline"
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

      {/* Mobile bottom nav - 5 tabs when in league, 3 tabs otherwise */}
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-pkr-green-900 border-t border-pkr-green-700/50 md:hidden z-50">
          <div className="flex items-center justify-around h-16 pb-safe">
            {leagueId ? (
              <>
                <NavTab
                  to={`/leagues/${leagueId}`}
                  icon="📅"
                  label="Calendar"
                  active={isActive(`/leagues/${leagueId}`)}
                />
                <NavTab
                  to={`/leagues/${leagueId}/standings`}
                  icon="🏆"
                  label="Standings"
                  active={isActivePrefix(`/leagues/${leagueId}/standings`)}
                />
                <NavTab
                  to={`/leagues/${leagueId}/settings`}
                  icon="⚙️"
                  label="Settings"
                  active={isActivePrefix(`/leagues/${leagueId}/settings`)}
                />
                <NavTab
                  to={`/leagues/${leagueId}/members`}
                  icon="🏅"
                  label="Members"
                  active={isActivePrefix(`/leagues/${leagueId}/members`)}
                />
                <NavTab
                  to={`/leagues/${leagueId}/chat`}
                  icon="💬"
                  label="Chat"
                  active={isActivePrefix(`/leagues/${leagueId}/chat`)}
                  badge={unreadCount}
                />
              </>
            ) : (
              <>
                <NavTab to="/" icon="🏠" label="Home" active={isActive('/')} />
                <NavTab
                  to="/notifications"
                  icon="🔔"
                  label="Alerts"
                  active={isActive('/notifications')}
                  badge={unreadCount}
                />
                <NavTab to="/profile" icon="👤" label="Profile" active={isActive('/profile')} />
              </>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}

function NavTab({ to, icon, label, active, badge }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 relative transition-colors ${
        active ? 'text-pkr-gold-400' : 'text-pkr-gold-300/50'
      }`}
    >
      <span className="text-lg">{icon}</span>
      {badge > 0 && (
        <span className="absolute top-0 right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      <span className="text-xs">{label}</span>
      {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-pkr-gold-400 rounded-full" />}
    </Link>
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
