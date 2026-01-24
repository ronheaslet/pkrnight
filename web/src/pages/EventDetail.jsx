import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { PageSpinner } from '../components/Spinner'

export function EventDetail() {
  const { leagueId, eventId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [session, setSession] = useState(null)
  const [participants, setParticipants] = useState([])
  const [timeline, setTimeline] = useState([])
  const [rsvps, setRsvps] = useState([])
  const [league, setLeague] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [rsvpLoading, setRsvpLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    try {
      const [eventData, leagueData, rsvpData] = await Promise.all([
        api.get(`/api/events/${eventId}`),
        api.get(`/api/leagues/${leagueId}`),
        api.get(`/api/rsvps/event/${eventId}`)
      ])
      setEvent(eventData.event)
      setLeague(leagueData.league)
      setRsvps(rsvpData.rsvps)

      if (eventData.event.session_id) {
        const gameData = await api.get(`/api/games/${eventData.event.session_id}`)
        setSession(gameData.session)
        setParticipants(gameData.participants)
        if (gameData.timeline) setTimeline(gameData.timeline)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRsvp(status) {
    setRsvpLoading(true)
    try {
      await api.post(`/api/rsvps/event/${eventId}`, { status })
      const rsvpData = await api.get(`/api/rsvps/event/${eventId}`)
      setRsvps(rsvpData.rsvps)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setRsvpLoading(false)
    }
  }

  async function handleCreateSession() {
    setActionLoading(true)
    setActionError('')
    try {
      const data = await api.post('/api/games/create', { eventId })
      setSession(data.session)
      await fetchData()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRegister() {
    setActionLoading(true)
    setActionError('')
    try {
      await api.post(`/api/games/${session.id}/register`, {})
      await fetchData()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUnregister() {
    setActionLoading(true)
    setActionError('')
    try {
      await api.delete(`/api/games/${session.id}/register`)
      await fetchData()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleEnterGame() {
    navigate(`/games/${session.id}`)
  }

  async function handleDeleteEvent() {
    if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return
    setActionLoading(true)
    setActionError('')
    try {
      await api.delete(`/api/events/${eventId}`)
      navigate(`/leagues/${leagueId}`)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <PageSpinner />

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <Link to={`/leagues/${leagueId}`} className="text-gold hover:underline">Back to Dashboard</Link>
      </div>
    )
  }

  const isAdmin = league?.role === 'owner' || league?.role === 'admin'
  const isRegistered = participants.some(p => p.user_id === user?.id)
  const isPending = session?.status === 'pending'
  const isRunning = session?.status === 'running' || session?.status === 'paused'
  const isCompleted = session?.status === 'completed'

  const rawRsvp = rsvps.find(r => r.user_id === user?.id)
  const myRsvp = rawRsvp || (isRegistered ? { status: 'going' } : null)
  const goingList = rsvps.filter(r => r.status === 'going')
  const maybeList = rsvps.filter(r => r.status === 'maybe')
  const notGoingList = rsvps.filter(r => r.status === 'not_going')

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link to={`/leagues/${leagueId}`} className="text-white/40 hover:text-white text-sm">&larr; {league?.name || 'Dashboard'}</Link>

      {/* Event Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">{event.title}</h1>
            {event.description && <p className="text-white/50 mt-1">{event.description}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-white/60">
              <span>
                {new Date(event.scheduled_at).toLocaleDateString(undefined, {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit'
                })}
              </span>
              {event.location && <span>{event.location}</span>}
            </div>
          </div>
          <StatusBadge status={session?.status || event.status} />
        </div>

        {/* Buy-in info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <p className="text-white/50 text-xs uppercase">Buy-in</p>
            <p className="text-gold font-display text-lg mt-0.5">{event.buy_in_amount > 0 ? `$${parseFloat(event.buy_in_amount).toFixed(0)}` : 'Free'}</p>
          </div>
          <div className="text-center">
            <p className="text-white/50 text-xs uppercase">Rebuys</p>
            <p className="text-white font-medium mt-0.5">{event.max_rebuys > 0 ? `${event.max_rebuys} ($${parseFloat(event.rebuy_amount || 0).toFixed(0)})` : 'None'}</p>
          </div>
          <div className="text-center">
            <p className="text-white/50 text-xs uppercase">Players</p>
            <p className="text-white font-medium mt-0.5">{session?.player_count || participants.length || '0'}</p>
          </div>
          <div className="text-center">
            <p className="text-white/50 text-xs uppercase">Prize Pool</p>
            <p className="text-gold font-display text-lg mt-0.5">{session?.prize_pool > 0 ? `$${parseFloat(session.prize_pool).toFixed(0)}` : '-'}</p>
          </div>
        </div>

        {event.rebuy_cutoff_level > 0 && (
          <div className="mt-3 text-sm text-white/50">
            Rebuys close after Level {event.rebuy_cutoff_level}
          </div>
        )}
      </div>

      {/* RSVP Section */}
      {!isCompleted && (
        <div className="card">
          <div className="text-xs text-white/50 mb-3">Your Response</div>
          <div className="flex gap-2">
            <button
              onClick={() => handleRsvp('going')}
              disabled={rsvpLoading}
              className={`rsvp-btn rsvp-yes ${myRsvp?.status === 'going' ? 'active' : ''}`}
            >
              ✓ Going ({goingList.length})
            </button>
            <button
              onClick={() => handleRsvp('maybe')}
              disabled={rsvpLoading}
              className={`rsvp-btn rsvp-maybe ${myRsvp?.status === 'maybe' ? 'active' : ''}`}
            >
              ? Maybe ({maybeList.length})
            </button>
            <button
              onClick={() => handleRsvp('not_going')}
              disabled={rsvpLoading}
              className={`rsvp-btn rsvp-no ${myRsvp?.status === 'not_going' ? 'active' : ''}`}
            >
              ✗ Can't ({notGoingList.length})
            </button>
          </div>

          {/* RSVP Lists */}
          {rsvps.length > 0 && (
            <div className="space-y-3 mt-4 pt-4 border-t border-white/10">
              {goingList.length > 0 && (
                <div>
                  <div className="text-xs text-green-400 mb-2">✓ Going ({goingList.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {goingList.map(r => (
                      <span key={r.id} className="flex items-center gap-1.5 bg-green-600/20 px-2 py-1 rounded-full text-xs text-white">{r.display_name}</span>
                    ))}
                  </div>
                </div>
              )}
              {maybeList.length > 0 && (
                <div>
                  <div className="text-xs text-yellow-400 mb-2">? Maybe ({maybeList.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {maybeList.map(r => (
                      <span key={r.id} className="flex items-center gap-1.5 bg-yellow-600/20 px-2 py-1 rounded-full text-xs text-white/70">{r.display_name}</span>
                    ))}
                  </div>
                </div>
              )}
              {notGoingList.length > 0 && (
                <div>
                  <div className="text-xs text-red-400 mb-2">✗ Can't Go ({notGoingList.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {notGoingList.map(r => (
                      <span key={r.id} className="flex items-center gap-1.5 bg-red-600/20 px-2 py-1 rounded-full text-xs text-white/50">{r.display_name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Error */}
      {actionError && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-xl text-sm">
          {actionError}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {isAdmin && !session && (
          <button onClick={handleCreateSession} disabled={actionLoading} className="btn btn-primary disabled:opacity-50">
            {actionLoading ? 'Creating...' : 'Create Game Session'}
          </button>
        )}
        {session && isPending && !isRegistered && (
          <button onClick={handleRegister} disabled={actionLoading} className="btn btn-primary disabled:opacity-50">
            {actionLoading ? 'Registering...' : 'Register for Game'}
          </button>
        )}
        {isRegistered && isPending && (
          <>
            <span className="btn bg-green-600/20 text-green-400 border border-green-500/30">Registered</span>
            <button onClick={handleUnregister} disabled={actionLoading} className="text-sm text-white/50 hover:text-red-400">
              Unregister
            </button>
          </>
        )}
        {session && (isPending || isRunning) && (
          <button onClick={handleEnterGame} className="btn bg-chip-blue text-white hover:opacity-80">
            {isRunning ? 'Enter Game (Live)' : 'View Game'}
          </button>
        )}
        {session && isCompleted && (
          <button onClick={handleEnterGame} className="btn btn-secondary">
            View Results
          </button>
        )}
        {isAdmin && !isCompleted && (
          <button onClick={handleDeleteEvent} disabled={actionLoading} className="btn btn-danger disabled:opacity-50">
            {actionLoading ? 'Deleting...' : 'Delete Event'}
          </button>
        )}
      </div>

      {/* Participants */}
      {participants.length > 0 && (
        <div>
          <h2 className="font-display text-lg text-gold mb-3">
            {isCompleted ? 'Results' : 'Registered Players'}
          </h2>
          <div className="card p-0 divide-y divide-white/5">
            {participants
              .sort((a, b) => {
                if (isCompleted) return (a.finish_position || 99) - (b.finish_position || 99)
                return 0
              })
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    {isCompleted && p.finish_position && (
                      <span className={`text-sm font-bold w-6 ${p.finish_position === 1 ? 'text-yellow-400' : p.finish_position === 2 ? 'text-gray-300' : p.finish_position === 3 ? 'text-amber-600' : 'text-white/40'}`}>
                        #{p.finish_position}
                      </span>
                    )}
                    <span className="text-white text-sm">{p.display_name}</span>
                    {p.status === 'playing' && <span className="w-2 h-2 rounded-full bg-green-400" />}
                    {p.status === 'eliminated' && <span className="text-white/40 text-xs">(out)</span>}
                    {p.status === 'winner' && <span className="text-yellow-400 text-xs">Winner</span>}
                  </div>
                  <div className="flex gap-3 text-sm text-white/50">
                    {p.bounty_count > 0 && <span className="text-chip-red">{p.bounty_count} KO</span>}
                    {p.rebuy_count > 0 && <span>{p.rebuy_count}R</span>}
                    {isCompleted && p.winnings > 0 && (
                      <span className="text-gold">${parseFloat(p.winnings).toFixed(0)}</span>
                    )}
                    {isCompleted && p.points_earned > 0 && (
                      <span>{p.points_earned} pts</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Game Timeline */}
      {isCompleted && timeline.length > 0 && (
        <div>
          <h2 className="font-display text-lg text-gold mb-3">Game Timeline</h2>
          <div className="card space-y-2">
            {timeline.map((evt, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-white/30 text-xs whitespace-nowrap mt-0.5">
                  {new Date(evt.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
                <TimelineEvent event={evt} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    scheduled: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    pending: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    running: 'bg-green-500/20 text-green-300 border border-green-500/30',
    paused: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    completed: 'bg-white/10 text-white/50 border border-white/10',
    cancelled: 'bg-red-500/20 text-red-300 border border-red-500/30'
  }
  return (
    <span className={`px-3 py-1 text-sm rounded-full ${styles[status] || styles.scheduled}`}>
      {status || 'scheduled'}
    </span>
  )
}

function TimelineEvent({ event }) {
  const data = event.event_data ? (typeof event.event_data === 'string' ? JSON.parse(event.event_data) : event.event_data) : {}

  const messages = {
    GAME_STARTED: () => <span className="text-gold">Game started</span>,
    PLAYER_REGISTERED: () => <span className="text-white/70"><span className="text-white">{data.playerName || 'Player'}</span> registered</span>,
    PLAYER_ELIMINATED: () => <span className="text-red-400"><span className="text-white">{data.playerName || 'Player'}</span> eliminated{data.eliminatorName ? ` by ${data.eliminatorName}` : ''} (#{data.position})</span>,
    PLAYER_REBUY: () => <span className="text-yellow-400"><span className="text-white">{data.playerName || 'Player'}</span> rebought in</span>,
    GAME_ENDED: () => <span className="text-chip-blue">Game completed</span>,
    TIMER_PAUSED: () => <span className="text-white/50">Timer paused</span>,
    TIMER_RESUMED: () => <span className="text-white/50">Timer resumed</span>,
    BLIND_LEVEL_UP: () => <span className="text-purple-400">Blinds up to Level {data.level}</span>
  }

  const render = messages[event.event_type]
  if (!render) return <span className="text-white/40">{event.event_type}</span>
  return render()
}
