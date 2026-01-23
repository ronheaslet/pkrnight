import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { PageSpinner } from '../components/Spinner'

export function Standings() {
  const { leagueId } = useParams()
  const [standings, setStandings] = useState([])
  const [league, setLeague] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [leagueId])

  async function fetchData() {
    try {
      const [standingsData, leagueData] = await Promise.all([
        api.get(`/api/structures/standings/league/${leagueId}`),
        api.get(`/api/leagues/${leagueId}`)
      ])
      setStandings(standingsData.standings)
      setLeague(leagueData.league)
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
        <Link to={`/leagues/${leagueId}`} className="text-green-400 hover:underline">Back to Dashboard</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/leagues/${leagueId}`} className="text-gray-400 hover:text-white text-sm">&larr; {league?.name || 'Dashboard'}</Link>
        <h1 className="text-2xl font-bold text-white mt-1">Standings</h1>
      </div>

      {standings.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">No games played yet.</p>
          <p className="text-gray-500 text-sm mt-1">Standings will appear after the first completed game.</p>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-700/50 text-xs text-gray-400 uppercase">
            <span className="col-span-1">#</span>
            <span className="col-span-3">Player</span>
            <span className="col-span-2 text-center">Points</span>
            <span className="col-span-1 text-center hidden sm:block">GP</span>
            <span className="col-span-1 text-center hidden sm:block">Wins</span>
            <span className="col-span-2 text-center hidden sm:block">Winnings</span>
            <span className="col-span-2 text-center hidden sm:block">KOs</span>
          </div>

          {/* Rows */}
          {standings.map((player, idx) => (
            <div key={player.user_id} className={`grid grid-cols-12 gap-2 px-4 py-3 items-center border-t border-gray-700 ${idx < 3 ? 'bg-gray-800' : ''}`}>
              <span className="col-span-1">
                {idx === 0 && <span className="text-yellow-400 font-bold">1</span>}
                {idx === 1 && <span className="text-gray-300 font-bold">2</span>}
                {idx === 2 && <span className="text-amber-600 font-bold">3</span>}
                {idx > 2 && <span className="text-gray-500">{idx + 1}</span>}
              </span>
              <span className="col-span-3 text-white font-medium truncate">{player.display_name}</span>
              <span className="col-span-2 text-center text-green-400 font-semibold">{player.total_points}</span>
              <span className="col-span-1 text-center text-gray-400 hidden sm:block">{player.games_played}</span>
              <span className="col-span-1 text-center text-gray-400 hidden sm:block">{player.total_wins}</span>
              <span className="col-span-2 text-center text-gray-400 hidden sm:block">
                {parseFloat(player.total_winnings) > 0 ? `$${parseFloat(player.total_winnings).toFixed(0)}` : '-'}
              </span>
              <span className="col-span-2 text-center text-gray-400 hidden sm:block">{player.total_bounties || 0}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {standings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Games" value={Math.max(...standings.map(s => s.games_played))} />
          <StatCard label="Players" value={standings.length} />
          <StatCard label="Total Prize Money" value={`$${standings.reduce((sum, s) => sum + parseFloat(s.total_winnings || 0), 0).toFixed(0)}`} />
          <StatCard label="Total KOs" value={standings.reduce((sum, s) => sum + (s.total_bounties || 0), 0)} />
        </div>
      )}
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
