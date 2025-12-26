import { useState, useEffect } from 'react'
import { useLeague } from '../../contexts/LeagueContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function TrophiesTab() {
  const { currentLeague, isAdmin } = useLeague()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [seasonStats, setSeasonStats] = useState(null)
  const [leaders, setLeaders] = useState({ points: null, bounty: null, earnings: null, survival: null })
  const [trophyWinners, setTrophyWinners] = useState([])
  const [calculatedWinners, setCalculatedWinners] = useState([])
  const [showAddWinnerModal, setShowAddWinnerModal] = useState(false)

  useEffect(() => {
    if (currentLeague) fetchSeasonData()
  }, [currentLeague])

  const fetchSeasonData = async () => {
    setLoading(true)

    // Fetch league members
    const { data: members } = await supabase
      .from('league_members')
      .select(`id, user_id, games_played, total_wins, total_points, total_bounties, users (id, full_name, display_name)`)
      .eq('league_id', currentLeague.id)
      .eq('status', 'active')

    // Fetch game results
    const { data: gameResults } = await supabase
      .from('game_participants')
      .select(`user_id, finish_position, rebuy_count, winnings, bounty_winnings, points_earned, eliminated_by, game_sessions (id, ended_at, events (id, league_id, buy_in, event_date))`)

    const leagueResults = gameResults?.filter(r => r.game_sessions?.events?.league_id === currentLeague.id && r.game_sessions?.ended_at) || []

    // Calculate stats for each member
    const enrichedMembers = members?.map(member => {
      const playerGames = leagueResults.filter(r => r.user_id === member.user_id)
      const gamesPlayed = playerGames.length
      const wins = playerGames.filter(g => g.finish_position === 1).length
      const totalWinnings = playerGames.reduce((sum, g) => sum + parseFloat(g.winnings || 0), 0)
      const totalBountyWinnings = playerGames.reduce((sum, g) => sum + parseFloat(g.bounty_winnings || 0), 0)
      const totalBuyIns = playerGames.reduce((sum, g) => {
        const buyIn = g.game_sessions?.events?.buy_in || 20
        return sum + buyIn + ((g.rebuy_count || 0) * buyIn)
      }, 0)
      const totalPoints = playerGames.reduce((sum, g) => sum + (g.points_earned || 0), 0)
      const bountyCount = leagueResults.filter(r => r.eliminated_by === member.user_id).length
      const noRebuyGames = playerGames.filter(g => g.rebuy_count === 0).length
      const survivalRate = gamesPlayed > 0 ? (noRebuyGames / gamesPlayed * 100) : 0
      const avgFinish = playerGames.length > 0 ? playerGames.reduce((sum, g) => sum + (g.finish_position || 0), 0) / playerGames.length : 0

      return {
        ...member,
        gamesPlayed, wins,
        totalPoints: totalPoints || member.total_points || 0,
        bountyCount: bountyCount || member.total_bounties || 0,
        totalWinnings, totalBountyWinnings,
        netProfit: totalWinnings + totalBountyWinnings - totalBuyIns,
        survivalRate: survivalRate.toFixed(0),
        avgFinish: avgFinish.toFixed(1)
      }
    }) || []

    // Calculate current leaders
    const pointsLeader = [...enrichedMembers].sort((a, b) => b.totalPoints - a.totalPoints)[0]
    const bountyLeader = [...enrichedMembers].sort((a, b) => b.bountyCount - a.bountyCount)[0]
    const earningsLeader = [...enrichedMembers].sort((a, b) => b.netProfit - a.netProfit)[0]
    const survivalLeader = [...enrichedMembers].filter(m => m.gamesPlayed >= 3).sort((a, b) => parseFloat(b.survivalRate) - parseFloat(a.survivalRate))[0]

    setLeaders({ points: pointsLeader, bounty: bountyLeader, earnings: earningsLeader, survival: survivalLeader })

    // Season stats
    const totalGames = new Set(leagueResults.map(r => r.game_sessions?.id)).size
    const totalPrizePool = leagueResults.reduce((sum, r) => sum + parseFloat(r.winnings || 0), 0)
    const totalBounties = leagueResults.reduce((sum, r) => sum + parseFloat(r.bounty_winnings || 0), 0)

    setSeasonStats({ gamesPlayed: totalGames, totalPrizePool, totalBounties, activePlayers: members?.length || 0 })

    // Calculate yearly stats from game data
    const yearlyStats = calculateYearlyStats(leagueResults, members)
    setCalculatedWinners(yearlyStats)

    // Fetch saved trophy winners from database
    await fetchTrophyWinners()

    setLoading(false)
  }

  const fetchTrophyWinners = async () => {
    const { data } = await supabase
      .from('trophy_winners')
      .select(`
        *,
        users (id, full_name, display_name)
      `)
      .eq('league_id', currentLeague.id)
      .order('year', { ascending: false })

    setTrophyWinners(data || [])
  }

  const calculateYearlyStats = (results, members) => {
    const byYear = {}
    results.forEach(r => {
      const year = new Date(r.game_sessions?.events?.event_date).getFullYear()
      if (!byYear[year]) byYear[year] = []
      byYear[year].push(r)
    })

    const winners = []
    const currentYear = new Date().getFullYear()

    Object.entries(byYear).forEach(([year, yearResults]) => {
      // Points leader
      const pointsByPlayer = {}
      yearResults.forEach(r => {
        if (!pointsByPlayer[r.user_id]) pointsByPlayer[r.user_id] = 0
        pointsByPlayer[r.user_id] += (r.points_earned || 0)
      })

      const pointsWinnerId = Object.entries(pointsByPlayer).sort((a, b) => b[1] - a[1])[0]?.[0]
      const pointsWinner = members?.find(m => m.user_id === pointsWinnerId)

      if (pointsWinner && pointsByPlayer[pointsWinnerId] > 0) {
        winners.push({
          year: parseInt(year),
          category: 'points',
          userId: pointsWinnerId,
          userName: pointsWinner.users?.display_name || pointsWinner.users?.full_name,
          stats: `${pointsByPlayer[pointsWinnerId]} points`,
          isCurrent: year === currentYear.toString(),
          isAutoCalculated: true
        })
      }

      // Bounty leader
      const bountiesByPlayer = {}
      yearResults.forEach(r => {
        if (r.eliminated_by) {
          if (!bountiesByPlayer[r.eliminated_by]) bountiesByPlayer[r.eliminated_by] = 0
          bountiesByPlayer[r.eliminated_by]++
        }
      })

      const bountyWinnerId = Object.entries(bountiesByPlayer).sort((a, b) => b[1] - a[1])[0]?.[0]
      const bountyWinner = members?.find(m => m.user_id === bountyWinnerId)

      if (bountyWinner && bountiesByPlayer[bountyWinnerId] > 0) {
        winners.push({
          year: parseInt(year),
          category: 'bounty',
          userId: bountyWinnerId,
          userName: bountyWinner.users?.display_name || bountyWinner.users?.full_name,
          stats: `${bountiesByPlayer[bountyWinnerId]} knockouts`,
          isCurrent: year === currentYear.toString(),
          isAutoCalculated: true
        })
      }
    })

    return winners.sort((a, b) => b.year - a.year)
  }

  // Merge saved winners with calculated (saved takes precedence)
  const getAllWinners = () => {
    const savedByYearCategory = {}
    trophyWinners.forEach(w => {
      savedByYearCategory[`${w.year}-${w.category}`] = {
        year: w.year,
        category: w.category,
        userId: w.user_id,
        userName: w.users?.display_name || w.users?.full_name,
        stats: w.stats,
        title: w.title,
        isCurrent: w.year === new Date().getFullYear(),
        isAutoCalculated: false,
        id: w.id
      }
    })

    // Add calculated winners where we don't have saved ones
    calculatedWinners.forEach(w => {
      const key = `${w.year}-${w.category}`
      if (!savedByYearCategory[key]) {
        savedByYearCategory[key] = w
      }
    })

    return Object.values(savedByYearCategory).sort((a, b) => b.year - a.year)
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getCategoryInfo = (category) => {
    switch (category) {
      case 'points': return { emoji: '🏆', title: 'Points Champion', color: 'gold' }
      case 'bounty': return { emoji: '🎯', title: 'Bounty King', color: 'red' }
      case 'earnings': return { emoji: '💰', title: 'Money Leader', color: 'green' }
      case 'survival': return { emoji: '🛡️', title: 'Iron Man', color: 'purple' }
      default: return { emoji: '🏆', title: 'Champion', color: 'gold' }
    }
  }

  const getColorClasses = (color, isCurrent) => {
    if (!isCurrent) return 'bg-black/20 border-transparent'
    switch (color) {
      case 'gold': return 'bg-gradient-to-br from-gold/20 to-gold/5 border-gold'
      case 'red': return 'bg-gradient-to-br from-red-600/20 to-red-600/5 border-red-500'
      case 'purple': return 'bg-gradient-to-br from-purple-600/20 to-purple-600/5 border-purple-500'
      case 'green': return 'bg-gradient-to-br from-green-600/20 to-green-600/5 border-green-500'
      default: return 'bg-black/20 border-transparent'
    }
  }

  if (loading) return <div className="px-4 py-8 text-center text-white/50">Loading trophies...</div>

  const allWinners = getAllWinners()

  return (
    <div className="px-4 py-4">
      {/* Current Season Banner */}
      <div className="card card-gold text-center mb-6">
        <div className="text-xs text-gold uppercase tracking-wider mb-1">Current Season</div>
        <div className="font-display text-2xl text-white mb-2">{currentLeague?.name} {new Date().getFullYear()}</div>
        <div className="text-xs text-white/50 mb-4">{seasonStats?.gamesPlayed || 0} games played • {seasonStats?.activePlayers || 0} active players</div>

        {/* Current Leaders Grid */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {leaders.points && (
            <div className="text-center">
              <div className="text-xs text-white/50 mb-1">🏆 Points Leader</div>
              <div className="flex items-center gap-2 justify-center">
                <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center text-[10px] font-bold text-felt-dark">
                  {getInitials(leaders.points.users?.display_name || leaders.points.users?.full_name)}
                </div>
                <span className="text-sm">{leaders.points.users?.display_name || leaders.points.users?.full_name}</span>
              </div>
              <div className="text-xs text-gold mt-1">{leaders.points.totalPoints} pts</div>
            </div>
          )}
          {leaders.bounty && (
            <div className="text-center">
              <div className="text-xs text-white/50 mb-1">🎯 Bounty Leader</div>
              <div className="flex items-center gap-2 justify-center">
                <div className="w-6 h-6 rounded-full bg-chip-red flex items-center justify-center text-[10px] font-bold">
                  {getInitials(leaders.bounty.users?.display_name || leaders.bounty.users?.full_name)}
                </div>
                <span className="text-sm">{leaders.bounty.users?.display_name || leaders.bounty.users?.full_name}</span>
              </div>
              <div className="text-xs text-chip-red mt-1">{leaders.bounty.bountyCount} KOs</div>
            </div>
          )}
          {leaders.earnings && (
            <div className="text-center">
              <div className="text-xs text-white/50 mb-1">💰 Money Leader</div>
              <div className="flex items-center gap-2 justify-center">
                <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-[10px] font-bold">
                  {getInitials(leaders.earnings.users?.display_name || leaders.earnings.users?.full_name)}
                </div>
                <span className="text-sm">{leaders.earnings.users?.display_name || leaders.earnings.users?.full_name}</span>
              </div>
              <div className="text-xs text-green-400 mt-1">{leaders.earnings.netProfit >= 0 ? '+' : ''}${leaders.earnings.netProfit.toFixed(0)}</div>
            </div>
          )}
          {leaders.survival && (
            <div className="text-center">
              <div className="text-xs text-white/50 mb-1">🛡️ Iron Man</div>
              <div className="flex items-center gap-2 justify-center">
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold">
                  {getInitials(leaders.survival.users?.display_name || leaders.survival.users?.full_name)}
                </div>
                <span className="text-sm">{leaders.survival.users?.display_name || leaders.survival.users?.full_name}</span>
              </div>
              <div className="text-xs text-purple-400 mt-1">{leaders.survival.survivalRate}% survival</div>
            </div>
          )}
        </div>
      </div>

      {/* Season Prize Pools */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card text-center">
          <div className="text-white/50 text-xs">Total Prize Pools</div>
          <div className="font-display text-2xl text-gold">${(seasonStats?.totalPrizePool || 0).toLocaleString()}</div>
        </div>
        <div className="card text-center">
          <div className="text-white/50 text-xs">Total Bounties</div>
          <div className="font-display text-2xl text-chip-red">${(seasonStats?.totalBounties || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Hall of Champions */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-lg text-gold">🏆 Hall of Champions</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddWinnerModal(true)}
            className="btn btn-secondary text-xs py-1 px-3"
          >
            + Add Winner
          </button>
        )}
      </div>

      {/* Trophy Categories */}
      {['points', 'bounty', 'earnings', 'survival'].map(category => {
        const info = getCategoryInfo(category)
        const categoryWinners = allWinners.filter(w => w.category === category)

        if (categoryWinners.length === 0) return null

        return (
          <div key={category} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{info.emoji}</span>
              <span className="font-semibold">{info.title}</span>
            </div>
            <div className="space-y-2">
              {categoryWinners.map((winner) => (
                <div
                  key={`${winner.year}-${winner.category}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${getColorClasses(info.color, winner.isCurrent)}`}
                >
                  <div className={`font-display text-lg ${winner.isCurrent ? 'text-gold' : 'text-white/40'}`} style={{ width: 50 }}>
                    {winner.year}
                  </div>
                  <div className={`w-10 h-10 rounded-full bg-chip-blue flex items-center justify-center text-sm font-semibold ${winner.isCurrent ? 'ring-2 ring-offset-2 ring-offset-felt-dark ring-gold' : ''}`}>
                    {getInitials(winner.userName)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{winner.userName}</div>
                    <div className="text-xs text-white/50">
                      {winner.stats}
                      {winner.isAutoCalculated && <span className="ml-2 text-white/30">(auto)</span>}
                    </div>
                  </div>
                  {winner.isCurrent && <span className="text-2xl">{info.emoji}</span>}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {allWinners.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🏆</div>
          <div className="text-white/60">No champions yet</div>
          <div className="text-white/40 text-sm">Complete some games to crown your first champions!</div>
        </div>
      )}

      {/* Add Winner Modal */}
      {showAddWinnerModal && (
        <AddWinnerModal
          leagueId={currentLeague.id}
          userId={user?.id}
          onClose={() => setShowAddWinnerModal(false)}
          onSave={() => {
            setShowAddWinnerModal(false)
            fetchTrophyWinners()
          }}
        />
      )}
    </div>
  )
}

// ============================================
// ADD WINNER MODAL (DATABASE CONNECTED)
// ============================================
function AddWinnerModal({ leagueId, userId, onClose, onSave }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [selectedMember, setSelectedMember] = useState('')
  const [category, setCategory] = useState('points')
  const [year, setYear] = useState(new Date().getFullYear())
  const [stats, setStats] = useState('')
  const [title, setTitle] = useState('')

  const categoryTitles = {
    points: 'Points Champion',
    bounty: 'Bounty King',
    earnings: 'Money Leader',
    survival: 'Iron Man',
    custom: ''
  }

  useEffect(() => {
    fetchMembers()
  }, [leagueId])

  useEffect(() => {
    setTitle(categoryTitles[category] || '')
  }, [category])

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('league_members')
      .select(`user_id, users (id, full_name, display_name)`)
      .eq('league_id', leagueId)
      .eq('status', 'active')
    setMembers(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!selectedMember) {
      setError('Please select a winner')
      return
    }

    setSaving(true)
    setError('')

    // Check if trophy already exists for this year/category
    const { data: existing } = await supabase
      .from('trophy_winners')
      .select('id')
      .eq('league_id', leagueId)
      .eq('year', year)
      .eq('category', category)
      .single()

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('trophy_winners')
        .update({
          user_id: selectedMember,
          title: title || categoryTitles[category],
          stats: stats,
          is_auto_calculated: false,
          awarded_by: userId
        })
        .eq('id', existing.id)

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('trophy_winners')
        .insert({
          league_id: leagueId,
          year: parseInt(year),
          category: category,
          user_id: selectedMember,
          title: title || categoryTitles[category],
          stats: stats,
          is_auto_calculated: false,
          awarded_by: userId
        })

      if (insertError) {
        setError(insertError.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    onSave()
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-felt-dark rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="font-display text-xl text-gold">🏆 Add Champion</h2>
          <button onClick={onClose} className="text-white/60 text-2xl">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-white/60 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
            >
              <option value="points">🏆 Points Champion</option>
              <option value="bounty">🎯 Bounty King</option>
              <option value="earnings">💰 Money Leader</option>
              <option value="survival">🛡️ Iron Man</option>
              <option value="custom">✨ Custom Award</option>
            </select>
          </div>

          {category === 'custom' && (
            <div>
              <label className="block text-sm text-white/60 mb-1">Trophy Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="e.g., Most Improved"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-white/60 mb-1">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="input"
              min={2020}
              max={new Date().getFullYear() + 1}
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Winner</label>
            {loading ? (
              <div className="input text-white/50">Loading...</div>
            ) : (
              <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                {members.map(m => (
                  <button
                    key={m.user_id}
                    onClick={() => setSelectedMember(m.user_id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedMember === m.user_id
                        ? 'bg-gold/20 border border-gold'
                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-chip-blue flex items-center justify-center text-xs font-semibold">
                      {getInitials(m.users?.display_name || m.users?.full_name)}
                    </div>
                    <span className="flex-1 text-left text-sm">
                      {m.users?.display_name || m.users?.full_name}
                    </span>
                    {selectedMember === m.user_id && (
                      <span className="text-gold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Stats (optional)</label>
            <input
              type="text"
              value={stats}
              onChange={(e) => setStats(e.target.value)}
              className="input"
              placeholder="e.g., 142 points, 23 knockouts"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !selectedMember}
            className="w-full btn btn-primary py-3 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Champion'}
          </button>
        </div>
      </div>
    </div>
  )
}
