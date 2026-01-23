import { useState } from 'react'

export function GameControls({ game, participants, timer, actions }) {
  const [eliminateTarget, setEliminateTarget] = useState('')
  const [eliminator, setEliminator] = useState('')
  const [rebuyTarget, setRebuyTarget] = useState('')
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')

  const activePlayers = participants.filter(p => p.status === 'playing')
  const eliminatedPlayers = participants.filter(p => p.status === 'eliminated')

  async function handleAction(name, fn) {
    setError('')
    setLoading(name)
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading('')
    }
  }

  if (game?.status === 'pending') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => handleAction('start', actions.startGame)}
          disabled={loading === 'start'}
          className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading === 'start' ? 'Starting...' : 'Start Game'}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    )
  }

  if (game?.status === 'completed') {
    return <p className="text-gray-400 text-center">Game completed</p>
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Pause/Resume */}
      <button
        onClick={() => handleAction('pause', timer?.isRunning ? actions.pauseGame : actions.resumeGame)}
        disabled={!!loading}
        className={`w-full py-2 rounded text-white ${timer?.isRunning ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} disabled:opacity-50`}
      >
        {timer?.isRunning ? 'Pause' : 'Resume'}
      </button>

      {/* Eliminate */}
      <div className="space-y-2">
        <label className="text-gray-400 text-sm">Eliminate Player</label>
        <select
          value={eliminateTarget}
          onChange={(e) => setEliminateTarget(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
        >
          <option value="">Select player...</option>
          {activePlayers.map(p => (
            <option key={p.user_id} value={p.user_id}>{p.display_name}</option>
          ))}
        </select>
        <select
          value={eliminator}
          onChange={(e) => setEliminator(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
        >
          <option value="">Eliminated by... (optional)</option>
          {activePlayers.filter(p => p.user_id !== eliminateTarget).map(p => (
            <option key={p.user_id} value={p.user_id}>{p.display_name}</option>
          ))}
        </select>
        <button
          onClick={() => {
            if (!eliminateTarget) return
            handleAction('eliminate', () => actions.eliminate(eliminateTarget, eliminator || undefined))
              .then(() => { setEliminateTarget(''); setEliminator('') })
          }}
          disabled={!eliminateTarget || !!loading}
          className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {loading === 'eliminate' ? 'Processing...' : 'Confirm Elimination'}
        </button>
      </div>

      {/* Rebuy */}
      {eliminatedPlayers.length > 0 && (
        <div className="space-y-2">
          <label className="text-gray-400 text-sm">Process Rebuy</label>
          <select
            value={rebuyTarget}
            onChange={(e) => setRebuyTarget(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
          >
            <option value="">Select player...</option>
            {eliminatedPlayers.map(p => (
              <option key={p.user_id} value={p.user_id}>{p.display_name} (rebuys: {p.rebuy_count || 0})</option>
            ))}
          </select>
          <button
            onClick={() => {
              if (!rebuyTarget) return
              handleAction('rebuy', () => actions.rebuy(rebuyTarget))
                .then(() => setRebuyTarget(''))
            }}
            disabled={!rebuyTarget || !!loading}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading === 'rebuy' ? 'Processing...' : 'Confirm Rebuy'}
          </button>
        </div>
      )}
    </div>
  )
}
