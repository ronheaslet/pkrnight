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
        <Link to="/" className="text-pkr-gold-400 hover:underline">Back to Leagues</Link>
      </div>
    )
  }

  const isAdmin = league?.role === 'owner' || league?.role === 'admin'

  // Group events by month
  const monthGroups = {}
  for (const evt of events) {
    const d = new Date(evt.scheduled_at)
    const key = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`
    if (!monthGroups[key]) monthGroups[key] = []
    monthGroups[key].push(evt)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/" className="text-pkr-gold-300/60 hover:text-pkr-gold-300 text-sm">&larr; All Leagues</Link>
          <h1 className="text-2xl font-display font-bold text-pkr-gold-400 mt-1">{league.name}</h1>
          {league.description && <p className="text-pkr-gold-300/50 text-sm mt-1">{league.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Link
              to={`/leagues/${leagueId}/events/new`}
              className="px-4 py-2 text-sm bg-pkr-gold-500 text-pkr-green-900 font-medium rounded-lg hover:bg-pkr-gold-400 transition-colors"
            >
              New Event
            </Link>
          )}
          {isAdmin && (
            <Link
              to={`/leagues/${leagueId}/settings`}
              className="px-4 py-2 text-sm bg-pkr-green-700 text-pkr-gold-300 rounded-lg hover:bg-pkr-green-600 transition-colors"
            >
              Settings
            </Link>
          )}
        </div>
      </div>

      {/* Invite Code */}
      {isAdmin && league.invite_code && (
        <div className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-pkr-gold-300/50 uppercase">Invite Code</p>
              <p className="text-pkr-gold-400 font-mono text-lg">{league.invite_code}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(league.invite_code)}
              className="px-3 py-1.5 text-sm bg-pkr-green-700 text-pkr-gold-300 rounded hover:bg-pkr-green-600"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Members" value={members.length} />
        <StatCard label="Events" value={events.length} />
        <StatCard label="Upcoming" value={events.filter(e => e.status === 'scheduled').length} />
        {pot && <StatCard label="Pot" value={`$${pot.balance.toFixed(0)}`} />}
      </div>

      {/* Admin Quick Links */}
      {isAdmin && (
        <div className="grid grid-cols-4 gap-2">
          <Link to={`/leagues/${leagueId}/settings?tab=blinds`} className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-3 text-center hover:border-pkr-gold-500/30 transition-colors">
            <span className="text-xl">⏱️</span>
            <p className="text-pkr-gold-300/60 text-xs mt-1">Blinds</p>
          </Link>
          <Link to={`/leagues/${leagueId}/settings?tab=payouts`} className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-3 text-center hover:border-pkr-gold-500/30 transition-colors">
            <span className="text-xl">🏆</span>
            <p className="text-pkr-gold-300/60 text-xs mt-1">Payouts</p>
          </Link>
          <Link to={`/leagues/${leagueId}/settings?tab=roles`} className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-3 text-center hover:border-pkr-gold-500/30 transition-colors">
            <span className="text-xl">👥</span>
            <p className="text-pkr-gold-300/60 text-xs mt-1">Roles</p>
          </Link>
          <Link to={`/leagues/${leagueId}/admin`} className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-3 text-center hover:border-pkr-gold-500/30 transition-colors">
            <span className="text-xl">📊</span>
            <p className="text-pkr-gold-300/60 text-xs mt-1">Admin</p>
          </Link>
        </div>
      )}

      {/* Events by Month */}
      <div>
        <h2 className="text-lg font-display font-semibold text-pkr-gold-400 mb-3">Events</h2>
        {events.length === 0 ? (
          <div className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-6 text-center">
            <p className="text-pkr-gold-300/50">No events yet.</p>
            {isAdmin && <p className="text-pkr-gold-300/30 text-sm mt-1">Create your first event to get started.</p>}
          </div>
        ) : (
          Object.entries(monthGroups).map(([month, monthEvents]) => (
            <div key={month} className="mb-6">
              <h3 className="text-sm text-pkr-gold-300/50 uppercase tracking-wider mb-3">{month}</h3>
              <div className="space-y-3">
                {monthEvents.map(event => {
                  const d = new Date(event.scheduled_at)
                  return (
                    <Link
                      key={event.id}
                      to={`/leagues/${leagueId}/events/${event.id}`}
                      className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-4 flex gap-4 hover:border-pkr-gold-500/30 transition-colors block"
                    >
                      {/* Date Badge */}
                      <div className="shrink-0 w-14 text-center">
                        <p className="text-2xl font-bold text-white">{d.getDate()}</p>
                        <p className="text-xs uppercase text-pkr-gold-400">{d.toLocaleString('default', { month: 'short' })}</p>
                      </div>

                      {/* Event Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-white font-medium truncate">{event.title}</h4>
                          <EventBadge status={event.status} />
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-pkr-gold-300/50">
                          <span>{d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                          {event.location && <span>{event.location}</span>}
                          {event.buy_in_amount > 0 && <span className="text-pkr-gold-400">${parseFloat(event.buy_in_amount).toFixed(0)} buy-in</span>}
                          {event.max_players > 0 && <span>Max {event.max_players}</span>}
                        </div>

                        {/* RSVP Count */}
                        {event.rsvp_count > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex -space-x-1.5">
                              {(event.rsvp_names || []).slice(0, 3).map((name, i) => (
                                <Avatar key={i} name={name} size="sm" />
                              ))}
                            </div>
                            <span className="text-xs text-pkr-gold-300/40">
                              {event.rsvp_count} going{event.max_players > 0 ? ` of ${event.max_players}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Top Players */}
      {members.length > 0 && (
        <div>
          <h2 className="text-lg font-display font-semibold text-pkr-gold-400 mb-3">Top Players</h2>
          <div className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg divide-y divide-pkr-green-700/50">
            {members
              .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
              .slice(0, 5)
              .map((member, idx) => (
                <div key={member.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-pkr-gold-300/40 text-sm w-5">{idx + 1}.</span>
                    <Avatar name={member.display_name} size="sm" />
                    <span className="text-white text-sm">{member.display_name}</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-pkr-gold-300/50">{member.games_played || 0} games</span>
                    <span className="text-pkr-gold-400">{member.total_points || 0} pts</span>
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

function StatCard({ label, value }) {
  return (
    <div className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-4 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-pkr-gold-300/50 text-sm">{label}</p>
    </div>
  )
}

function EventBadge({ status }) {
  const styles = {
    scheduled: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    active: 'bg-green-500/20 text-green-300 border-green-500/30',
    completed: 'bg-pkr-green-700 text-pkr-gold-300/60 border-pkr-green-600',
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
        <h2 className="text-lg font-display font-semibold text-pkr-gold-400">League Pot</h2>
        {isAdmin && (
          <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-pkr-gold-400 hover:text-pkr-gold-300">+ Add</button>
        )}
      </div>
      <div className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-4">
        <p className="text-3xl font-bold text-white">${pot.balance.toFixed(2)}</p>
        <p className="text-pkr-gold-300/50 text-sm mt-1">Current Balance</p>
      </div>
      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-4 mt-3 space-y-3">
          <div className="flex gap-2">
            {['deposit', 'expense', 'adjustment'].map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`px-3 py-1 text-xs rounded ${type === t ? 'bg-pkr-gold-500 text-pkr-green-900' : 'bg-pkr-green-700 text-pkr-gold-300/60'}`}>
                {t}
              </button>
            ))}
          </div>
          <input type="number" step="0.01" min="0.01" placeholder="Amount" value={amount}
            onChange={e => setAmount(e.target.value)} required
            className="w-full px-3 py-2 bg-pkr-green-900 text-white rounded border border-pkr-green-700/50 text-sm placeholder-pkr-gold-300/30 focus:border-pkr-gold-500 focus:outline-none" />
          <input type="text" placeholder="Description" value={description}
            onChange={e => setDescription(e.target.value)} required
            className="w-full px-3 py-2 bg-pkr-green-900 text-white rounded border border-pkr-green-700/50 text-sm placeholder-pkr-gold-300/30 focus:border-pkr-gold-500 focus:outline-none" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm bg-pkr-gold-500 text-pkr-green-900 rounded hover:bg-pkr-gold-400 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-pkr-gold-300/50 hover:text-white">Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}
