import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { PageSpinner } from '../components/Spinner'
import { Avatar } from '../components/Avatar'

const TABS = [
  { key: 'points', label: 'Points', icon: '🏆', sort: (a, b) => (b.total_points || 0) - (a.total_points || 0), column: 'total_points', format: v => `${v || 0} pts` },
  { key: 'bounties', label: 'Bounties', icon: '🎯', sort: (a, b) => (b.total_bounties || 0) - (a.total_bounties || 0), column: 'total_bounties', format: v => `${v || 0} KOs` },
  { key: 'earnings', label: 'Earnings', icon: '💰', sort: (a, b) => parseFloat(b.total_winnings || 0) - parseFloat(a.total_winnings || 0), column: 'total_winnings', format: v => parseFloat(v) > 0 ? `$${parseFloat(v).toFixed(0)}` : '$0' },
  { key: 'games', label: 'Games', icon: '📊', sort: (a, b) => (b.games_played || 0) - (a.games_played || 0), column: 'games_played', format: v => `${v || 0} games` }
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
        <Link to={`/leagues/${leagueId}`} className="text-gold hover:underline">Back to Dashboard</Link>
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
          <Link to={`/leagues/${leagueId}`} className="text-white/40 hover:text-white text-sm">&larr; {league?.name || 'Dashboard'}</Link>
          <h1 className="font-display text-xl text-gold mt-1">Standings</h1>
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
              className="text-sm text-white/50 hover:text-white"
            >
              Export
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setShowSeasonActions(!showSeasonActions)} className="text-sm text-white/50 hover:text-white">
              Seasons
            </button>
          )}
        </div>
      </div>

      {/* Season Actions */}
      {showSeasonActions && isAdmin && (
        <div className="card space-y-3">
          <h3 className="text-white font-semibold text-sm">Season Management</h3>
          {activeSeason ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Current: {activeSeason.name || `${activeSeason.year} Season`}</p>
                <p className="text-white/40 text-xs">Started {new Date(activeSeason.started_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => handleCloseSeason(activeSeason.id)}
                disabled={seasonLoading}
                className="btn btn-primary text-sm disabled:opacity-50"
              >
                {seasonLoading ? 'Processing...' : 'Close Season'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-white/60 text-sm">No active season</p>
              <button
                onClick={handleCreateSeason}
                disabled={seasonLoading}
                className="btn btn-primary text-sm disabled:opacity-50"
              >
                {seasonLoading ? 'Creating...' : `Start ${new Date().getFullYear()} Season`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Season Banner */}
      {standings.length > 0 && (
        <div className="card card-gold">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-gold uppercase tracking-wider">Current Season</div>
              <div className="font-display text-lg text-white">
                {totalGames} Games Played
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/50">Total Prize Pools</div>
              <div className="font-display text-xl text-gold">
                ${totalPrize.toFixed(0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
              activeTab === t.key
                ? 'bg-gold text-felt-dark'
                : 'bg-white/10 text-white/70'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {standings.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-white/60 mb-2">No standings yet</div>
          <div className="text-white/40 text-sm">Play some games to see the leaderboard!</div>
        </div>
      ) : (
        <div>
          <h2 className="font-display text-lg text-gold mb-3">{tab.icon} {tab.label} Leaderboard</h2>
          <div className="space-y-2">
            {sorted.map((player, idx) => (
              <button
                key={player.user_id}
                onClick={() => handlePlayerClick(player)}
                className={`card flex items-center gap-3 w-full text-left hover:bg-white/5 transition-colors ${
                  player.user_id === user?.id ? 'border-gold/50 border' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'bg-gray-700 text-white'
                }`}>
                  {idx + 1}
                </div>
                <Avatar name={player.display_name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm truncate">{player.display_name}</span>
                    {player.user_id === user?.id && (
                      <span className="text-gold text-xs">(You)</span>
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
                  <p className="text-xs text-white/50">
                    {player.games_played || 0} games • {player.total_wins || 0} wins • {player.total_bounties || 0} KOs
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-xl text-gold">{tab.format(player[tab.column])}</div>
                </div>
              </button>
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

function PlayerModal({ player, detail, loading, trophies, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-felt-dark border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar name={player.display_name} size="lg" />
            <div>
              <h2 className="font-display text-xl text-white">{player.display_name}</h2>
              <div className="text-sm text-white/50">{player.games_played || 0} games played</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 text-2xl">&times;</button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-white/50">Loading...</div>
        ) : (
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card text-center">
                <div className="font-display text-2xl text-gold">{player.total_points || 0}</div>
                <div className="text-xs text-white/50">Points</div>
              </div>
              <div className="card text-center">
                <div className="font-display text-2xl text-white">{player.total_wins || 0}</div>
                <div className="text-xs text-white/50">Wins</div>
              </div>
              <div className="card text-center">
                <div className="font-display text-2xl text-chip-red">{player.total_bounties || 0}</div>
                <div className="text-xs text-white/50">Bounties</div>
              </div>
            </div>

            <div className="card">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/50">Earnings:</span>
                  <span className="text-white ml-2">{parseFloat(player.total_winnings) > 0 ? `$${parseFloat(player.total_winnings).toFixed(0)}` : '-'}</span>
                </div>
                <div>
                  <span className="text-white/50">Win Rate:</span>
                  <span className="text-white ml-2">{player.games_played > 0 ? `${Math.round((player.total_wins / player.games_played) * 100)}%` : '-'}</span>
                </div>
              </div>
            </div>

            {trophies.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-white/50 uppercase mb-2">Trophy Case</h3>
                <div className="flex flex-wrap gap-2">
                  {trophies.map(t => (
                    <div key={t.id} className="flex items-center gap-1.5 bg-gold/10 border border-gold/30 px-3 py-1.5 rounded-full">
                      <span>{TROPHY_LABELS[t.trophy_type]?.icon || '🏅'}</span>
                      <span className="text-sm text-gold">{TROPHY_LABELS[t.trophy_type]?.label || t.trophy_type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail?.recentGames?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-white/50 uppercase mb-2">Recent Games</h3>
                <div className="space-y-2">
                  {detail.recentGames.map((game, i) => (
                    <div key={i} className="card flex items-center gap-3">
                      <div className="text-lg">
                        {game.finish_position === 1 ? '🥇' : game.finish_position === 2 ? '🥈' : game.finish_position === 3 ? '🥉' : `#${game.finish_position || '-'}`}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white truncate">{game.event_title}</div>
                      </div>
                      <div className="text-gold text-sm">{game.points_earned || 0} pts</div>
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
