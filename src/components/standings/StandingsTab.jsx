import { useState } from 'react'
import { useLeague } from '../../contexts/LeagueContext'

export default function StandingsTab() {
  const { currentLeague } = useLeague()
  const [activeSubTab, setActiveSubTab] = useState('points')

  const subTabs = [
    { id: 'points', label: 'Points' },
    { id: 'survival', label: 'Survival' },
    { id: 'bounties', label: 'Bounties' },
    { id: 'earnings', label: 'Earnings' },
  ]

  const pointsStandings = [
    { rank: 1, name: 'Mike "The Shark" Davis', initials: 'MD', color: 'bg-chip-blue', games: 12, wins: 4, cashes: 8, points: 127 },
    { rank: 2, name: 'Jake Thompson', initials: 'JT', color: 'bg-chip-red', games: 11, wins: 3, cashes: 7, points: 98 },
    { rank: 3, name: 'Ron Harris', initials: 'RH', color: 'bg-gold text-felt-dark', games: 10, wins: 2, cashes: 6, points: 89, isMe: true },
    { rank: 4, name: 'Tommy Chen', initials: 'TC', color: 'bg-green-600', games: 9, wins: 1, cashes: 5, points: 72 },
    { rank: 5, name: 'Steve Wilson', initials: 'SW', color: 'bg-gray-500', games: 8, wins: 1, cashes: 4, points: 58 },
  ]

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900'
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800'
    if (rank === 3) return 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
    return 'bg-gray-700 text-white'
  }

  return (
    <div className="px-4 py-4">
      <div className="flex gap-2 mb-4 flex-wrap">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
              activeSubTab === tab.id
                ? 'bg-gold text-felt-dark'
                : 'bg-white/10 text-white/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'points' && (
        <div>
          <h3 className="font-display text-lg text-gold mb-3">Season 1 Standings</h3>
          <div className="space-y-2">
            {pointsStandings.map(player => (
              <div key={player.rank} className={`card flex items-center gap-3 ${player.isMe ? 'border-gold/50 border' : ''}`}>
                <div className={`w-8 h-8 rounded-full ${getRankBg(player.rank)} flex items-center justify-center font-bold text-sm`}>
                  {player.rank}
                </div>
                <div className={`w-10 h-10 rounded-full ${player.color} flex items-center justify-center font-semibold text-sm`}>
                  {player.initials}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">{player.name}</div>
                  <div className="text-xs text-white/50">{player.games} games • {player.wins} wins • {player.cashes} cashes</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl text-gold">{player.points}</div>
                  <div className="text-xs text-white/50">points</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'survival' && (
        <div className="text-center py-12 text-white/50">
          <div className="text-4xl mb-3">🛡️</div>
          <div>Survival standings coming soon</div>
        </div>
      )}

      {activeSubTab === 'bounties' && (
        <div className="text-center py-12 text-white/50">
          <div className="text-4xl mb-3">🎯</div>
          <div>Bounty leaderboard coming soon</div>
        </div>
      )}

      {activeSubTab === 'earnings' && (
        <div className="text-center py-12 text-white/50">
          <div className="text-4xl mb-3">💰</div>
          <div>Earnings leaderboard coming soon</div>
        </div>
      )}
    </div>
  )
}
