import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useWebSocket } from './useWebSocket'

export function useGameState(sessionId) {
  const [game, setGame] = useState(null)
  const [participants, setParticipants] = useState([])
  const [timer, setTimer] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { connectionState, lastMessage } = useWebSocket(sessionId)

  // Fetch initial state
  useEffect(() => {
    if (!sessionId) return
    api.get(`/api/games/${sessionId}`)
      .then((data) => {
        setGame(data.session)
        setParticipants(data.participants)
        setTimer(data.timer)
        setIsAdmin(data.isAdmin)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return

    switch (lastMessage.type) {
      case 'TIMER_TICK':
        setTimer(prev => prev ? {
          ...prev,
          timeRemaining: lastMessage.timeRemaining,
          currentLevel: lastMessage.level,
          currentBlinds: lastMessage.blinds
        } : prev)
        break

      case 'LEVEL_CHANGE':
        setTimer(prev => prev ? {
          ...prev,
          currentLevel: lastMessage.level,
          currentBlinds: lastMessage.blinds,
          timeRemaining: lastMessage.timeRemaining
        } : prev)
        break

      case 'TIMER_PAUSED':
        setTimer(prev => prev ? { ...prev, isRunning: false, timeRemaining: lastMessage.timeRemaining } : prev)
        break

      case 'TIMER_RESUMED':
        setTimer(prev => prev ? { ...prev, isRunning: true, timeRemaining: lastMessage.timeRemaining } : prev)
        break

      case 'PLAYER_ELIMINATED':
        setParticipants(prev => prev.map(p => {
          if (p.user_id === lastMessage.eliminatedUserId) {
            return { ...p, status: 'eliminated', finish_position: lastMessage.finishPosition }
          }
          if (p.user_id === lastMessage.eliminatorUserId) {
            return { ...p, bounty_count: (p.bounty_count || 0) + 1 }
          }
          return p
        }))
        break

      case 'REBUY':
        setParticipants(prev => prev.map(p => {
          if (p.user_id === lastMessage.userId) {
            return { ...p, status: 'playing', finish_position: null, rebuy_count: (p.rebuy_count || 0) + 1 }
          }
          return p
        }))
        setGame(prev => prev ? { ...prev, prize_pool: lastMessage.newPrizePool } : prev)
        break

      case 'GAME_STARTED':
        setGame(prev => prev ? { ...prev, status: 'running', prize_pool: lastMessage.prizePool, player_count: lastMessage.playerCount } : prev)
        setTimer(lastMessage.timer)
        setParticipants(prev => prev.map(p => ({ ...p, status: 'playing' })))
        break

      case 'GAME_ENDED':
        setGame(prev => prev ? { ...prev, status: 'completed', is_running: false } : prev)
        setTimer(prev => prev ? { ...prev, isRunning: false } : prev)
        break
    }
  }, [lastMessage])

  const actions = {
    startGame: () => api.post(`/api/games/${sessionId}/start`),
    pauseGame: () => api.post(`/api/games/${sessionId}/pause`),
    resumeGame: () => api.post(`/api/games/${sessionId}/resume`),
    eliminate: (eliminatedUserId, eliminatorUserId) =>
      api.post(`/api/games/${sessionId}/eliminate`, { eliminatedUserId, eliminatorUserId }),
    rebuy: (userId) => api.post(`/api/games/${sessionId}/rebuy`, { userId })
  }

  return { game, participants, timer, isAdmin, loading, error, connectionState, actions }
}
