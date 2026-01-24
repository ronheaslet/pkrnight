import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { PageSpinner } from '../components/Spinner'
import { Avatar } from '../components/Avatar'
import { RoleBadge } from '../components/RoleBadge'

export function Members() {
  const { leagueId } = useParams()
  const [members, setMembers] = useState([])
  const [league, setLeague] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

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
        <Link to={`/leagues/${leagueId}`} className="text-pkr-gold-400 hover:underline">Back to Dashboard</Link>
      </div>
    )
  }

  const settings = league?.settings ? (typeof league.settings === 'string' ? JSON.parse(league.settings) : league.settings) : {}
  const guestThreshold = settings.guest_games_threshold || 0

  function getMemberName(member) {
    return member.display_name || member.full_name || member.email?.split('@')[0] || 'Unknown'
  }

  const filteredMembers = members.filter(m => {
    const name = getMemberName(m)
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all'
      || (filter === 'paid' && m.member_type === 'paid')
      || (filter === 'guests' && m.member_type === 'guest')
      || (filter === 'admins' && (m.role === 'owner' || m.role === 'admin'))
    return matchesSearch && matchesFilter
  })

  const counts = {
    all: members.length,
    paid: members.filter(m => m.member_type === 'paid').length,
    guests: members.filter(m => m.member_type === 'guest').length,
    admins: members.filter(m => m.role === 'owner' || m.role === 'admin').length,
  }

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'paid', label: 'Paid' },
    { key: 'guests', label: 'Guests' },
    { key: 'admins', label: 'Admins' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/leagues/${leagueId}`} className="text-pkr-gold-300/60 hover:text-pkr-gold-300 text-sm">&larr; {league?.name || 'Dashboard'}</Link>
        <h1 className="text-2xl font-display font-bold text-pkr-gold-400 mt-1">Members</h1>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2 bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg text-white placeholder-pkr-gold-300/30 focus:outline-none focus:border-pkr-gold-500"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter === tab.key
                ? 'bg-pkr-gold-500 text-pkr-green-900'
                : 'text-pkr-gold-300/50 hover:text-white'
            }`}
          >
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>

      {/* Member List */}
      <div className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg divide-y divide-pkr-green-700/50">
        {filteredMembers.length === 0 ? (
          <div className="p-6 text-center text-pkr-gold-300/40">No members found</div>
        ) : (
          filteredMembers.map((member) => {
            const gamesPlayed = member.games_played || 0
            const isGuest = member.member_type === 'guest'
            const isEligible = isGuest && guestThreshold > 0 && gamesPlayed >= guestThreshold
            const name = getMemberName(member)

            return (
              <div key={member.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={name} url={member.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">{name}</span>
                      {/* Base role badge */}
                      <RoleBadge
                        type={member.role}
                        label={member.role}
                        emoji={member.role === 'owner' ? '👑' : member.role === 'admin' ? '⭐' : null}
                      />
                      {/* Member type badge */}
                      {member.member_type === 'paid' && (
                        <RoleBadge type="paid" label="Paid" emoji="✓" />
                      )}
                      {isGuest && (
                        <RoleBadge type="guest" label="Guest" />
                      )}
                      {isEligible && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-900 text-green-300 border border-green-700">Eligible</span>
                      )}
                      {/* Custom role badges */}
                      {member.custom_roles?.map(cr => (
                        <RoleBadge key={cr.id} type="custom" label={cr.name} emoji={cr.emoji} />
                      ))}
                    </div>
                    {member.full_name && member.full_name !== name && (
                      <p className="text-pkr-gold-300/40 text-sm mt-0.5">{member.full_name}</p>
                    )}
                    {isGuest && guestThreshold > 0 && (
                      <p className="text-pkr-gold-300/30 text-xs mt-0.5">
                        {gamesPlayed} of {guestThreshold} games{isEligible ? ' - eligible for membership' : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm shrink-0">
                    <p className="text-pkr-gold-300/50">{gamesPlayed} games</p>
                    <p className="text-pkr-gold-400">{member.total_points || 0} pts</p>
                  </div>
                </div>
                {(member.total_wins > 0 || member.total_winnings > 0) && (
                  <div className="flex gap-4 mt-2 text-xs text-pkr-gold-300/40 ml-13">
                    {member.total_wins > 0 && <span>{member.total_wins} wins</span>}
                    {member.total_winnings > 0 && <span>${parseFloat(member.total_winnings).toFixed(0)} won</span>}
                    {member.total_bounties > 0 && <span>{member.total_bounties} bounties</span>}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
