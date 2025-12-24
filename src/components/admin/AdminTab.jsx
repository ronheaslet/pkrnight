import { useState } from 'react'
import { useLeague } from '../../contexts/LeagueContext'

export default function AdminTab() {
  const { currentLeague } = useLeague()
  const [showSettings, setShowSettings] = useState(false)

  const adminTiles = [
    { id: 'settings', icon: '⚙️', title: 'League Settings', desc: 'Buy-ins, rebuys, dues' },
    { id: 'members', icon: '👥', title: 'Manage Members', desc: '12 active members' },
    { id: 'invite', icon: '🔗', title: 'Invite Link', desc: 'pkrnight.com/join/...' },
    { id: 'points', icon: '📊', title: 'Edit Points', desc: 'Scoring structure' },
    { id: 'payouts', icon: '💰', title: 'Edit Payouts', desc: 'Prize distribution' },
    { id: 'blinds', icon: '⏱️', title: 'Blind Structure', desc: '15 levels configured' },
    { id: 'season', icon: '🏆', title: 'Season Summary', desc: 'View & close season' },
    { id: 'balances', icon: '💳', title: 'Player Balances', desc: 'Dues & credits' },
  ]

  const memberBalances = [
    { name: 'Mike Davis', initials: 'MD', color: 'bg-chip-blue', dues: 'Paid', balance: 0 },
    { name: 'Jake Thompson', initials: 'JT', color: 'bg-chip-red', dues: 'Paid', balance: 25 },
    { name: 'Tommy Chen', initials: 'TC', color: 'bg-green-600', dues: 'Unpaid', balance: -50 },
    { name: 'Steve Wilson', initials: 'SW', color: 'bg-gray-500', dues: 'Paid', balance: -15 },
  ]

  return (
    <div className="px-4 py-4">
      <h2 className="font-display text-xl text-gold mb-4">Admin Panel</h2>

      {/* Admin tiles grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {adminTiles.map(tile => (
          <button
            key={tile.id}
            className="card text-left hover:bg-white/5 transition-colors"
            onClick={() => tile.id === 'settings' && setShowSettings(true)}
          >
            <div className="text-2xl mb-2">{tile.icon}</div>
            <div className="font-semibold text-sm text-white">{tile.title}</div>
            <div className="text-xs text-white/50">{tile.desc}</div>
          </button>
        ))}
      </div>

      {/* Player Balances */}
      <div className="mb-4">
        <h3 className="font-display text-lg text-gold mb-3">Player Balances</h3>
        <div className="space-y-2">
          {memberBalances.map((member, idx) => (
            <div key={idx} className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${member.color} flex items-center justify-center font-semibold text-sm`}>
                {member.initials}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{member.name}</div>
                <div className={`text-xs ${member.dues === 'Paid' ? 'text-green-400' : 'text-red-400'}`}>
                  Dues: {member.dues}
                </div>
              </div>
              <div className={`text-right font-display text-lg ${
                member.balance > 0 ? 'text-green-400' : member.balance < 0 ? 'text-red-400' : 'text-white/50'
              }`}>
                {member.balance > 0 ? '+' : ''}{member.balance !== 0 ? `$${Math.abs(member.balance)}` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="card">
        <h3 className="font-semibold text-sm mb-3">Season Stats</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="font-display text-2xl text-gold">12</div>
            <div className="text-xs text-white/50">Games</div>
          </div>
          <div>
            <div className="font-display text-2xl text-green-400">$2,880</div>
            <div className="text-xs text-white/50">Prize Pools</div>
          </div>
          <div>
            <div className="font-display text-2xl text-white">8.3</div>
            <div className="text-xs text-white/50">Avg Players</div>
          </div>
        </div>
      </div>

      {/* Settings Modal would go here */}
    </div>
  )
}
