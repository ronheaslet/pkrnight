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
        <button onClick={() => { setError(null); setLoading(true); fetchLeagues() }} className="text-gold hover:underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl text-gold">Your Leagues</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false) }}
            className="btn btn-secondary text-sm"
          >
            Join
          </button>
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false) }}
            className="btn btn-primary text-sm"
          >
            Create
          </button>
        </div>
      </div>

      {showJoin && <JoinLeagueForm onDone={() => { setShowJoin(false); fetchLeagues() }} onCancel={() => setShowJoin(false)} />}
      {showCreate && <CreateLeagueForm onDone={() => { setShowCreate(false); fetchLeagues() }} onCancel={() => setShowCreate(false)} />}

      {/* Activity Banner */}
      {unreadCount > 0 && (
        <Link
          to="/notifications"
          className="card card-gold flex items-center justify-between hover:opacity-80 transition-opacity block"
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔔</div>
            <div>
              <p className="text-white text-sm font-medium">
                {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
              </p>
              {recentNotifications.length > 0 && (
                <p className="text-white/50 text-xs mt-0.5 truncate max-w-[200px] sm:max-w-none">
                  {recentNotifications[0].title}
                </p>
              )}
            </div>
          </div>
          <span className="text-white/50 text-sm">View &rarr;</span>
        </Link>
      )}

      {leagues.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🃏</div>
          <h2 className="font-display text-lg text-white mb-2">No leagues yet</h2>
          <p className="text-white/50 text-sm">Create a new league or join one with an invite code.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {leagues.map((league) => (
            <Link
              key={league.id}
              to={`/leagues/${league.id}`}
              className="card hover:bg-white/5 transition-colors block"
            >
              <h3 className="font-display text-lg text-gold mb-1">{league.name}</h3>
              {league.description && (
                <p className="text-white/50 text-sm mb-3 line-clamp-2">{league.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-white/40">
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
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h3 className="font-display text-gold">Create New League</h3>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input type="text" placeholder="League Name" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
      <input type="text" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn btn-primary text-sm disabled:opacity-50">
          {loading ? 'Creating...' : 'Create'}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary text-sm">Cancel</button>
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
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h3 className="font-display text-gold">Join a League</h3>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input type="text" placeholder="Invite Code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} className="input" required />
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn btn-primary text-sm disabled:opacity-50">
          {loading ? 'Joining...' : 'Join'}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary text-sm">Cancel</button>
      </div>
    </form>
  )
}
