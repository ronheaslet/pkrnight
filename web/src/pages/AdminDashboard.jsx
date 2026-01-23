import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { PageSpinner } from '../components/Spinner'

export function AdminDashboard() {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [league, setLeague] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [trophyLoading, setTrophyLoading] = useState(false)
  const [trophyResult, setTrophyResult] = useState(null)

  useEffect(() => {
    fetchData()
  }, [leagueId])

  async function fetchData() {
    try {
      const [leagueData, statsData] = await Promise.all([
        api.get(`/api/leagues/${leagueId}`),
        api.get(`/api/leagues/${leagueId}/admin-stats`)
      ])

      const league = leagueData.league
      if (league.role !== 'owner' && league.role !== 'admin') {
        navigate(`/leagues/${leagueId}`)
        return
      }

      setLeague(league)
      setStats(statsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCalculateTrophies() {
    setTrophyLoading(true)
    setTrophyResult(null)
    try {
      const data = await api.post(`/api/trophies/league/${leagueId}/calculate`, {
        year: new Date().getFullYear()
      })
      setTrophyResult(data)
    } catch (err) {
      setTrophyResult({ error: err.message })
    } finally {
      setTrophyLoading(false)
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

  const { members, events, games, activity } = stats

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/leagues/${leagueId}`} className="text-gray-400 hover:text-white text-sm">&larr; {league?.name || 'Dashboard'}</Link>
        <h1 className="text-2xl font-bold text-white mt-1">Admin Dashboard</h1>
      </div>

      {/* Stats Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Active Members" value={members.active} sub={`${members.paid} paid`} />
        <StatTile label="Events" value={events.total} sub={`${events.upcoming} upcoming`} />
        <StatTile label="Games Completed" value={games.total} sub={`${parseInt(games.total_entries)} entries`} />
        <StatTile label="Total Prize Pool" value={`$${parseFloat(games.total_prize_pool).toFixed(0)}`} sub={`${parseInt(games.total_rebuys)} rebuys`} />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to={`/leagues/${leagueId}/events/new`}
            className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-green-600 transition-colors"
          >
            <span className="text-2xl">+</span>
            <div>
              <p className="text-white font-medium">Create Event</p>
              <p className="text-gray-400 text-sm">Schedule a new tournament</p>
            </div>
          </Link>
          <Link
            to={`/leagues/${leagueId}/members`}
            className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-green-600 transition-colors"
          >
            <span className="text-2xl">@</span>
            <div>
              <p className="text-white font-medium">Manage Members</p>
              <p className="text-gray-400 text-sm">{members.active} active members</p>
            </div>
          </Link>
          <Link
            to={`/leagues/${leagueId}/settings`}
            className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-green-600 transition-colors"
          >
            <span className="text-2xl">*</span>
            <div>
              <p className="text-white font-medium">League Settings</p>
              <p className="text-gray-400 text-sm">Configure structures</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Trophies Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Trophies</h2>
          <button
            onClick={handleCalculateTrophies}
            disabled={trophyLoading}
            className="px-4 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 transition-colors"
          >
            {trophyLoading ? 'Calculating...' : `Calculate ${new Date().getFullYear()} Trophies`}
          </button>
        </div>
        <p className="text-gray-400 text-sm mb-3">
          Awards trophies to top performers: Points Champion, Bounty King, Money Maker, Most Wins, Iron Player.
        </p>
        {trophyResult && !trophyResult.error && (
          <div className="bg-green-900/30 border border-green-700 rounded p-3 text-sm">
            <p className="text-green-300 font-medium mb-1">Trophies awarded for {trophyResult.seasonYear}:</p>
            <ul className="space-y-1">
              {trophyResult.awards.map((a, i) => (
                <li key={i} className="text-gray-300">{TROPHY_LABELS[a.type]?.icon} {TROPHY_LABELS[a.type]?.label} (value: {a.value})</li>
              ))}
            </ul>
          </div>
        )}
        {trophyResult?.error && (
          <p className="text-red-400 text-sm">{trophyResult.error}</p>
        )}
      </div>

      {/* Activity Feed */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Recent Activity</h2>
        {activity.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
            <p className="text-gray-400">No activity yet.</p>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-lg divide-y divide-gray-700">
            {activity.map((item, idx) => (
              <div key={idx} className="px-4 py-3 flex items-start gap-3">
                <span className="text-gray-500 text-lg mt-0.5">{getEventIcon(item.event_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">
                    {formatActivity(item)}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {item.event_title} &middot; {formatTimeAgo(item.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const TROPHY_LABELS = {
  points_champion: { icon: '🏆', label: 'Points Champion' },
  bounty_king: { icon: '💀', label: 'Bounty King' },
  money_maker: { icon: '💰', label: 'Money Maker' },
  most_wins: { icon: '👑', label: 'Most Wins' },
  iron_player: { icon: '🎯', label: 'Iron Player' }
}

function getEventIcon(type) {
  switch (type) {
    case 'elimination': return '💥'
    case 'rebuy': return '💵'
    case 'game_start': return '🎮'
    case 'game_end': return '🏁'
    default: return '•'
  }
}

function formatActivity(item) {
  const data = typeof item.event_data === 'string' ? JSON.parse(item.event_data) : item.event_data
  switch (item.event_type) {
    case 'elimination':
      return `${item.actor_name || 'Admin'} recorded an elimination (finish #${data.finishPosition})`
    case 'rebuy':
      return `${item.actor_name || 'Admin'} processed a rebuy (rebuy #${data.rebuyCount})`
    default:
      return `${item.actor_name || 'System'}: ${item.event_type}`
  }
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

function StatTile({ label, value, sub }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-400 text-sm">{label}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}
