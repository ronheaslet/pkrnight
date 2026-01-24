import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { PageSpinner } from '../components/Spinner'
import { Chat } from '../components/Chat'

export function LeagueDashboard() {
  const { leagueId } = useParams()
  const [league, setLeague] = useState(null)
  const [events, setEvents] = useState([])
  const [members, setMembers] = useState([])
  const [pot, setPot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showChat, setShowChat] = useState(false)

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
        <Link to="/" className="text-green-400 hover:underline">Back to Leagues</Link>
      </div>
    )
  }

  const isAdmin = league?.role === 'owner' || league?.role === 'admin'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/" className="text-gray-400 hover:text-white text-sm">&larr; All Leagues</Link>
          <h1 className="text-2xl font-bold text-white mt-1">{league.name}</h1>
          {league.description && <p className="text-gray-400 text-sm mt-1">{league.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/leagues/${leagueId}/standings`}
            className="px-4 py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Standings
          </Link>
          <Link
            to={`/leagues/${leagueId}/members`}
            className="px-4 py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Members ({members.length})
          </Link>
          {isAdmin && (
            <Link
              to={`/leagues/${leagueId}/admin`}
              className="px-4 py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Admin
            </Link>
          )}
          {isAdmin && (
            <Link
              to={`/leagues/${leagueId}/settings`}
              className="px-4 py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Settings
            </Link>
          )}
          {isAdmin && (
            <Link
              to={`/leagues/${leagueId}/events/new`}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              New Event
            </Link>
          )}
        </div>
      </div>

      {/* Invite Code (admin) */}
      {isAdmin && league.invite_code && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Invite Code</p>
              <p className="text-white font-mono text-lg">{league.invite_code}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(league.invite_code)}
              className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Members" value={members.length} />
        <StatCard label="Events" value={events.length} />
        <StatCard label="Upcoming" value={events.filter(e => e.status === 'scheduled').length} />
        <StatCard label="Completed" value={events.filter(e => e.status === 'completed').length} />
      </div>

      {/* Events List */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Events</h2>
        {events.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
            <p className="text-gray-400">No events yet.</p>
            {isAdmin && <p className="text-gray-500 text-sm mt-1">Create your first event to get started.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link
                key={event.id}
                to={`/leagues/${leagueId}/events/${event.id}`}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-green-600 transition-colors block"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">{event.title}</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {new Date(event.scheduled_at).toLocaleDateString(undefined, {
                        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={event.status} />
                    {event.buy_in_amount > 0 && (
                      <p className="text-green-400 text-sm mt-1">${parseFloat(event.buy_in_amount).toFixed(0)} buy-in</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Top Members */}
      {members.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Top Players</h2>
          <div className="bg-gray-800 border border-gray-700 rounded-lg divide-y divide-gray-700">
            {members
              .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
              .slice(0, 5)
              .map((member, idx) => (
                <div key={member.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm w-5">{idx + 1}.</span>
                    <span className="text-white">{member.display_name}</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-400">{member.games_played || 0} games</span>
                    <span className="text-green-400">{member.total_points || 0} pts</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Pot Balance */}
      {pot && (
        <PotSection pot={pot} leagueId={leagueId} isAdmin={isAdmin} onUpdate={fetchData} />
      )}

      {/* Floating Chat Panel */}
      {showChat && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-80 z-50 shadow-2xl">
          <Chat leagueId={leagueId} alwaysExpanded onClose={() => setShowChat(false)} />
        </div>
      )}

      {/* Floating Chat Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all z-40 ${showChat ? 'hidden' : 'bg-green-600 hover:bg-green-700 text-white'}`}
        title="League Chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    scheduled: 'bg-blue-900 text-blue-300',
    active: 'bg-green-900 text-green-300',
    completed: 'bg-gray-700 text-gray-300',
    cancelled: 'bg-red-900 text-red-300'
  }
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${styles[status] || styles.scheduled}`}>
      {status}
    </span>
  )
}

function PotSection({ pot, leagueId, isAdmin, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [type, setType] = useState('deposit')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/api/pot/league/${leagueId}`, {
        type, amount: parseFloat(amount), description
      })
      setShowAdd(false)
      setAmount('')
      setDescription('')
      onUpdate()
    } catch {} finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">League Pot</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory(!showHistory)} className="text-xs text-gray-400 hover:text-white">
            {showHistory ? 'Hide' : 'History'}
          </button>
          {isAdmin && (
            <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-green-400 hover:text-green-300">
              + Add
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p className="text-3xl font-bold text-white">${pot.balance.toFixed(2)}</p>
        <p className="text-gray-400 text-sm mt-1">Current Balance</p>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-3 space-y-3">
          <div className="flex gap-2">
            {['deposit', 'expense', 'adjustment'].map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`px-3 py-1 text-xs rounded ${type === t ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                {t}
              </button>
            ))}
          </div>
          <input type="number" step="0.01" min="0.01" placeholder="Amount" value={amount}
            onChange={e => setAmount(e.target.value)} required
            className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none" />
          <input type="text" placeholder="Description" value={description}
            onChange={e => setDescription(e.target.value)} required
            className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
          </div>
        </form>
      )}

      {showHistory && pot.transactions.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg mt-3 divide-y divide-gray-700">
          {pot.transactions.slice(0, 10).map(tx => (
            <div key={tx.id} className="px-4 py-2 flex items-center justify-between">
              <div>
                <p className="text-sm text-white">{tx.description}</p>
                <p className="text-xs text-gray-500">{tx.recorded_by_name} &middot; {new Date(tx.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`text-sm font-medium ${parseFloat(tx.amount) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {parseFloat(tx.amount) >= 0 ? '+' : ''}${parseFloat(tx.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
