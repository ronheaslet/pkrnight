import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useGameState } from '../hooks/useGameState'

function formatTime(seconds) {
  if (seconds == null) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function DealerDisplay() {
  const { sessionId } = useParams()
  const { game, participants, timer, loading, connectionState } = useGameState(sessionId)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const activePlayers = participants.filter(p => p.status === 'playing')
  const totalEntries = participants.length
  const prizePool = game?.prize_pool ? parseFloat(game.prize_pool) : 0

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  // Handle escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [toggleFullscreen])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-2xl">Loading...</p>
      </div>
    )
  }

  const isWarning = timer?.timeRemaining != null && timer.timeRemaining <= 60
  const nextLevel = timer?.blinds?.[timer.currentLevel] // 0-indexed next

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col select-none cursor-default">
      {/* Top bar */}
      <div className="flex justify-between items-center px-6 py-3">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${connectionState === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-400 text-sm uppercase tracking-wide">
            {timer?.isRunning ? 'LIVE' : 'PAUSED'}
          </span>
        </div>
        <h2 className="text-gray-400 text-lg">{game?.event_title || 'PKR Night'}</h2>
        <button
          onClick={toggleFullscreen}
          className="text-gray-500 hover:text-white text-sm px-3 py-1 border border-gray-700 rounded transition-colors"
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F)'}
        </button>
      </div>

      {/* Main content - centered timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
        {/* Level indicator */}
        <div className="mb-4">
          <span className="bg-gray-800 text-gray-300 text-lg px-4 py-1 rounded-full">
            Level {timer?.currentLevel || 1}
          </span>
        </div>

        {/* Timer */}
        <div className={`text-center mb-6 ${isWarning ? 'animate-pulse' : ''}`}>
          <div className={`font-mono font-bold leading-none ${isWarning ? 'text-red-400' : 'text-white'}`}
            style={{ fontSize: 'clamp(6rem, 20vw, 16rem)' }}>
            {formatTime(timer?.timeRemaining)}
          </div>
        </div>

        {/* Current blinds */}
        <div className="text-center mb-4">
          <div className="text-4xl md:text-5xl lg:text-6xl font-bold">
            <span className="text-green-400">{timer?.currentBlinds?.smallBlind || '-'}</span>
            <span className="text-gray-500 mx-3">/</span>
            <span className="text-green-400">{timer?.currentBlinds?.bigBlind || '-'}</span>
          </div>
          {timer?.currentBlinds?.ante > 0 && (
            <div className="text-yellow-400 text-2xl mt-2">
              Ante: {timer.currentBlinds.ante}
            </div>
          )}
        </div>

        {/* Paused overlay */}
        {timer && !timer.isRunning && (
          <div className="text-yellow-400 text-3xl font-bold mb-4 animate-pulse">
            PAUSED
          </div>
        )}

        {/* Next level */}
        {nextLevel && (
          <div className="text-gray-500 text-xl">
            Next: {nextLevel.small_blind} / {nextLevel.big_blind}
            {nextLevel.ante > 0 && ` (ante ${nextLevel.ante})`}
          </div>
        )}
      </div>

      {/* Bottom stats bar */}
      <div className="bg-gray-900 border-t border-gray-800 px-6 py-4">
        <div className="flex justify-around items-center max-w-3xl mx-auto">
          <StatItem label="Players" value={`${activePlayers.length} / ${totalEntries}`} />
          <StatItem label="Entries" value={totalEntries} />
          <StatItem label="Prize Pool" value={prizePool > 0 ? `$${prizePool.toFixed(0)}` : '-'} />
          <StatItem label="Avg Stack" value={activePlayers.length > 0 && prizePool > 0
            ? `${Math.round((prizePool / activePlayers.length) * 100)}` : '-'} />
        </div>
      </div>
    </div>
  )
}

function StatItem({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-white text-2xl font-bold">{value}</div>
      <div className="text-gray-500 text-sm uppercase tracking-wide">{label}</div>
    </div>
  )
}
