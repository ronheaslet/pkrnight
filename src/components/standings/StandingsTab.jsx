import { useState, useEffect } from 'react'
import { useLeague } from '../../contexts/LeagueContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function StandingsTab() {
  const { currentLeague } = useLeague()
  const { user } = useAuth()
  const [activeSubTab, setActiveSubTab] = useState('points')
  const [standings, setStandings] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [showPlayerModal, setShowPlayerModal] = useState(false)

  const subTabs = [
    { id: 'points', label: 'Points', icon: '🏆' },
    { id: 'bounties', label: 'Bounties', icon: '🎯' },
    { id: 'earnings', label: 'Earnings', icon: '💰' },
    { id: 'games', label: 'Games', icon: '📊' },
  ]

  useEffect(() => {
    if (currentLeague) {
      fetchStandings()
      fetchGames()
    }
  }, [currentLeague])

  const fetchStandings = async () => {
    setLoading(true)
    
    // Get all league members with their stats
    const { data: members, error } = await supabase
      .from('league_members')
      .select(`
        id,
        user_id,
        games_played,
        total_wins,
        total_points,
        total_bounties,
        users (
          id,
          full_name,
          display_name
        )
      `)
      .eq('league_id', currentLeague.id)
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching standings:', error)
      setLoading(false)
      return
    }

    // Get detailed game results for each member
    const { data: gameResults } = await supabase
      .from('game_participants')
      .select(`
        user_id,
        finish_position,
        rebuy_count,
        winnings,
        bounty_winnings,
        points_earned,
        eliminated_by,
        game_sessions (
          id,
          events (
            id,
            league_id,
            event_date,
            buy_in
          )
        )
      `)
      .in('user_id', members.map(m => m.user_id))

    // Filter to only this league's games
    const leagueGameResults = gameResults?.filter(
      r => r.game_sessions?.events?.league_id === currentLeague.id
    ) || []

    // Calculate comprehensive stats for each member
    const enrichedMembers = members.map(member => {
      const playerGames = leagueGameResults.filter(r => r.user_id === member.user_id)
      
      const gamesPlayed = playerGames.length
      const wins = playerGames.filter(g => g.finish_position === 1).length
      const cashes = playerGames.filter(g => g.finish_position <= 3).length
      const totalRebuys = playerGames.reduce((sum, g) => sum + (g.rebuy_count || 0), 0)
      const totalWinnings = playerGames.reduce((sum, g) => sum + parseFloat(g.winnings || 0), 0)
      const totalBounties = playerGames.reduce((sum, g) => sum + parseFloat(g.bounty_winnings || 0), 0)
      const totalBuyIns = playerGames.reduce((sum, g) => {
        const buyIn = g.game_sessions?.events?.buy_in || 20
        return sum + buyIn + (g.rebuy_count * buyIn)
      }, 0)
      const totalPoints = playerGames.reduce((sum, g) => sum + (g.points_earned || 0), 0)
      const bountyCount = leagueGameResults.filter(r => r.eliminated_by === member.user_id).length
      
      // Calculate average finish
      const finishes = playerGames.filter(g => g.finish_position).map(g => g.finish_position)
      const avgFinish = finishes.length > 0 ? finishes.reduce((a, b) => a + b, 0) / finishes.length : 0

      // Survival rate (games without rebuy / total games)
      const noRebuyGames = playerGames.filter(g => g.rebuy_count === 0).length
      const survivalRate = gamesPlayed > 0 ? (noRebuyGames / gamesPlayed * 100) : 0

      return {
        ...member,
        gamesPlayed: gamesPlayed || member.games_played || 0,
        wins: wins || member.total_wins || 0,
        cashes,
        totalRebuys,
        totalWinnings,
        totalBounties,
        totalBuyIns,
        netProfit: totalWinnings + totalBounties - totalBuyIns,
        totalPoints: totalPoints || member.total_points || 0,
        bountyCount: bountyCount || member.total_bounties || 0,
        avgFinish: avgFinish.toFixed(1),
        survivalRate: survivalRate.toFixed(0),
        roi: totalBuyIns > 0 ? ((totalWinnings + totalBounties - totalBuyIns) / totalBuyIns * 100).toFixed(0) : 0,
        isMe: member.user_id === user?.id
      }
    })

    setStandings(enrichedMembers)
    setLoading(false)
  }

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from('game_sessions')
      .select(`
        id,
        started_at,
        ended_at,
        events (
          id,
          title,
          event_date,
          buy_in,
          league_id
        ),
        game_participants (
          id,
          user_id,
          finish_position,
          rebuy_count,
          winnings,
          bounty_winnings,
          points_earned,
          users (
            full_name,
            display_name
          )
        )
      `)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      // Filter to current league
      const leagueGames = data.filter(g => g.events?.league_id === currentLeague.id)
      setGames(leagueGames)
    }
  }

  const getPointsStandings = () => {
    return [...standings]
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((player, idx) => ({ ...player, rank: idx + 1 }))
  }

  const getBountyStandings = () => {
    return [...standings]
      .sort((a, b) => b.bountyCount - a.bountyCount)
      .map((player, idx) => ({ ...player, rank: idx + 1 }))
  }

  const getEarningsStandings = () => {
    return [...standings]
      .sort((a, b) => b.netProfit - a.netProfit)
      .map((player, idx) => ({ ...player, rank: idx + 1 }))
  }

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900'
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800'
    if (rank === 3) return 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
    return 'bg-gray-700 text-white'
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatMoney = (amount) => {
    const num = parseFloat(amount) || 0
    if (num >= 0) return `$${num.toLocaleString()}`
    return `-$${Math.abs(num).toLocaleString()}`
  }

  const openPlayerDetails = (player) => {
    setSelectedPlayer(player)
    setShowPlayerModal(true)
  }

  if (loading) {
    return (
      <div className="px-4 py-8 text-center text-white/50">
        Loading standings...
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
              activeSubTab === tab.id
                ? 'bg-gold text-felt-dark'
                : 'bg-white/10 text-white/70'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Season summary banner */}
      {standings.length > 0 && (
        <div className="card card-gold mb-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-gold uppercase tracking-wider">Current Season</div>
              <div className="font-display text-lg text-white">
                {games.length} Games Played
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/50">Total Prize Pools</div>
              <div className="font-display text-xl text-gold">
                ${standings.reduce((sum, s) => sum + s.totalWinnings, 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {standings.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-white/60 mb-2">No standings yet</div>
          <div className="text-white/40 text-sm">Play some games to see the leaderboard!</div>
        </div>
      )}

      {/* Points Standings */}
      {activeSubTab === 'points' && standings.length > 0 && (
        <div>
          <h3 className="font-display text-lg text-gold mb-3">🏆 Points Leaderboard</h3>
          <div className="space-y-2">
            {getPointsStandings().map(player => (
              <button
                key={player.id}
                onClick={() => openPlayerDetails(player)}
                className={`card flex items-center gap-3 w-full text-left hover:bg-white/5 transition-colors ${
                  player.isMe ? 'border-gold/50 border' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full ${getRankBg(player.rank)} flex items-center justify-center font-bold text-sm`}>
                  {player.rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-chip-blue flex items-center justify-center font-semibold text-sm">
                  {getInitials(player.users?.display_name || player.users?.full_name)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">
                    {player.users?.display_name || player.users?.full_name}
                    {player.isMe && <span className="text-gold ml-2">(You)</span>}
                  </div>
                  <div className="text-xs text-white/50">
                    {player.gamesPlayed} games • {player.wins} wins • {player.cashes} cashes
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl text-gold">{player.totalPoints}</div>
                  <div className="text-xs text-white/50">points</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bounty Standings */}
      {activeSubTab === 'bounties' && standings.length > 0 && (
        <div>
          <h3 className="font-display text-lg text-gold mb-3">🎯 Bounty Hunters</h3>
          <div className="space-y-2">
            {getBountyStandings().map(player => (
              <button
                key={player.id}
                onClick={() => openPlayerDetails(player)}
                className={`card flex items-center gap-3 w-full text-left hover:bg-white/5 transition-colors ${
                  player.isMe ? 'border-gold/50 border' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full ${getRankBg(player.rank)} flex items-center justify-center font-bold text-sm`}>
                  {player.rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-chip-red flex items-center justify-center font-semibold text-sm">
                  {getInitials(player.users?.display_name || player.users?.full_name)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">
                    {player.users?.display_name || player.users?.full_name}
                    {player.isMe && <span className="text-gold ml-2">(You)</span>}
                  </div>
                  <div className="text-xs text-white/50">
                    {player.gamesPlayed} games • ${player.totalBounties} earned
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl text-chip-red">{player.bountyCount}</div>
                  <div className="text-xs text-white/50">knockouts</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Earnings Standings */}
      {activeSubTab === 'earnings' && standings.length > 0 && (
        <div>
          <h3 className="font-display text-lg text-gold mb-3">💰 Money Leaders</h3>
          <div className="space-y-2">
            {getEarningsStandings().map(player => (
              <button
                key={player.id}
                onClick={() => openPlayerDetails(player)}
                className={`card flex items-center gap-3 w-full text-left hover:bg-white/5 transition-colors ${
                  player.isMe ? 'border-gold/50 border' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full ${getRankBg(player.rank)} flex items-center justify-center font-bold text-sm`}>
                  {player.rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-semibold text-sm">
                  {getInitials(player.users?.display_name || player.users?.full_name)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">
                    {player.users?.display_name || player.users?.full_name}
                    {player.isMe && <span className="text-gold ml-2">(You)</span>}
                  </div>
                  <div className="text-xs text-white/50">
                    {player.roi}% ROI • {player.survivalRate}% survival
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-display text-xl ${player.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatMoney(player.netProfit)}
                  </div>
                  <div className="text-xs text-white/50">profit</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Game History */}
      {activeSubTab === 'games' && (
        <div>
          <h3 className="font-display text-lg text-gold mb-3">📊 Recent Games</h3>
          {games.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              No completed games yet
            </div>
          ) : (
            <div className="space-y-3">
              {games.map(game => {
                const participants = game.game_participants || []
                const winner = participants.find(p => p.finish_position === 1)
                const prizePool = participants.reduce((sum, p) => {
                  const buyIn = game.events?.buy_in || 20
                  return sum + buyIn + (p.rebuy_count * buyIn)
                }, 0)
                
                return (
                  <div key={game.id} className="card">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-sm">{game.events?.title}</div>
                        <div className="text-xs text-white/50">
                          {new Date(game.events?.event_date + 'T00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gold font-display">${prizePool}</div>
                        <div className="text-xs text-white/50">{participants.length} players</div>
                      </div>
                    </div>
                    
                    {winner && (
                      <div className="flex items-center gap-2 bg-gold/10 rounded-lg p-2">
                        <span className="text-lg">🏆</span>
                        <span className="text-sm text-gold">
                          {winner.users?.display_name || winner.users?.full_name}
                        </span>
                        {winner.winnings > 0 && (
                          <span className="text-sm text-green-400 ml-auto">
                            +${parseFloat(winner.winnings).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Top 3 finishers */}
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <div className="flex gap-4 text-xs">
                        {participants
                          .filter(p => p.finish_position && p.finish_position <= 3)
                          .sort((a, b) => a.finish_position - b.finish_position)
                          .map(p => (
                            <div key={p.id} className="flex items-center gap-1">
                              <span className={
                                p.finish_position === 1 ? 'text-yellow-400' :
                                p.finish_position === 2 ? 'text-gray-300' :
                                'text-amber-600'
                              }>
                                {p.finish_position === 1 ? '🥇' : p.finish_position === 2 ? '🥈' : '🥉'}
                              </span>
                              <span className="text-white/70">
                                {p.users?.display_name || p.users?.full_name}
                              </span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Player Detail Modal */}
      {showPlayerModal && selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          leagueId={currentLeague.id}
          onClose={() => {
            setShowPlayerModal(false)
            setSelectedPlayer(null)
          }}
        />
      )}
    </div>
  )
}

function PlayerDetailModal({ player, leagueId, onClose }) {
  const [playerGames, setPlayerGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlayerGames()
  }, [])

  const fetchPlayerGames = async () => {
    const { data } = await supabase
      .from('game_participants')
      .select(`
        *,
        game_sessions (
          id,
          events (
            title,
            event_date,
            buy_in,
            league_id
          )
        ),
        eliminated_by_user:users!game_participants_eliminated_by_fkey (
          display_name,
          full_name
        )
      `)
      .eq('user_id', player.user_id)
      .order('created_at', { ascending: false })

    if (data) {
      const leagueGames = data.filter(g => g.game_sessions?.events?.league_id === leagueId)
      setPlayerGames(leagueGames)
    }
    setLoading(false)
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getFinishEmoji = (position) => {
    if (position === 1) return '🥇'
    if (position === 2) return '🥈'
    if (position === 3) return '🥉'
    return `${position}th`
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-felt-dark rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-chip-blue flex items-center justify-center font-bold">
              {getInitials(player.users?.display_name || player.users?.full_name)}
            </div>
            <div>
              <h2 className="font-display text-xl text-white">
                {player.users?.display_name || player.users?.full_name}
              </h2>
              <div className="text-sm text-white/50">{player.gamesPlayed} games played</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 text-2xl">&times;</button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card text-center">
              <div className="font-display text-2xl text-gold">{player.wins}</div>
              <div className="text-xs text-white/50">Wins</div>
            </div>
            <div className="card text-center">
              <div className="font-display text-2xl text-chip-red">{player.bountyCount}</div>
              <div className="text-xs text-white/50">Bounties</div>
            </div>
            <div className="card text-center">
              <div className={`font-display text-2xl ${player.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {player.netProfit >= 0 ? '+' : ''}{player.netProfit}
              </div>
              <div className="text-xs text-white/50">Profit</div>
            </div>
          </div>

          {/* Additional stats */}
          <div className="card mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/50">Avg Finish:</span>
                <span className="text-white ml-2">{player.avgFinish}</span>
              </div>
              <div>
                <span className="text-white/50">Survival:</span>
                <span className="text-white ml-2">{player.survivalRate}%</span>
              </div>
              <div>
                <span className="text-white/50">Total Rebuys:</span>
                <span className="text-white ml-2">{player.totalRebuys}</span>
              </div>
              <div>
                <span className="text-white/50">ROI:</span>
                <span className={`ml-2 ${player.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {player.roi}%
                </span>
              </div>
            </div>
          </div>

          {/* Game history */}
          <h4 className="font-semibold mb-2">Game History</h4>
          {loading ? (
            <div className="text-center py-4 text-white/50">Loading...</div>
          ) : (
            <div className="space-y-2">
              {playerGames.map(game => (
                <div key={game.id} className="card flex items-center gap-3">
                  <div className="text-lg">
                    {getFinishEmoji(game.finish_position)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{game.game_sessions?.events?.title}</div>
                    <div className="text-xs text-white/50">
                      {game.game_sessions?.events?.event_date && new Date(game.game_sessions.events.event_date + 'T00:00').toLocaleDateString()}
                      {game.rebuy_count > 0 && ` • ${game.rebuy_count}R`}
                    </div>
                  </div>
                  <div className="text-right">
                    {game.winnings > 0 && (
                      <div className="text-green-400 text-sm">+${parseFloat(game.winnings)}</div>
                    )}
                    <div className="text-gold text-sm">{game.points_earned || 0} pts</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
