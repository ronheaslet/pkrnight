import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { PageSpinner } from '../components/Spinner'
import { Avatar } from '../components/Avatar'

export function LeagueDashboard() {
  const { leagueId } = useParams()
  const [league, setLeague] = useState(null)
  const [events, setEvents] = useState([])
  const [members, setMembers] = useState([])
  const [pot, setPot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [leagueId])

  async function fetchData() {
    try {
      const [leagueData, eventsData, membersData, potData] = await Promise.all([
        api.get(`/api/leagues/${leagueId}`),
        api.get(`/api/events/league/${leagueId}`),
        api.get(`/api/members/league/${leagueId}`),
        api.get(`/api/pot/league/${leagueId}`).catch(() => null)
      ])
      setLeague(leagueData.league)
      setEvents(eventsData.events)
      setMembers(membersData.members)
      if (potData) setPot(potData)
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
        <Link to="/" className="text-gold hover:underline">Back to Leagues</Link>
      </div>
    )
  }

  const isAdmin = league?.role === 'owner' || league?.role === 'admin'
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="text-white/40 hover:text-white text-sm">&larr; All Leagues</Link>
          <h1 className="font-display text-xl text-gold mt-1">{league.name}</h1>
        </div>
        {isAdmin && (
          <Link
            to={`/leagues/${leagueId}/events/new`}
            className="btn btn-primary text-sm py-2 px-4"
          >
            + New Game
          </Link>
        )}
      </div>

      {/* Invite Code */}
      {isAdmin && league.invite_code && (
        <div className="card card-gold">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gold uppercase tracking-wider">Invite Code</p>
              <p className="text-gold font-mono text-lg">{league.invite_code}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(league.invite_code)}
              className="btn btn-secondary text-sm"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center">
          <div className="font-display text-2xl text-white">{members.length}</div>
          <div className="text-xs text-white/50">Members</div>
        </div>
        <div className="card text-center">
          <div className="font-display text-2xl text-white">{events.length}</div>
          <div className="text-xs text-white/50">Events</div>
        </div>
        <div className="card text-center">
          <div className="font-display text-2xl text-white">{events.filter(e => e.status === 'scheduled').length}</div>
          <div className="text-xs text-white/50">Upcoming</div>
        </div>
        {pot && (
          <div className="card text-center">
            <div className="font-display text-2xl text-gold">${pot.balance.toFixed(0)}</div>
            <div className="text-xs text-white/50">Pot</div>
          </div>
        )}
      </div>

      {/* Admin Quick Links */}
      {isAdmin && (
        <div className="grid grid-cols-4 gap-2">
          <Link to={`/leagues/${leagueId}/settings?tab=blinds`} className="card text-center py-3 hover:bg-white/5 transition-colors">
            <span className="text-xl">⏱️</span>
            <p className="text-white/50 text-xs mt-1">Blinds</p>
          </Link>
          <Link to={`/leagues/${leagueId}/settings?tab=payouts`} className="card text-center py-3 hover:bg-white/5 transition-colors">
            <span className="text-xl">🏆</span>
            <p className="text-white/50 text-xs mt-1">Payouts</p>
          </Link>
          <Link to={`/leagues/${leagueId}/settings?tab=roles`} className="card text-center py-3 hover:bg-white/5 transition-colors">
            <span className="text-xl">👥</span>
            <p className="text-white/50 text-xs mt-1">Roles</p>
          </Link>
          <Link to={`/leagues/${leagueId}/admin`} className="card text-center py-3 hover:bg-white/5 transition-colors">
            <span className="text-xl">📊</span>
            <p className="text-white/50 text-xs mt-1">Admin</p>
          </Link>
        </div>
      )}

      {/* Events */}
      <div>
        <h2 className="font-display text-lg text-white mb-3">{currentMonth}</h2>
        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📅</div>
            <div className="text-white/60 mb-4">No games scheduled yet</div>
            {isAdmin && (
              <Link to={`/leagues/${leagueId}/events/new`} className="btn btn-primary">
                Schedule First Game
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, idx) => {
              const d = new Date(event.scheduled_at)
              return (
                <Link
                  key={event.id}
                  to={`/leagues/${leagueId}/events/${event.id}`}
                  className={`card flex gap-4 hover:bg-white/5 transition-colors block ${idx === 0 ? 'border-gold/50 border' : ''}`}
                >
                  {/* Date Badge */}
                  <div className="w-14 h-14 bg-gold/20 rounded-xl flex flex-col items-center justify-center shrink-0">
                    <div className="font-display text-xl text-gold">{d.getDate()}</div>
                    <div className="text-xs text-gold/70 uppercase">
                      {d.toLocaleString('default', { month: 'short' })}
                    </div>
                  </div>

                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-white font-semibold truncate">{event.title}</h4>
                      <EventBadge status={event.status} />
                    </div>
                    <p className="text-sm text-white/60 mt-0.5">
                      {d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      {event.location && ` • ${event.location}`}
                    </p>
                    <p className="text-sm text-white/60">
                      {event.buy_in_amount > 0 && `$${parseFloat(event.buy_in_amount).toFixed(0)} buy-in`}
                      {event.max_players > 0 && ` • Max ${event.max_players}`}
                    </p>

                    {/* RSVP Count */}
                    {event.rsvp_count > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          {(event.rsvp_names || []).slice(0, 3).map((name, i) => (
                            <Avatar key={i} name={name} size="xs" />
                          ))}
                        </div>
                        <span className="text-xs text-white/40">
                          {event.rsvp_count} going{event.max_players > 0 ? ` of ${event.max_players}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Top Players */}
      {members.length > 0 && (
        <div>
          <h2 className="font-display text-lg text-gold mb-3">Top Players</h2>
          <div className="card p-0 divide-y divide-white/5">
            {members
              .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
              .slice(0, 5)
              .map((member, idx) => (
                <div key={member.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'bg-gray-700 text-white'
                    }`}>
                      {idx + 1}
                    </div>
                    <Avatar name={member.display_name} size="sm" />
                    <span className="text-white text-sm">{member.display_name}</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-white/50">{member.games_played || 0} games</span>
                    <span className="text-gold font-display">{member.total_points || 0} pts</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Pot */}
      {pot && (
        <PotSection pot={pot} leagueId={leagueId} isAdmin={isAdmin} onUpdate={fetchData} />
      )}
    </div>
  )
}

function EventBadge({ status }) {
  const styles = {
    scheduled: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    active: 'bg-green-500/20 text-green-300 border-green-500/30',
    completed: 'bg-white/10 text-white/50 border-white/10',
    cancelled: 'bg-red-500/20 text-red-300 border-red-500/30'
  }
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border shrink-0 ${styles[status] || styles.scheduled}`}>
      {status}
    </span>
  )
}

function PotSection({ pot, leagueId, isAdmin, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false)
  const [type, setType] = useState('deposit')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/api/pot/league/${leagueId}`, { type, amount: parseFloat(amount), description })
      setShowAdd(false)
      setAmount('')
      setDescription('')
      onUpdate()
    } catch {} finally { setSaving(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg text-gold">League Pot</h2>
        {isAdmin && (
          <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-gold hover:text-gold-dark">+ Add</button>
        )}
      </div>
      <div className="card">
        <div className="font-display text-3xl text-white">${pot.balance.toFixed(2)}</div>
        <p className="text-white/50 text-sm mt-1">Current Balance</p>
      </div>
      {showAdd && (
        <form onSubmit={handleSubmit} className="card mt-3 space-y-3">
          <div className="flex gap-2">
            {['deposit', 'expense', 'adjustment'].map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`px-3 py-1 text-xs rounded-lg ${type === t ? 'bg-gold text-felt-dark' : 'bg-white/10 text-white/60'}`}>
                {t}
              </button>
            ))}
          </div>
          <input type="number" step="0.01" min="0.01" placeholder="Amount" value={amount}
            onChange={e => setAmount(e.target.value)} required className="input" />
          <input type="text" placeholder="Description" value={description}
            onChange={e => setDescription(e.target.value)} required className="input" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}
