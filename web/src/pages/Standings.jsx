import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { PageSpinner } from '../components/Spinner'

const TABS = [
  { key: 'points', label: 'Points', sort: (a, b) => (b.total_points || 0) - (a.total_points || 0), column: 'total_points', format: v => v || 0 },
  { key: 'bounties', label: 'Bounties', sort: (a, b) => (b.total_bounties || 0) - (a.total_bounties || 0), column: 'total_bounties', format: v => v || 0 },
  { key: 'earnings', label: 'Earnings', sort: (a, b) => parseFloat(b.total_winnings || 0) - parseFloat(a.total_winnings || 0), column: 'total_winnings', format: v => parseFloat(v) > 0 ? `$${parseFloat(v).toFixed(0)}` : '-' },
  { key: 'games', label: 'Games', sort: (a, b) => (b.games_played || 0) - (a.games_played || 0), column: 'games_played', format: v => v || 0 }
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

  function closeModal() {
    setSelectedPlayer(null)
    setPlayerDetail(null)
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

  const tab = TABS.find(t => t.key === activeTab)
  const sorted = [...standings].sort(tab.sort)

  const trophyMap = {}
  for (const t of trophies) {
    if (!trophyMap[t.user_id]) trophyMap[t.user_id] = []
    trophyMap[t.user_id].push(t)
  }

  const isAdmin = league?.role === 'owner' || league?.role === 'admin'
  const activeSeason = seasons.find(s => s.status === 'active')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/leagues/${leagueId}`} className="text-gray-400 hover:text-white text-sm">&larr; {league?.name || 'Dashboard'}</Link>
          <h1 className="text-2xl font-bold text-white mt-1">Standings</h1>
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
              className="text-sm text-gray-400 hover:text-white px-2 py-1"
              title="Export CSV"
            >
              Export
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setShowSeasonActions(!showSeasonActions)} className="text-sm text-gray-400 hover:text-white px-2 py-1">
              Seasons
            </button>
          )}
        </div>
      </div>

      {/* Season Actions */}
      {showSeasonActions && isAdmin && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm">Season Management</h3>
          {activeSeason ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Current: {activeSeason.name || `${activeSeason.year} Season`}</p>
                <p className="text-gray-500 text-xs">Started {new Date(activeSeason.started_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => handleCloseSeason(activeSeason.id)}
                disabled={seasonLoading}
                className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                {seasonLoading ? 'Processing...' : 'Close Season'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">No active season</p>
              <button
                onClick={handleCreateSeason}
                disabled={seasonLoading}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {seasonLoading ? 'Creating...' : `Start ${new Date().getFullYear()} Season`}
              </button>
            </div>
          )}
          {seasons.filter(s => s.status === 'closed').length > 0 && (
            <div className="pt-2 border-t border-gray-700">
              <p className="text-xs text-gray-500 mb-1">Past Seasons</p>
              <div className="flex flex-wrap gap-2">
                {seasons.filter(s => s.status === 'closed').map(s => (
                  <span key={s.id} className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                    {s.name || s.year}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {standings.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">No games played yet.</p>
          <p className="text-gray-500 text-sm mt-1">Standings will appear after the first completed game.</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                  activeTab === t.key ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-700/50 text-xs text-gray-400 uppercase">
              <span className="col-span-1">#</span>
              <span className="col-span-4">Player</span>
              <span className="col-span-2 text-center">{tab.label}</span>
              <span className="col-span-1 text-center hidden sm:block">GP</span>
              <span className="col-span-1 text-center hidden sm:block">Wins</span>
              <span className="col-span-1 text-center hidden sm:block">Pts</span>
              <span className="col-span-2 text-center hidden sm:block">KOs</span>
            </div>

            {sorted.map((player, idx) => (
              <div
                key={player.user_id}
                onClick={() => handlePlayerClick(player)}
                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center border-t border-gray-700 cursor-pointer hover:bg-gray-700/50 transition-colors ${idx < 3 ? 'bg-gray-800' : ''}`}
              >
                <span className="col-span-1">
                  {idx === 0 && <span className="text-yellow-400 font-bold">1</span>}
                  {idx === 1 && <span className="text-gray-300 font-bold">2</span>}
                  {idx === 2 && <span className="text-amber-600 font-bold">3</span>}
                  {idx > 2 && <span className="text-gray-500">{idx + 1}</span>}
                </span>
                <span className="col-span-4 flex items-center gap-2">
                  <span className="text-white font-medium truncate">{player.display_name}</span>
                  {trophyMap[player.user_id] && (
                    <span className="flex gap-0.5">
                      {trophyMap[player.user_id].slice(0, 3).map(t => (
                        <span key={t.id} title={TROPHY_LABELS[t.trophy_type]?.label || t.trophy_type} className="text-xs">
                          {TROPHY_LABELS[t.trophy_type]?.icon || '🏅'}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="col-span-2 text-center text-green-400 font-semibold">{tab.format(player[tab.column])}</span>
                <span className="col-span-1 text-center text-gray-400 hidden sm:block">{player.games_played}</span>
                <span className="col-span-1 text-center text-gray-400 hidden sm:block">{player.total_wins}</span>
                <span className="col-span-1 text-center text-gray-400 hidden sm:block">{player.total_points}</span>
                <span className="col-span-2 text-center text-gray-400 hidden sm:block">{player.total_bounties || 0}</span>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Games" value={Math.max(...standings.map(s => s.games_played))} />
            <StatCard label="Players" value={standings.length} />
            <StatCard label="Total Prize Money" value={`$${standings.reduce((sum, s) => sum + parseFloat(s.total_winnings || 0), 0).toFixed(0)}`} />
            <StatCard label="Total KOs" value={standings.reduce((sum, s) => sum + (s.total_bounties || 0), 0)} />
          </div>
        </>
      )}

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          detail={playerDetail}
          loading={playerLoading}
          trophies={trophyMap[selectedPlayer.user_id] || []}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

function PlayerModal({ player, detail, loading, trophies, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">{player.display_name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
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
                <h3 className="text-sm font-medium text-gray-400 uppercase mb-2">Trophy Case</h3>
                <div className="flex flex-wrap gap-2">
                  {trophies.map(t => (
                    <div key={t.id} className="flex items-center gap-1.5 bg-gray-700 px-3 py-1.5 rounded-full">
                      <span>{TROPHY_LABELS[t.trophy_type]?.icon || '🏅'}</span>
                      <span className="text-sm text-white">{TROPHY_LABELS[t.trophy_type]?.label || t.trophy_type}</span>
                      <span className="text-xs text-gray-400">{t.season_year}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail?.recentGames && detail.recentGames.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 uppercase mb-2">Recent Games</h3>
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-1 px-3 py-2 text-xs text-gray-500 uppercase">
                    <span className="col-span-4">Event</span>
                    <span className="col-span-2 text-center">Place</span>
                    <span className="col-span-2 text-center">Pts</span>
                    <span className="col-span-2 text-center">KOs</span>
                    <span className="col-span-2 text-center">Won</span>
                  </div>
                  {detail.recentGames.map((game, i) => (
                    <div key={i} className="grid grid-cols-12 gap-1 px-3 py-2 text-sm border-t border-gray-800">
                      <span className="col-span-4 text-white truncate">{game.event_title}</span>
                      <span className={`col-span-2 text-center ${game.finish_position === 1 ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}>
                        {game.finish_position ? `#${game.finish_position}` : '-'}
                      </span>
                      <span className="col-span-2 text-center text-gray-400">{game.points_earned || 0}</span>
                      <span className="col-span-2 text-center text-gray-400">{game.bounty_count || 0}</span>
                      <span className="col-span-2 text-center text-gray-400">
                        {parseFloat(game.winnings) > 0 ? `$${parseFloat(game.winnings).toFixed(0)}` : '-'}
                      </span>
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
    <div className="bg-gray-900 rounded-lg p-3 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
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
