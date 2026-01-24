import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { PageSpinner } from '../components/Spinner'
import { Avatar } from '../components/Avatar'

const TABS = [
  { key: 'points', label: 'Points', icon: '🏆', sort: (a, b) => (b.total_points || 0) - (a.total_points || 0), column: 'total_points', format: v => `${v || 0} pts` },
  { key: 'bounties', label: 'Bounties', icon: '👊', sort: (a, b) => (b.total_bounties || 0) - (a.total_bounties || 0), column: 'total_bounties', format: v => `${v || 0} KOs` },
  { key: 'earnings', label: 'Earnings', icon: '💰', sort: (a, b) => parseFloat(b.total_winnings || 0) - parseFloat(a.total_winnings || 0), column: 'total_winnings', format: v => parseFloat(v) > 0 ? `$${parseFloat(v).toFixed(0)}` : '$0' },
  { key: 'games', label: 'Games', icon: '🎮', sort: (a, b) => (b.games_played || 0) - (a.games_played || 0), column: 'games_played', format: v => `${v || 0} games` }
]

const TROPHY_LABELS = {
  points_champion: { icon: '🏆', label: 'Points Champion' },
  bounty_king: { icon: '💀', label: 'Bounty King' },
  money_maker: { icon: '💰', label: 'Money Maker' },
  most_wins: { icon: '👑', label: 'Most Wins' },
  iron_player: { icon: '🎯', label: 'Iron Player' }
}

