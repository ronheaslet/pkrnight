import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { PageSpinner } from '../components/Spinner'

export function Leagues() {
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentNotifications, setRecentNotifications] = useState([])

  useEffect(() => {
    fetchLeagues()
    fetchActivity()
  }, [])

  async function fetchActivity() {
    try {
      const [countData, notifData] = await Promise.all([
        api.get('/api/notifications/count'),
        api.get('/api/notifications?limit=3')
      ])
      setUnreadCount(countData.count)
      setRecentNotifications(notifData.notifications.filter(n => !n.read))
    } catch {}
  }

  async function fetchLeagues() {
    try {
      const data = await api.get('/api/leagues')
      setLeagues(data.leagues)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <PageSpinner />

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={() => { setError(null); setLoading(true); fetchLeagues() }} className="text-pkr-gold-400 hover:underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-pkr-gold-400">Your Leagues</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false) }}
            className="px-4 py-2 text-sm bg-pkr-green-700 text-pkr-gold-300 rounded-lg hover:bg-pkr-green-600 transition-colors border border-pkr-green-600/50"
          >
            Join League
          </button>
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false) }}
            className="px-4 py-2 text-sm bg-pkr-gold-500 text-pkr-green-900 rounded-lg hover:bg-pkr-gold-400 transition-colors font-medium"
          >
            Create League
          </button>
        </div>
      </div>

      {showJoin && <JoinLeagueForm onDone={() => { setShowJoin(false); fetchLeagues() }} onCancel={() => setShowJoin(false)} />}
      {showCreate && <CreateLeagueForm onDone={() => { setShowCreate(false); fetchLeagues() }} onCancel={() => setShowCreate(false)} />}

      {/* Activity Banner */}
      {(unreadCount > 0 || recentNotifications.length > 0) && (
        <Link
          to="/notifications"
          className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-4 flex items-center justify-between hover:border-pkr-gold-500/50 transition-colors block"
        >
          <div className="flex items-center gap-3">
            <div className="bg-pkr-gold-500/10 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pkr-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Recent activity'}
              </p>
              {recentNotifications.length > 0 && (
                <p className="text-pkr-gold-300/50 text-xs mt-0.5 truncate max-w-[200px] sm:max-w-none">
                  {recentNotifications[0].title}
                </p>
              )}
            </div>
          </div>
          <span className="text-pkr-gold-300/50 text-sm">View all &rarr;</span>
        </Link>
      )}

      {leagues.length === 0 ? (
        <div className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-8 text-center">
          <p className="text-pkr-gold-300/60 mb-4">You haven't joined any leagues yet.</p>
          <p className="text-pkr-gold-300/40 text-sm">Create a new league or join one with an invite code.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {leagues.map((league) => (
            <Link
              key={league.id}
              to={`/leagues/${league.id}`}
              className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-5 hover:border-pkr-gold-500/50 transition-colors block"
            >
              <h3 className="text-lg font-display font-semibold text-pkr-gold-400 mb-1">{league.name}</h3>
              {league.description && (
                <p className="text-pkr-gold-300/50 text-sm mb-3 line-clamp-2">{league.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-pkr-gold-300/40">
                <span className="capitalize">{league.role}</span>
                {league.member_count && <span>{league.member_count} members</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function CreateLeagueForm({ onDone, onCancel }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/leagues', { name, description: description || undefined })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-5 space-y-3">
      <h3 className="text-pkr-gold-400 font-display font-semibold">Create New League</h3>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input
        type="text"
        placeholder="League Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 bg-pkr-green-900 text-white rounded-lg border border-pkr-green-700/50 focus:border-pkr-gold-500 focus:outline-none placeholder-pkr-gold-300/30"
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full px-3 py-2 bg-pkr-green-900 text-white rounded-lg border border-pkr-green-700/50 focus:border-pkr-gold-500 focus:outline-none placeholder-pkr-gold-300/30"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-pkr-gold-500 text-pkr-green-900 rounded-lg hover:bg-pkr-gold-400 disabled:opacity-50 font-medium">
          {loading ? 'Creating...' : 'Create'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-pkr-gold-300/50 hover:text-white">
          Cancel
        </button>
      </div>
    </form>
  )
}

function JoinLeagueForm({ onDone, onCancel }) {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/leagues/join', { inviteCode })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-5 space-y-3">
      <h3 className="text-pkr-gold-400 font-display font-semibold">Join a League</h3>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input
        type="text"
        placeholder="Invite Code"
        value={inviteCode}
        onChange={(e) => setInviteCode(e.target.value)}
        className="w-full px-3 py-2 bg-pkr-green-900 text-white rounded-lg border border-pkr-green-700/50 focus:border-pkr-gold-500 focus:outline-none placeholder-pkr-gold-300/30"
        required
      />
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-pkr-gold-500 text-pkr-green-900 rounded-lg hover:bg-pkr-gold-400 disabled:opacity-50 font-medium">
          {loading ? 'Joining...' : 'Join'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-pkr-gold-300/50 hover:text-white">
          Cancel
        </button>
      </div>
    </form>
  )
}
