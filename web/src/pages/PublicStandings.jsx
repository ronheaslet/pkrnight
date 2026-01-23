import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { PageSpinner } from '../components/Spinner'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function PublicStandings() {
  const { leagueId } = useParams()
  const [standings, setStandings] = useState([])
  const [leagueName, setLeagueName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPublicStandings()
  }, [leagueId])

  async function fetchPublicStandings() {
    try {
      const res = await fetch(`${API_URL}/api/public/standings/${leagueId}`)
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error?.message || 'Standings not available')
      }
      setStandings(data.data.standings)
      setLeagueName(data.data.leagueName)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <PageSpinner />

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-gray-500 text-sm">This league may not have public standings enabled.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">{leagueName}</h1>
          <p className="text-gray-400 text-sm mt-1">League Standings</p>
        </div>

        {standings.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
            <p className="text-gray-400">No games played yet.</p>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-700/50 text-xs text-gray-400 uppercase">
              <span className="col-span-1">#</span>
              <span className="col-span-4">Player</span>
              <span className="col-span-2 text-center">Points</span>
              <span className="col-span-1 text-center">GP</span>
              <span className="col-span-1 text-center">Wins</span>
              <span className="col-span-1 text-center">KOs</span>
              <span className="col-span-2 text-center">Earnings</span>
            </div>
            {standings.map((player, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-t border-gray-700">
                <span className="col-span-1">
                  {idx === 0 && <span className="text-yellow-400 font-bold">1</span>}
                  {idx === 1 && <span className="text-gray-300 font-bold">2</span>}
                  {idx === 2 && <span className="text-amber-600 font-bold">3</span>}
                  {idx > 2 && <span className="text-gray-500">{idx + 1}</span>}
                </span>
                <span className="col-span-4 text-white font-medium truncate">{player.display_name}</span>
                <span className="col-span-2 text-center text-green-400 font-semibold">{player.total_points}</span>
                <span className="col-span-1 text-center text-gray-400">{player.games_played}</span>
                <span className="col-span-1 text-center text-gray-400">{player.total_wins}</span>
                <span className="col-span-1 text-center text-gray-400">{player.total_bounties || 0}</span>
                <span className="col-span-2 text-center text-gray-400">
                  {parseFloat(player.total_winnings) > 0 ? `$${parseFloat(player.total_winnings).toFixed(0)}` : '-'}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-gray-600 text-xs">Powered by PKR Night</p>
      </div>
    </div>
  )
}
