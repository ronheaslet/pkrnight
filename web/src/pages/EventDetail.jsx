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

      // Check if game session exists
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
        <Link to={`/leagues/${leagueId}`} className="text-green-400 hover:underline">Back to Dashboard</Link>
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
      <Link to={`/leagues/${leagueId}`} className="text-gray-400 hover:text-white text-sm">&larr; {league?.name || 'Dashboard'}</Link>

      {/* Event Header */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{event.title}</h1>
            {event.description && <p className="text-gray-400 mt-1">{event.description}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-400">
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
          <InfoItem label="Buy-in" value={event.buy_in_amount > 0 ? `$${parseFloat(event.buy_in_amount).toFixed(0)}` : 'Free'} />
          <InfoItem label="Rebuys" value={event.max_rebuys > 0 ? `${event.max_rebuys} ($${parseFloat(event.rebuy_amount || 0).toFixed(0)})` : 'None'} />
          <InfoItem label="Players" value={session?.player_count || participants.length || '0'} />
          <InfoItem label="Prize Pool" value={session?.prize_pool > 0 ? `$${parseFloat(session.prize_pool).toFixed(0)}` : '-'} />
        </div>

        {/* Rebuy cutoff info */}
        {event.rebuy_cutoff_level > 0 && (
          <div className="mt-3 text-sm text-gray-400">
            Rebuys close after Level {event.rebuy_cutoff_level}
          </div>
        )}
      </div>

      {/* RSVP Section */}
      {!isCompleted && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-3">RSVP</h2>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => handleRsvp('going')}
              disabled={rsvpLoading}
              className={`px-4 py-2 text-sm rounded transition-colors ${myRsvp?.status === 'going' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              Going ({goingList.length})
            </button>
            <button
              onClick={() => handleRsvp('maybe')}
              disabled={rsvpLoading}
              className={`px-4 py-2 text-sm rounded transition-colors ${myRsvp?.status === 'maybe' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              Maybe ({maybeList.length})
            </button>
            <button
              onClick={() => handleRsvp('not_going')}
              disabled={rsvpLoading}
              className={`px-4 py-2 text-sm rounded transition-colors ${myRsvp?.status === 'not_going' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              Can't Go ({notGoingList.length})
            </button>
          </div>

          {/* RSVP Lists */}
          {rsvps.length > 0 && (
            <div className="space-y-2">
              {goingList.length > 0 && (
                <div>
                  <span className="text-green-400 text-xs uppercase font-medium">Going</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {goingList.map(r => (
                      <span key={r.id} className="text-sm text-white bg-gray-700 px-2 py-0.5 rounded">{r.display_name}</span>
                    ))}
                  </div>
                </div>
              )}
              {maybeList.length > 0 && (
                <div>
                  <span className="text-yellow-400 text-xs uppercase font-medium">Maybe</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {maybeList.map(r => (
                      <span key={r.id} className="text-sm text-gray-300 bg-gray-700 px-2 py-0.5 rounded">{r.display_name}</span>
                    ))}
                  </div>
                </div>
              )}
              {notGoingList.length > 0 && (
                <div>
                  <span className="text-red-400 text-xs uppercase font-medium">Can't Go</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {notGoingList.map(r => (
                      <span key={r.id} className="text-sm text-gray-500 bg-gray-700 px-2 py-0.5 rounded">{r.display_name}</span>
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
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
          {actionError}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {/* Admin: Create game session */}
        {isAdmin && !session && (
          <button
            onClick={handleCreateSession}
            disabled={actionLoading}
            className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Creating...' : 'Create Game Session'}
          </button>
        )}

        {/* Player: Register for game */}
        {session && isPending && !isRegistered && (
          <button
            onClick={handleRegister}
            disabled={actionLoading}
            className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Registering...' : 'Register for Game'}
          </button>
        )}

        {/* Registered indicator + unregister */}
        {isRegistered && isPending && (
          <>
            <span className="px-5 py-2 bg-green-900/50 text-green-300 rounded border border-green-700">
              Registered
            </span>
            <button
              onClick={handleUnregister}
              disabled={actionLoading}
              className="px-5 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
              Unregister
            </button>
          </>
        )}

        {/* Enter game */}
        {session && (isPending || isRunning) && (
          <button
            onClick={handleEnterGame}
            className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {isRunning ? 'Enter Game (Live)' : 'View Game'}
          </button>
        )}

        {/* View completed game */}
        {session && isCompleted && (
          <button
            onClick={handleEnterGame}
            className="px-5 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            View Results
          </button>
        )}

        {/* Admin: Delete event (only if no completed game) */}
        {isAdmin && !isCompleted && (
          <button
            onClick={handleDeleteEvent}
            disabled={actionLoading}
            className="px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Deleting...' : 'Delete Event'}
          </button>
        )}
      </div>

      {/* Participants */}
      {participants.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">
            {isCompleted ? 'Results' : 'Registered Players'}
          </h2>
          <div className="bg-gray-800 border border-gray-700 rounded-lg divide-y divide-gray-700">
            {participants
              .sort((a, b) => {
                if (isCompleted) return (a.finish_position || 99) - (b.finish_position || 99)
                return 0
              })
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    {isCompleted && p.finish_position && (
                      <span className={`text-sm font-medium w-6 ${p.finish_position === 1 ? 'text-yellow-400' : 'text-gray-500'}`}>
                        #{p.finish_position}
                      </span>
                    )}
                    <span className="text-white">{p.display_name}</span>
                    {p.status === 'playing' && <span className="w-2 h-2 rounded-full bg-green-400" />}
                    {p.status === 'eliminated' && <span className="text-gray-500 text-xs">(eliminated)</span>}
                    {p.status === 'winner' && <span className="text-yellow-400 text-xs">Winner</span>}
                  </div>
                  <div className="flex gap-3 text-sm text-gray-400">
                    {p.bounty_count > 0 && <span>{p.bounty_count} KO</span>}
                    {p.rebuy_count > 0 && <span>{p.rebuy_count} rebuy</span>}
                    {isCompleted && p.winnings > 0 && (
                      <span className="text-green-400">${parseFloat(p.winnings).toFixed(0)}</span>
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
          <h2 className="text-lg font-semibold text-white mb-3">Game Timeline</h2>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="space-y-2">
              {timeline.map((evt, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className="text-gray-600 text-xs whitespace-nowrap mt-0.5">
                    {new Date(evt.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <TimelineEvent event={evt} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-gray-400 text-xs uppercase">{label}</p>
      <p className="text-white font-medium mt-0.5">{value}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    scheduled: 'bg-blue-900 text-blue-300',
    pending: 'bg-yellow-900 text-yellow-300',
    running: 'bg-green-900 text-green-300',
    paused: 'bg-yellow-900 text-yellow-300',
    completed: 'bg-gray-700 text-gray-300',
    cancelled: 'bg-red-900 text-red-300'
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
    GAME_STARTED: () => <span className="text-green-400">Game started</span>,
    PLAYER_REGISTERED: () => <span className="text-gray-300"><span className="text-white">{data.playerName || 'Player'}</span> registered</span>,
    PLAYER_ELIMINATED: () => <span className="text-red-400"><span className="text-white">{data.playerName || 'Player'}</span> eliminated{data.eliminatorName ? ` by ${data.eliminatorName}` : ''} (#{data.position})</span>,
    PLAYER_REBUY: () => <span className="text-yellow-400"><span className="text-white">{data.playerName || 'Player'}</span> rebought in</span>,
    GAME_ENDED: () => <span className="text-blue-400">Game completed</span>,
    TIMER_PAUSED: () => <span className="text-gray-400">Timer paused</span>,
    TIMER_RESUMED: () => <span className="text-gray-400">Timer resumed</span>,
    BLIND_LEVEL_UP: () => <span className="text-purple-400">Blinds up to Level {data.level}</span>
  }

  const render = messages[event.event_type]
  if (!render) return <span className="text-gray-500">{event.event_type}</span>
  return render()
}
