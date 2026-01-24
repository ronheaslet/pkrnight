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
        <Link to={`/leagues/${leagueId}`} className="text-gold hover:underline">Back to Dashboard</Link>
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
    <div className="space-y-5">
      <div>
        <Link to={`/leagues/${leagueId}`} className="text-white/40 hover:text-white text-sm">&larr; {league?.name || 'Dashboard'}</Link>
        <h1 className="font-display text-xl text-gold mt-1">Members</h1>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search members..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input"
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 min-w-[60px] py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-gold text-felt-dark'
                : 'bg-white/10 text-white/70'
            }`}
          >
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>

      {/* Member List */}
      <div className="space-y-2">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-8 text-white/40">No members found</div>
        ) : (
          filteredMembers.map((member) => {
            const gamesPlayed = member.games_played || 0
            const isGuest = member.member_type === 'guest'
            const isEligible = isGuest && guestThreshold > 0 && gamesPlayed >= guestThreshold
            const name = getMemberName(member)

            return (
              <div key={member.id} className="card">
                <div className="flex items-center gap-3">
                  <Avatar name={name} url={member.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">{name}</span>
                      <RoleBadge
                        type={member.role}
                        label={member.role}
                        emoji={member.role === 'owner' ? '👑' : member.role === 'admin' ? '⭐' : null}
                      />
                      {member.member_type === 'paid' && (
                        <RoleBadge type="paid" label="Paid" emoji="✓" />
                      )}
                      {isGuest && (
                        <RoleBadge type="guest" label="Guest" />
                      )}
                      {isEligible && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-600/20 text-green-400 border border-green-500/30">Eligible</span>
                      )}
                      {member.custom_roles?.map(cr => (
                        <RoleBadge key={cr.id} type="custom" label={cr.name} emoji={cr.emoji} />
                      ))}
                    </div>
                    {isGuest && guestThreshold > 0 && (
                      <p className="text-white/30 text-xs mt-0.5">
                        {gamesPlayed} of {guestThreshold} games{isEligible ? ' - eligible' : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm shrink-0">
                    <p className="text-white/50">{gamesPlayed} games</p>
                    <p className="text-gold font-display">{member.total_points || 0} pts</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