export function Standings() {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const [standings, setStandings] = useState([])
  const [trophies, setTrophies] = useState([])
  const [league, setLeague] = useState(null)
  const [seasons, setSeasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('points')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [playerDetail, setPlayerDetail] = useState(null)
  const [playerLoading, setPlayerLoading] = useState(false)
  const [showSeasonActions, setShowSeasonActions] = useState(false)
  const [seasonLoading, setSeasonLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [leagueId])

  async function fetchData() {
    try {
      const [standingsData, leagueData, trophyData, seasonsData] = await Promise.all([
        api.get(`/api/structures/standings/league/${leagueId}`),
        api.get(`/api/leagues/${leagueId}`),
        api.get(`/api/trophies/league/${leagueId}`).catch(() => ({ trophies: [] })),
        api.get(`/api/seasons/league/${leagueId}`).catch(() => ({ seasons: [] }))
      ])
      setStandings(standingsData.standings)
      setLeague(leagueData.league)
      setTrophies(trophyData.trophies || [])
      setSeasons(seasonsData.seasons || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateSeason() {
    setSeasonLoading(true)
    try {
      await api.post(`/api/seasons/league/${leagueId}`, { year: new Date().getFullYear() })
      fetchData()
    } catch (err) { alert(err.message) } finally { setSeasonLoading(false) }
  }

  async function handleCloseSeason(seasonId) {
    if (!confirm('Close this season? This will award trophies and reset stats for the new season.')) return
    setSeasonLoading(true)
    try {
      await api.post(`/api/seasons/${seasonId}/close`)
      fetchData()
    } catch (err) { alert(err.message) } finally { setSeasonLoading(false) }
  }

  async function handlePlayerClick(player) {
    setSelectedPlayer(player)
    setPlayerLoading(true)
    try {
      const data = await api.get(`/api/structures/standings/league/${leagueId}/player/${player.user_id}`)
      setPlayerDetail(data)
    } catch {
      setPlayerDetail(null)
    } finally {
      setPlayerLoading(false)
    }
  }

  if (loading) return <PageSpinner />

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <Link to={`/leagues/${leagueId}`} className="text-pkr-gold-400 hover:underline">Back to Dashboard</Link>
      </div>
    )
  }

  const tab = TABS.find(t => t.key === activeTab)
  const sorted = [...standings].sort(tab.sort)

  const trophyMap = {}
  for (const t of trophies) {
    if (!trophyMap[t.user_id]) trophyMap[t.user_id] = []
    trophyMap[t.user_id].push(t)
  }

  const isAdmin = league?.role === 'owner' || league?.role === 'admin'
  const activeSeason = seasons.find(s => s.status === 'active')
  const totalGames = standings.length > 0 ? Math.max(...standings.map(s => s.games_played || 0)) : 0
  const totalPrize = standings.reduce((sum, s) => sum + parseFloat(s.total_winnings || 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/leagues/${leagueId}`} className="text-pkr-gold-300/60 hover:text-pkr-gold-300 text-sm">&larr; {league?.name || 'Dashboard'}</Link>
          <h1 className="text-2xl font-display font-bold text-pkr-gold-400 mt-1">Standings</h1>
        </div>
        <div className="flex gap-2">
          {standings.length > 0 && (
            <button
              onClick={async () => {
                const token = localStorage.getItem('pkr_token')
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
                const res = await fetch(`${API_URL}/api/structures/standings/league/${leagueId}/export`, {
                  headers: { Authorization: `Bearer ${token}` }
                })
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'standings.csv'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="text-sm text-pkr-gold-300/60 hover:text-pkr-gold-300 px-2 py-1"
            >
              Export
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setShowSeasonActions(!showSeasonActions)} className="text-sm text-pkr-gold-300/60 hover:text-pkr-gold-300 px-2 py-1">
              Seasons
            </button>
          )}
        </div>
      </div>

      {/* Season Actions */}
      {showSeasonActions && isAdmin && (
        <div className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm">Season Management</h3>
          {activeSeason ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Current: {activeSeason.name || `${activeSeason.year} Season`}</p>
                <p className="text-pkr-gold-300/40 text-xs">Started {new Date(activeSeason.started_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => handleCloseSeason(activeSeason.id)}
                disabled={seasonLoading}
                className="px-3 py-1.5 text-sm bg-pkr-gold-500 text-pkr-green-900 rounded hover:bg-pkr-gold-400 disabled:opacity-50"
              >
                {seasonLoading ? 'Processing...' : 'Close Season'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-pkr-gold-300/60 text-sm">No active season</p>
              <button
                onClick={handleCreateSeason}
                disabled={seasonLoading}
                className="px-3 py-1.5 text-sm bg-pkr-gold-500 text-pkr-green-900 rounded hover:bg-pkr-gold-400 disabled:opacity-50"
              >
                {seasonLoading ? 'Creating...' : `Start ${new Date().getFullYear()} Season`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Season Banner */}
      <div className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-4 text-center">
        <p className="text-xs uppercase tracking-wider text-pkr-gold-400 font-semibold">Current Season</p>
        <div className="flex items-center justify-center gap-6 mt-2">
          <div>
            <p className="text-white font-bold text-lg">{totalGames}</p>
            <p className="text-pkr-gold-300/50 text-xs">Games Played</p>
          </div>
          <div className="w-px h-8 bg-pkr-green-700/50" />
          <div>
            <p className="text-white font-bold text-lg">${totalPrize.toFixed(0)}</p>
            <p className="text-pkr-gold-300/50 text-xs">Total Prize Pools</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-pkr-green-900 border border-pkr-green-700/50 rounded-lg p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === t.key ? 'bg-pkr-gold-500 text-pkr-green-900' : 'text-pkr-gold-300/60 hover:text-pkr-gold-300'
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {standings.length === 0 ? (
        <div className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-8 text-center">
          <p className="text-pkr-gold-300/60">No games played yet.</p>
          <p className="text-pkr-gold-300/40 text-sm mt-1">Standings will appear after the first completed game.</p>
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-medium text-pkr-gold-400 mb-3">{tab.icon} {tab.label} Leaderboard</h2>
          <div className="space-y-2">
            {sorted.map((player, idx) => (
              <div
                key={player.user_id}
                onClick={() => handlePlayerClick(player)}
                className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:border-pkr-gold-500/30 transition-colors"
              >
                <RankBadge rank={idx + 1} />
                <Avatar name={player.display_name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium truncate">{player.display_name}</span>
                    {player.user_id === user?.id && (
                      <span className="text-pkr-gold-400 text-xs">(You)</span>
                    )}
                    {trophyMap[player.user_id] && (
                      <span className="flex gap-0.5">
                        {trophyMap[player.user_id].slice(0, 3).map(t => (
                          <span key={t.id} title={TROPHY_LABELS[t.trophy_type]?.label} className="text-xs">
                            {TROPHY_LABELS[t.trophy_type]?.icon || '🏅'}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-pkr-gold-300/40 mt-0.5">
                    {player.games_played || 0} games &bull; {player.total_wins || 0} wins &bull; {player.total_bounties || 0} KOs
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-pkr-gold-400 font-semibold">{tab.format(player[tab.column])}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          detail={playerDetail}
          loading={playerLoading}
          trophies={trophyMap[selectedPlayer.user_id] || []}
          onClose={() => { setSelectedPlayer(null); setPlayerDetail(null) }}
        />
      )}
    </div>
  )
}

function RankBadge({ rank }) {
  const colors = {
    1: 'bg-yellow-500 text-yellow-900',
    2: 'bg-gray-300 text-gray-700',
    3: 'bg-amber-600 text-amber-100',
  }
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${colors[rank] || 'bg-pkr-green-700 text-pkr-gold-300/60'}`}>
      {rank}
    </div>
  )
}

function PlayerModal({ player, detail, loading, trophies, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-pkr-green-800 border border-pkr-green-700 rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-pkr-green-700">
          <h2 className="text-xl font-display font-bold text-pkr-gold-400">{player.display_name}</h2>
          <button onClick={onClose} className="text-pkr-gold-300/50 hover:text-white text-xl">&times;</button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-pkr-gold-300/50">Loading...</div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Points" value={player.total_points} />
              <MiniStat label="Games" value={player.games_played} />
              <MiniStat label="Wins" value={player.total_wins} />
              <MiniStat label="Earnings" value={parseFloat(player.total_winnings) > 0 ? `$${parseFloat(player.total_winnings).toFixed(0)}` : '-'} />
              <MiniStat label="Bounties" value={player.total_bounties || 0} />
              <MiniStat label="Win Rate" value={player.games_played > 0 ? `${Math.round((player.total_wins / player.games_played) * 100)}%` : '-'} />
            </div>
            {trophies.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-pkr-gold-300/60 uppercase mb-2">Trophy Case</h3>
                <div className="flex flex-wrap gap-2">
                  {trophies.map(t => (
                    <div key={t.id} className="flex items-center gap-1.5 bg-pkr-green-700 px-3 py-1.5 rounded-full">
                      <span>{TROPHY_LABELS[t.trophy_type]?.icon || '🏅'}</span>
                      <span className="text-sm text-white">{TROPHY_LABELS[t.trophy_type]?.label || t.trophy_type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detail?.recentGames?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-pkr-gold-300/60 uppercase mb-2">Recent Games</h3>
                <div className="bg-pkr-green-900 rounded-lg overflow-hidden">
                  {detail.recentGames.map((game, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm border-t border-pkr-green-800 first:border-0">
                      <span className="text-white truncate flex-1">{game.event_title}</span>
                      <span className={`ml-2 ${game.finish_position === 1 ? 'text-pkr-gold-400 font-bold' : 'text-pkr-gold-300/60'}`}>
                        #{game.finish_position || '-'}
                      </span>
                      <span className="ml-3 text-pkr-gold-300/60">{game.points_earned || 0}pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-pkr-green-900 rounded-lg p-3 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-pkr-gold-300/40">{label}</p>
    </div>
  )
}
