function formatTime(seconds) {
  if (seconds == null) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function Timer({ timer }) {
  if (!timer) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Waiting for game to start...</p>
      </div>
    )
  }

  const isWarning = timer.timeRemaining <= 60
  const nextLevel = timer.blinds?.[timer.currentLevel] // 0-indexed, currentLevel is 1-based

  return (
    <div className="text-center space-y-4">
      <div className="text-gray-400 text-sm">Level {timer.currentLevel}</div>

      <div className={`text-6xl font-mono font-bold ${isWarning ? 'text-red-400 animate-pulse' : 'text-white'}`}>
        {formatTime(timer.timeRemaining)}
      </div>

      <div className="text-2xl text-white">
        <span className="text-green-400">{timer.currentBlinds?.smallBlind}</span>
        {' / '}
        <span className="text-green-400">{timer.currentBlinds?.bigBlind}</span>
        {timer.currentBlinds?.ante > 0 && (
          <span className="text-yellow-400 text-lg ml-2">Ante {timer.currentBlinds.ante}</span>
        )}
      </div>

      {!timer.isRunning && (
        <div className="text-yellow-400 text-sm font-semibold">PAUSED</div>
      )}

      {nextLevel && (
        <div className="text-gray-500 text-sm">
          Next: {nextLevel.small_blind}/{nextLevel.big_blind}
          {nextLevel.ante > 0 && ` (ante ${nextLevel.ante})`}
        </div>
      )}
    </div>
  )
}
