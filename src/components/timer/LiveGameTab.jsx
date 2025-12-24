import { useState, useEffect } from 'react'
import { useLeague } from '../../contexts/LeagueContext'

export default function LiveGameTab() {
  const { isAdmin } = useLeague()
  const [timeRemaining, setTimeRemaining] = useState(15 * 60) // 15 minutes
  const [isRunning, setIsRunning] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(1)

  const blinds = [
    { level: 1, sb: 25, bb: 50, ante: 0 },
    { level: 2, sb: 50, bb: 100, ante: 0 },
    { level: 3, sb: 75, bb: 150, ante: 0 },
    { level: 4, sb: 100, bb: 200, ante: 25 },
    { level: 5, sb: 150, bb: 300, ante: 50 },
  ]

  const currentBlinds = blinds[currentLevel - 1] || blinds[0]

  useEffect(() => {
    let interval
    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(t => t - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, timeRemaining])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const players = [
    { name: 'Ron H.', initials: 'RH', color: 'bg-gold text-felt-dark', status: 'playing', chips: 4500 },
    { name: 'Mike D.', initials: 'MD', color: 'bg-chip-blue', status: 'playing', chips: 6200 },
    { name: 'Jake T.', initials: 'JT', color: 'bg-chip-red', status: 'playing', chips: 3800 },
    { name: 'Tommy C.', initials: 'TC', color: 'bg-green-600', status: 'eliminated', position: 4 },
  ]

  const activePlayers = players.filter(p => p.status === 'playing')

  return (
    <div className="px-4 py-4">
      {/* Live indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-green-400 text-sm font-medium">Live • Synced</span>
        <span className="text-white/40 text-sm">• 4 viewers</span>
      </div>

      {/* Timer display */}
      <div className="card card-gold text-center mb-4">
        <div className="text-white/60 text-sm mb-1">Level {currentLevel}</div>
        <div className="timer-display mb-2">{formatTime(timeRemaining)}</div>
        <div className="blinds-display">
          {currentBlinds.sb}/{currentBlinds.bb}
          {currentBlinds.ante > 0 && <span className="text-white/60"> ({currentBlinds.ante})</span>}
        </div>
        
        {/* Admin controls */}
        {isAdmin && (
          <div className="flex gap-2 mt-4 justify-center">
            <button
              onClick={() => setCurrentLevel(l => Math.max(1, l - 1))}
              className="btn btn-secondary py-2 px-4"
            >
              ◀
            </button>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="btn btn-primary py-2 px-8"
            >
              {isRunning ? '⏸ Pause' : '▶ Start'}
            </button>
            <button
              onClick={() => setCurrentLevel(l => l + 1)}
              className="btn btn-secondary py-2 px-4"
            >
              ▶
            </button>
          </div>
        )}

        {!isAdmin && (
          <div className="text-white/40 text-xs mt-4">
            Timer controlled by tournament director
          </div>
        )}
      </div>

      {/* Prize pool */}
      <div className="card mb-4">
        <div className="text-center">
          <div className="text-white/60 text-sm">Prize Pool</div>
          <div className="font-display text-3xl text-gold">$180</div>
          <div className="text-xs text-white/40 mt-1">8 buy-ins + 1 rebuy</div>
        </div>
      </div>

      {/* Players remaining */}
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <span className="font-medium">Players Remaining</span>
          <span className="text-gold font-display text-lg">{activePlayers.length}/8</span>
        </div>
        <div className="space-y-2">
          {players.map((player, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                player.status === 'eliminated' ? 'opacity-50' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-full ${player.color} flex items-center justify-center text-xs font-semibold`}>
                {player.initials}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{player.name}</div>
                {player.status === 'playing' && (
                  <div className="text-xs text-white/50">{player.chips?.toLocaleString()} chips</div>
                )}
                {player.status === 'eliminated' && (
                  <div className="text-xs text-red-400">Eliminated - {player.position}th</div>
                )}
              </div>
              {player.status === 'playing' && isAdmin && (
                <button className="text-red-400 text-xs">Eliminate</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
