import { useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useGameState } from '../hooks/useGameState'
import { useSounds } from '../hooks/useSounds'
import { Timer } from '../components/Timer'
import { PlayerList } from '../components/PlayerList'
import { GameControls } from '../components/GameControls'
import { Spinner } from '../components/Spinner'

export function Game() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { game, participants, timer, isAdmin, permissions, loading, error, connectionState, actions } = useGameState(sessionId)
  const { settings, updateSettings, playLevelChange, playWarning, announceLevel } = useSounds()
  const hasControls = permissions.length > 0
  const prevLevelRef = useRef(null)
  const warningPlayedRef = useRef(false)

  // Sound effects for level changes and warnings
  useEffect(() => {
    if (!timer) return

    // Level change detection
    if (prevLevelRef.current !== null && timer.currentLevel > prevLevelRef.current) {
      playLevelChange()
      if (timer.currentBlinds) {
        announceLevel(timer.currentBlinds)
      }
      warningPlayedRef.current = false
    }
    prevLevelRef.current = timer.currentLevel

    // Warning at 60 seconds
    if (timer.timeRemaining === 60 && timer.isRunning && !warningPlayedRef.current) {
      playWarning()
      warningPlayedRef.current = true
    }
    if (timer.timeRemaining > 60) {
      warningPlayedRef.current = false
    }
  }, [timer?.currentLevel, timer?.timeRemaining, timer?.isRunning, playLevelChange, playWarning, announceLevel])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <button onClick={() => navigate(-1)} className="text-green-400 hover:underline">Go back</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">&larr; Back</button>
        <div className="flex items-center gap-3">
          {/* Sound controls */}
          <button
            onClick={() => updateSettings({ enabled: !settings.enabled })}
            className={`text-sm px-2 py-1 rounded ${settings.enabled ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}
            title={settings.enabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {settings.enabled ? 'Sound ON' : 'Sound OFF'}
          </button>
          {settings.enabled && (
            <button
              onClick={() => updateSettings({ voice: !settings.voice })}
              className={`text-sm px-2 py-1 rounded ${settings.voice ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-400'}`}
              title={settings.voice ? 'Disable voice' : 'Enable voice'}
            >
              {settings.voice ? 'Voice ON' : 'Voice OFF'}
            </button>
          )}
          <Link
            to={`/games/${sessionId}/display`}
            target="_blank"
            className="text-sm px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            title="Open dealer/TV display"
          >
            TV
          </Link>
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
      <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
        <Timer timer={timer} />
      </div>

      {/* Rebuy cutoff indicator */}
      {game?.rebuy_cutoff_level > 0 && timer && (
        <div className={`text-center text-sm mb-4 ${timer.currentLevel > game.rebuy_cutoff_level ? 'text-red-400' : 'text-gray-400'}`}>
          {timer.currentLevel > game.rebuy_cutoff_level
            ? 'Rebuys CLOSED'
            : `Rebuys close after Level ${game.rebuy_cutoff_level}`}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Players */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-3">Players</h2>
          <PlayerList participants={participants} />
        </div>

        {/* Controls (users with permissions) */}
        {hasControls && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-3">Controls</h2>
            <GameControls game={game} participants={participants} timer={timer} actions={actions} permissions={permissions} />
          </div>
        )}
      </div>
    </div>
  )
}
