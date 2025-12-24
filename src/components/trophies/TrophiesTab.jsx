import { useState } from 'react'
import { useLeague } from '../../contexts/LeagueContext'

export default function TrophiesTab() {
  const { isAdmin } = useLeague()

  const trophyCategories = [
    {
      id: 'points',
      title: 'Points Champion',
      emoji: '🏆',
      color: 'gold',
      winners: [
        { year: 2024, name: 'Jake Thompson', initials: 'JT', color: 'bg-chip-red', stats: '142 points • 5 wins • 11 cashes', isCurrent: true },
        { year: 2023, name: 'Mike Davis', initials: 'MD', color: 'bg-chip-blue', stats: '156 points • 6 wins' },
        { year: 2022, name: 'Tommy Chen', initials: 'TC', color: 'bg-green-600', stats: '131 points • 4 wins' },
        { year: 2021, name: 'Ron Harris', initials: 'RH', color: 'bg-gold text-felt-dark', stats: '128 points • 4 wins' },
      ]
    },
    {
      id: 'bounty',
      title: 'Bounty King',
      emoji: '🎯',
      color: 'red',
      winners: [
        { year: 2024, name: 'Ron Harris', initials: 'RH', color: 'bg-gold text-felt-dark', stats: '24 bounties • $120 earned', isCurrent: true },
        { year: 2023, name: 'Mike Davis', initials: 'MD', color: 'bg-chip-blue', stats: '21 bounties' },
      ]
    },
    {
      id: 'survival',
      title: 'Iron Man Champion',
      emoji: '🛡️',
      color: 'purple',
      winners: [
        { year: 2024, name: 'Jake Thompson', initials: 'JT', color: 'bg-chip-red', stats: '72% no-rebuy rate • Avg 2.1 finish', isCurrent: true },
        { year: 2023, name: 'Tommy Chen', initials: 'TC', color: 'bg-green-600', stats: '68% no-rebuy rate' },
      ]
    },
    {
      id: 'money',
      title: 'Money Leader',
      emoji: '💰',
      color: 'green',
      winners: [
        { year: 2024, name: 'Mike Davis', initials: 'MD', color: 'bg-chip-blue', stats: '+$485 profit • 156% ROI', isCurrent: true },
        { year: 2023, name: 'Jake Thompson', initials: 'JT', color: 'bg-chip-red', stats: '+$412 profit' },
      ]
    },
  ]

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

  return (
    <div className="px-4 py-4">
      {/* Current Season Banner */}
      <div className="card card-gold text-center mb-6">
        <div className="text-xs text-gold uppercase tracking-wider mb-1">Current Season</div>
        <div className="font-display text-2xl text-white mb-2">Season 2025</div>
        <div className="text-xs text-white/50 mb-4">Jan 1, 2025 - Dec 31, 2025 • 12 games played</div>
        
        <div className="flex justify-center gap-6">
          <div className="text-center">
            <div className="text-xs text-white/50 mb-1">Points Leader</div>
            <div className="flex items-center gap-2 justify-center">
              <div className="w-6 h-6 rounded-full bg-chip-blue flex items-center justify-center text-[10px]">MD</div>
              <span className="text-sm">Mike Davis</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-white/50 mb-1">Bounty King</div>
            <div className="flex items-center gap-2 justify-center">
              <div className="w-6 h-6 rounded-full bg-gold text-felt-dark flex items-center justify-center text-[10px]">RH</div>
              <span className="text-sm">Ron Harris</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gold">3 games remaining in season</div>
      </div>

      {/* Trophy Categories */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-lg text-gold">🏆 Hall of Champions</h2>
        {isAdmin && (
          <button className="btn btn-secondary text-xs py-1 px-3">+ Add Winner</button>
        )}
      </div>

      {trophyCategories.map(category => (
        <div key={category.id} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{category.emoji}</span>
            <span className="font-semibold">{category.title}</span>
          </div>
          
          <div className="space-y-2">
            {category.winners.map((winner, idx) => (
              <div
                key={winner.year}
                className={`flex items-center gap-3 p-3 rounded-xl border ${getColorClasses(category.color, winner.isCurrent)}`}
              >
                <div className={`font-display text-lg ${winner.isCurrent ? 'text-' + category.color + '-400' : 'text-white/40'}`} style={{ width: 50 }}>
                  {winner.year}
                </div>
                <div className={`w-10 h-10 rounded-full ${winner.color} flex items-center justify-center text-sm font-semibold ${winner.isCurrent ? 'ring-2 ring-offset-2 ring-offset-felt-dark ring-' + category.color + '-400' : ''}`}>
                  {winner.initials}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{winner.name}</div>
                  <div className="text-xs text-white/50">{winner.stats}</div>
                </div>
                {winner.isCurrent && (
                  <span className="text-2xl">{idx === 0 ? '🥇' : category.emoji}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Season Archives Link */}
      <div className="text-center mt-8">
        <button className="btn btn-secondary py-3 px-6">
          📚 View Full Season Archives
        </button>
      </div>
    </div>
  )
}
