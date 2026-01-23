import { useGameState } from '../hooks/useGameState'
import { Timer } from '../components/Timer'
import { PlayerList } from '../components/PlayerList'
import { GameControls } from '../components/GameControls'

export function Game({ sessionId, onBack }) {
  const { game, participants, timer, isAdmin, loading, error, connectionState, actions } = useGameState(sessionId)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading game...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <button onClick={onBack} className="text-blue-400 hover:underline">Go back</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-white">&larr; Back</button>
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-gray-400 text-sm">{connectionState}</span>
        </div>
      </div>

      {/* Event Title */}
      <h1 className="text-2xl font-bold text-white text-center mb-2">{game?.event_title || 'Game'}</h1>

      {/* Prize Pool */}
      {game?.prize_pool > 0 && (
        <p className="text-center text-green-400 text-lg mb-6">
          Prize Pool: ${parseFloat(game.prize_pool).toFixed(2)}
        </p>
      )}

      {/* Timer */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <Timer timer={timer} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Players */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-3">Players</h2>
          <PlayerList participants={participants} />
        </div>

        {/* Controls (admin only) */}
        {isAdmin && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3">Controls</h2>
            <GameControls game={game} participants={participants} timer={timer} actions={actions} />
          </div>
        )}
      </div>
    </div>
  )
}
