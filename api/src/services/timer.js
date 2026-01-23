import { query } from '../db/client.js'
import { broadcast } from './websocket.js'

// In-memory timer state
const timers = new Map()

export function initializeTimer(sessionId, blindLevels) {
  const firstLevel = blindLevels[0]
  const state = {
    sessionId,
    currentLevel: 1,
    timeRemaining: firstLevel.duration_minutes * 60,
    isRunning: false,
    blinds: blindLevels,
    currentBlinds: {
      smallBlind: firstLevel.small_blind,
      bigBlind: firstLevel.big_blind,
      ante: firstLevel.ante
    }
  }
  timers.set(sessionId, state)
  return state
}

export function getTimerState(sessionId) {
  return timers.get(sessionId) || null
}

export function setTimerRunning(sessionId, isRunning) {
  const timer = timers.get(sessionId)
  if (!timer) return null
  timer.isRunning = isRunning
  return timer
}

export function advanceLevel(sessionId) {
  const timer = timers.get(sessionId)
  if (!timer) return null

  timer.currentLevel += 1
  const nextLevel = timer.blinds[timer.currentLevel - 1]

  if (nextLevel) {
    timer.timeRemaining = nextLevel.duration_minutes * 60
    timer.currentBlinds = {
      smallBlind: nextLevel.small_blind,
      bigBlind: nextLevel.big_blind,
      ante: nextLevel.ante
    }
  } else {
    // No more levels, repeat last level
    const lastLevel = timer.blinds[timer.blinds.length - 1]
    timer.timeRemaining = lastLevel.duration_minutes * 60
  }

  return timer
}

export function destroyTimer(sessionId) {
  timers.delete(sessionId)
}

export function getAllActiveTimers() {
  return Array.from(timers.values()).filter(t => t.isRunning)
}

// Persist timer state to DB every 30 ticks
let persistCounter = 0

export async function tickTimers() {
  const activeTimers = getAllActiveTimers()

  for (const timer of activeTimers) {
    timer.timeRemaining -= 1

    if (timer.timeRemaining <= 0) {
      const previousLevel = timer.currentLevel
      advanceLevel(timer.sessionId)

      broadcast(timer.sessionId, {
        type: 'LEVEL_CHANGE',
        level: timer.currentLevel,
        blinds: timer.currentBlinds,
        timeRemaining: timer.timeRemaining,
        previousLevel
      })
    } else {
      broadcast(timer.sessionId, {
        type: 'TIMER_TICK',
        timeRemaining: timer.timeRemaining,
        level: timer.currentLevel,
        blinds: timer.currentBlinds
      })
    }
  }

  // Persist to DB every 30 seconds
  persistCounter++
  if (persistCounter >= 30) {
    persistCounter = 0
    for (const timer of Array.from(timers.values())) {
      try {
        await query(
          `UPDATE game_sessions SET current_level = $1, time_remaining_seconds = $2, is_running = $3 WHERE id = $4`,
          [timer.currentLevel, timer.timeRemaining, timer.isRunning, timer.sessionId]
        )
      } catch (err) {
        console.error('Failed to persist timer:', err.message)
      }
    }
  }
}
