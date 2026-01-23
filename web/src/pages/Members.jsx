import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { PageSpinner } from '../components/Spinner'

export function Members() {
  const { leagueId } = useParams()
  const [members, setMembers] = useState([])
  const [league, setLeague] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [leagueId])

  async function fetchData() {
    try {
      const [membersData, leagueData] = await Promise.all([
        api.get(`/api/members/league/${leagueId}`),
        api.get(`/api/leagues/${leagueId}`)
      ])
      setMembers(membersData.members)
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

  const settings = league?.settings ? (typeof league.settings === 'string' ? JSON.parse(league.settings) : league.settings) : {}
  const guestThreshold = settings.guest_games_threshold || 0

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/leagues/${leagueId}`} className="text-gray-400 hover:text-white text-sm">&larr; {league?.name || 'Dashboard'}</Link>
        <h1 className="text-2xl font-bold text-white mt-1">Members</h1>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg divide-y divide-gray-700">
        {members.map((member) => {
          const gamesPlayed = member.games_played || 0
          const isGuest = member.member_type === 'guest'
          const isEligible = isGuest && guestThreshold > 0 && gamesPlayed >= guestThreshold

          return (
            <div key={member.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{member.display_name}</span>
                    <RoleBadge role={member.role} />
                    {isGuest && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-900 text-yellow-300">guest</span>
                    )}
                    {isEligible && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-900 text-green-300">Eligible</span>
                    )}
                    {member.custom_roles?.map(cr => (
                      <span key={cr.id} className="px-2 py-0.5 text-xs rounded-full bg-green-900 text-green-300">
                        {cr.emoji && <span className="mr-0.5">{cr.emoji}</span>}{cr.name}
                      </span>
                    ))}
                  </div>
                  {member.full_name && (
                    <p className="text-gray-500 text-sm mt-0.5">{member.full_name}</p>
                  )}
                  {isGuest && guestThreshold > 0 && (
                    <p className="text-gray-600 text-xs mt-0.5">
                      {gamesPlayed} of {guestThreshold} games{isEligible ? ' - eligible for membership' : ''}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-400">{gamesPlayed} games</p>
                  <p className="text-green-400">{member.total_points || 0} pts</p>
                </div>
              </div>
              {(member.total_wins > 0 || member.total_winnings > 0) && (
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  {member.total_wins > 0 && <span>{member.total_wins} wins</span>}
                  {member.total_winnings > 0 && <span>${parseFloat(member.total_winnings).toFixed(0)} won</span>}
                  {member.total_bounties > 0 && <span>{member.total_bounties} bounties</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RoleBadge({ role }) {
  const styles = {
    owner: 'bg-purple-900 text-purple-300',
    admin: 'bg-blue-900 text-blue-300',
    member: 'bg-gray-700 text-gray-400'
  }
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${styles[role] || styles.member}`}>
      {role}
    </span>
  )
}
