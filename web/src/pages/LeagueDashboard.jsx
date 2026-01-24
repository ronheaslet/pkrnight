import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { PageSpinner } from '../components/Spinner'
import { Avatar } from '../components/Avatar'

export function LeagueDashboard() {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const [league, setLeague] = useState(null)
  const [events, setEvents] = useState([])
  const [members, setMembers] = useState([])
  const [rsvps, setRsvps] = useState({})
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

      // Fetch RSVPs for upcoming events
      const upcoming = eventsData.events.filter(e => e.status === 'scheduled' || e.status === 'active')
      const rsvpMap = {}
      await Promise.all(
        upcoming.slice(0, 5).map(async (event) => {
          try {
            const data = await api.get(`/api/rsvps/event/${event.id}`)
            rsvpMap[event.id] = data.rsvps
          } catch {}
        })
      )
      setRsvps(rsvpMap)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRsvp(eventId, status) {
    try {
      await api.post(`/api/rsvps/event/${eventId}`, { status })
      const data = await api.get(`/api/rsvps/event/${eventId}`)
      setRsvps(prev => ({ ...prev, [eventId]: data.rsvps }))
    } catch {}
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

  // Split events into upcoming and past
  const now = new Date()
  const upcoming = events.filter(e => e.status === 'scheduled' || e.status === 'active' || new Date(e.scheduled_at) >= now)
  const past = events.filter(e => e.status === 'completed' || (e.status !== 'active' && new Date(e.scheduled_at) < now))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="text-white/40 hover:text-white text-sm">&larr; All Leagues</Link>
          <h1 className="font-display text-xl text-gold mt-1">{currentMonth}</h1>
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

      {/* Invite Code (compact) */}
      {isAdmin && league.invite_code && (
        <div className="flex items-center gap-3 bg-gold/10 border border-gold/30 rounded-xl px-4 py-2">
          <span className="text-xs text-gold uppercase tracking-wider">Invite:</span>
          <span className="text-gold font-mono text-sm">{league.invite_code}</span>
          <button
            onClick={() => navigator.clipboard.writeText(league.invite_code)}
            className="ml-auto text-xs text-gold/70 hover:text-gold"
          >
            Copy
          </button>
        </div>
      )}

      {/* Events */}
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
        <div className="space-y-4">
          {/* Upcoming Events with RSVP */}
          {upcoming.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              leagueId={leagueId}
              rsvps={rsvps[event.id] || []}
              userId={user?.id}
              isAdmin={isAdmin}
              onRsvp={handleRsvp}
            />
          ))}

          {/* Past Events (collapsed) */}
          {past.length > 0 && (
            <div>
              <h3 className="text-sm text-white/40 uppercase tracking-wider mb-3 mt-6">Past Games</h3>
              <div className="space-y-2">
                {past.slice(0, 5).map((event) => {
                  const d = new Date(event.scheduled_at)
                  return (
                    <Link
                      key={event.id}
                      to={`/leagues/${leagueId}/events/${event.id}`}
                      className="card flex items-center gap-3 hover:bg-white/5 transition-colors py-3"
                    >
                      <div className="w-10 h-10 bg-white/5 rounded-lg flex flex-col items-center justify-center shrink-0">
                        <div className="font-display text-sm text-white/50">{d.getDate()}</div>
                        <div className="text-[9px] text-white/30 uppercase">{d.toLocaleString('default', { month: 'short' })}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-white/60 text-sm truncate block">{event.title}</span>
                      </div>
                      <EventBadge status={event.status} />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3">
          <div className="font-display text-xl text-white">{members.length}</div>
          <div className="text-[10px] text-white/50">Members</div>
        </div>
        <div className="card text-center py-3">
          <div className="font-display text-xl text-white">{events.filter(e => e.status === 'completed').length}</div>
          <div className="text-[10px] text-white/50">Games Played</div>
        </div>
        {pot ? (
          <div className="card text-center py-3">
            <div className="font-display text-xl text-gold">${pot.balance.toFixed(0)}</div>
            <div className="text-[10px] text-white/50">Pot</div>
          </div>
        ) : (
          <div className="card text-center py-3">
            <div className="font-display text-xl text-white">{events.filter(e => e.status === 'scheduled').length}</div>
            <div className="text-[10px] text-white/50">Upcoming</div>
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

      {/* Top Players */}
      {members.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg text-gold">Top Players</h2>
            <Link to={`/leagues/${leagueId}/standings`} className="text-xs text-white/40 hover:text-white">
              View All
            </Link>
          </div>
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

function EventCard({ event, leagueId, rsvps, userId, isAdmin, onRsvp }) {
  const d = new Date(event.scheduled_at)
  const myRsvp = rsvps.find(r => r.user_id === userId)
  const goingList = rsvps.filter(r => r.status === 'going')
  const maybeList = rsvps.filter(r => r.status === 'maybe')
  const spotsLeft = event.max_players > 0 ? event.max_players - goingList.length : null

  return (
    <div className={`card ${event.status === 'active' ? 'border-green-500/50 border' : ''}`}>
      {/* Top: Date + Info + Spots */}
      <Link
        to={`/leagues/${leagueId}/events/${event.id}`}
        className="flex gap-4 hover:opacity-90 transition-opacity"
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
            {event.status === 'active' && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/30 shrink-0">
                LIVE
              </span>
            )}
          </div>
          <p className="text-sm text-white/60 mt-0.5">
            {d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            {event.location && ` \u2022 ${event.location}`}
          </p>
          <p className="text-sm text-white/50">
            {event.buy_in_amount > 0 && `$${parseFloat(event.buy_in_amount).toFixed(0)} buy-in`}
            {event.max_players > 0 && ` \u2022 Max ${event.max_players}`}
          </p>
        </div>

        {/* Spots Left */}
        {spotsLeft !== null && spotsLeft > 0 && (
          <div className="text-right shrink-0">
            <div className="font-display text-lg text-gold">{spotsLeft}</div>
            <div className="text-[10px] text-gold/70">spots</div>
          </div>
        )}
      </Link>

      {/* RSVP Names */}
      {rsvps.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          {goingList.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-green-400">Going:</span>
              {goingList.map(r => (
                <span key={r.id} className="text-xs bg-green-600/20 text-green-300 px-2 py-0.5 rounded-full">
                  {r.display_name}
                </span>
              ))}
            </div>
          )}
          {maybeList.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-yellow-400">Maybe:</span>
              {maybeList.map(r => (
                <span key={r.id} className="text-xs bg-yellow-600/20 text-yellow-300 px-2 py-0.5 rounded-full">
                  {r.display_name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RSVP Buttons */}
      {(event.status === 'scheduled' || event.status === 'active') && (
        <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
          <button
            onClick={() => onRsvp(event.id, 'going')}
            className={`rsvp-btn rsvp-yes text-xs py-2 ${myRsvp?.status === 'going' ? 'active' : ''}`}
          >
            ✓ Going
          </button>
          <button
            onClick={() => onRsvp(event.id, 'maybe')}
            className={`rsvp-btn rsvp-maybe text-xs py-2 ${myRsvp?.status === 'maybe' ? 'active' : ''}`}
          >
            ? Maybe
          </button>
          <button
            onClick={() => onRsvp(event.id, 'not_going')}
            className={`rsvp-btn rsvp-no text-xs py-2 ${myRsvp?.status === 'not_going' ? 'active' : ''}`}
          >
            ✗ Can't
          </button>
        </div>
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
