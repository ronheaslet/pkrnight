import { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import { ViewModeSwitcher } from './ViewModeSwitcher'

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [league, setLeague] = useState(null)
  const [activeGame, setActiveGame] = useState(null)
  const dropdownRef = useRef(null)
  const userMenuRef = useRef(null)

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
    if (leagueId) {
      fetchLeagueInfo()
    } else {
      setLeague(null)
      setActiveGame(null)
    }
  }, [leagueId])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
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

  async function fetchLeagueInfo() {
    try {
      const [leagueData, gamesData] = await Promise.all([
        api.get(`/api/leagues/${leagueId}`),
        api.get(`/api/games/league/${leagueId}/active`).catch(() => null)
      ])
      setLeague(leagueData.league)
      setActiveGame(gamesData?.session || null)
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

  const isAdmin = league?.role === 'owner' || league?.role === 'admin'
  const isDealer = league?.role === 'dealer' || isAdmin

  const initials = user?.displayName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'U'

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-felt-dark/95 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🃏</span>
            <span className="font-display text-lg text-gold">
              {leagueId && league ? league.name : 'PKR Night'}
            </span>
          </Link>

          {user && (
            <div className="flex items-center gap-2">
              {/* View Mode Switcher (only in league context) */}
              {leagueId && (
                <ViewModeSwitcher isAdmin={isAdmin} isDealer={isDealer} />
              )}

              {/* Notification Bell */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={toggleDropdown}
                  className="relative text-white/60 hover:text-white transition-colors p-1"
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
                  <div className="absolute right-0 mt-2 w-80 bg-felt-dark border border-white/20 rounded-xl shadow-xl z-50">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                      <span className="text-white text-sm font-medium">Notifications</span>
                      <div className="flex gap-2">
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-gold hover:text-gold-dark">
                            Mark all read
                          </button>
                        )}
                        <Link
                          to="/notifications"
                          onClick={() => setShowDropdown(false)}
                          className="text-xs text-white/40 hover:text-white"
                        >
                          View all
                        </Link>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-white/40 text-sm text-center py-4">No notifications</p>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => !n.read && markAsRead(n.id)}
                            className={`px-4 py-3 border-b border-white/10 last:border-0 cursor-pointer hover:bg-white/5 ${!n.read ? 'bg-white/5' : ''}`}
                          >
                            <p className={`text-sm ${!n.read ? 'text-white font-medium' : 'text-white/60'}`}>{n.title}</p>
                            {n.body && <p className="text-xs text-white/40 mt-0.5">{n.body}</p>}
                            <p className="text-xs text-white/30 mt-1">{formatTimeAgo(n.created_at)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User avatar */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-9 h-9 rounded-full bg-gold flex items-center justify-center text-felt-dark font-semibold text-sm hover:opacity-80 transition-opacity"
                >
                  {initials}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-felt-dark border border-white/20 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="font-medium text-white text-sm">{user.displayName}</div>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => { setShowUserMenu(false); handleLogout() }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
                      >
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 main-content">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      {user && (
        <nav className="tab-bar md:hidden z-50">
          {leagueId ? (
            <>
              <TabBtn to={`/leagues/${leagueId}`} icon="📅" label="Calendar" active={isActive(`/leagues/${leagueId}`)} />
              <TabBtn to={`/leagues/${leagueId}/standings`} icon="🏆" label="Standings" active={isActivePrefix(`/leagues/${leagueId}/standings`)} />
              <TabBtn
                to={activeGame ? `/games/${activeGame.id}` : '#'}
                icon="⏱️"
                label="Live"
                active={false}
                disabled={!activeGame}
                pulse={activeGame?.status === 'running'}
              />
              <TabBtn to={`/leagues/${leagueId}/standings?tab=trophies`} icon="🏅" label="Trophies" active={location.search.includes('tab=trophies')} />
              <TabBtn to={`/leagues/${leagueId}/chat`} icon="💬" label="Chat" active={isActivePrefix(`/leagues/${leagueId}/chat`)} badge={unreadCount} />
              {isAdmin && (
                <TabBtn to={`/leagues/${leagueId}/admin`} icon="⚙️" label="Admin" active={isActivePrefix(`/leagues/${leagueId}/admin`)} />
              )}
            </>
          ) : (
            <>
              <TabBtn to="/" icon="🏠" label="Home" active={isActive('/')} />
              <TabBtn to="/notifications" icon="🔔" label="Alerts" active={isActive('/notifications')} badge={unreadCount} />
              <TabBtn to="/profile" icon="👤" label="Profile" active={isActive('/profile')} />
            </>
          )}
        </nav>
      )}
    </div>
  )
}

function TabBtn({ to, icon, label, active, badge, disabled, pulse }) {
  if (disabled) {
    return (
      <div className="tab-btn opacity-40 cursor-not-allowed">
        <span className="icon relative">{icon}</span>
        <span className="tab-label">{label}</span>
      </div>
    )
  }
  return (
    <Link
      to={to}
      className={`tab-btn ${active ? 'active' : ''}`}
    >
      <span className="icon relative">
        {icon}
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
        {pulse && (
          <span className="absolute -top-0.5 -right-1.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </span>
      <span className="tab-label">{label}</span>
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
