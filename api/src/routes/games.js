import { Hono } from 'hono'
import { query, withTransaction } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { ValidationError, NotFoundError, ForbiddenError } from '../lib/errors.js'
import { initializeTimer, getTimerState, setTimerRunning, destroyTimer } from '../services/timer.js'
import { broadcast } from '../services/websocket.js'
import { calculatePayouts } from '../services/payout.js'
import { calculatePoints } from '../services/points.js'
import { hasPermission, getUserPermissions } from './roles.js'

const games = new Hono()

games.use('*', authMiddleware)

async function requireGamePermission(userId, sessionId, permission) {
  const { rows } = await query(
    `SELECT gs.league_id, lm.role FROM game_sessions gs
     JOIN league_members lm ON lm.league_id = gs.league_id AND lm.user_id = $1
     WHERE gs.id = $2 AND lm.status = 'active'`,
    [userId, sessionId]
  )
  if (rows.length === 0) throw new ForbiddenError('Not a member of this league')

  const leagueId = rows[0].league_id

  // Owner/admin always has access
  if (rows[0].role === 'owner' || rows[0].role === 'admin') return rows[0]

  // Check custom role permission
  const hasPerm = await hasPermission(userId, leagueId, permission)
  if (!hasPerm) {
    throw new ForbiddenError(`Permission '${permission}' required`)
  }

  return rows[0]
}

async function requireGameAdmin(userId, sessionId) {
  return requireGamePermission(userId, sessionId, 'start_game')
}

// Get game session state
games.get('/:sessionId', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('sessionId')

  const { rows: sessions } = await query(
    `SELECT gs.*, e.title as event_title, e.buy_in_amount, e.max_rebuys, e.rebuy_amount, e.rebuy_cutoff_level
     FROM game_sessions gs
     JOIN events e ON e.id = gs.event_id
     WHERE gs.id = $1`,
    [sessionId]
  )
  if (sessions.length === 0) throw new NotFoundError('Game session')

  const session = sessions[0]

  // Verify membership
  const { rows: membership } = await query(
    `SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [session.league_id, user.id]
  )
  if (membership.length === 0) throw new ForbiddenError('Not a member of this league')

  const { rows: participants } = await query(
    `SELECT gp.*, p.display_name, p.avatar_url
     FROM game_participants gp
     JOIN profiles p ON p.user_id = gp.user_id
     WHERE gp.session_id = $1
     ORDER BY CASE gp.status WHEN 'playing' THEN 0 WHEN 'winner' THEN 1 ELSE 2 END,
              gp.finish_position NULLS LAST`,
    [sessionId]
  )

  const timer = getTimerState(sessionId)

  const userPermissions = await getUserPermissions(user.id, session.league_id)
  const isAdmin = membership[0].role === 'owner' || membership[0].role === 'admin'

  return c.json({
    success: true,
    data: {
      session,
      participants,
      timer,
      isAdmin,
      permissions: userPermissions
    }
  })
})

// Create game session from event
games.post('/create', async (c) => {
  const user = c.get('user')
  const { eventId } = await c.req.json()

  if (!eventId) throw new ValidationError('eventId is required')

  const { rows: eventRows } = await query('SELECT * FROM events WHERE id = $1', [eventId])
  if (eventRows.length === 0) throw new NotFoundError('Event')

  const event = eventRows[0]

  const { rows: membership } = await query(
    `SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [event.league_id, user.id]
  )
  if (membership.length === 0 || (membership[0].role !== 'owner' && membership[0].role !== 'admin')) {
    throw new ForbiddenError('Admin access required')
  }

  const { rows } = await query(
    `INSERT INTO game_sessions (event_id, league_id, status)
     VALUES ($1, $2, 'pending') RETURNING *`,
    [eventId, event.league_id]
  )

  return c.json({ success: true, data: { session: rows[0] } }, 201)
})

// Register participant
games.post('/:sessionId/register', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('sessionId')
  const { userId: targetUserId } = await c.req.json()
  const registerUserId = targetUserId || user.id

  const { rows: sessions } = await query(
    `SELECT gs.*, e.buy_in_amount FROM game_sessions gs JOIN events e ON e.id = gs.event_id WHERE gs.id = $1`,
    [sessionId]
  )
  if (sessions.length === 0) throw new NotFoundError('Game session')

  // If registering someone else, need register_player permission
  if (targetUserId && targetUserId !== user.id) {
    await requireGamePermission(user.id, sessionId, 'register_player')
  }

  // Verify target is league member
  const { rows: membership } = await query(
    `SELECT id FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [sessions[0].league_id, registerUserId]
  )
  if (membership.length === 0) throw new ForbiddenError('User is not a league member')

  const { rows } = await query(
    `INSERT INTO game_participants (session_id, user_id, status, buy_in_paid)
     VALUES ($1, $2, 'registered', true)
     ON CONFLICT (session_id, user_id) DO NOTHING
     RETURNING *`,
    [sessionId, registerUserId]
  )

  if (rows.length === 0) {
    return c.json({ success: true, data: { message: 'Already registered' } })
  }

  // Update player count
  await query(
    `UPDATE game_sessions SET player_count = player_count + 1 WHERE id = $1`,
    [sessionId]
  )

  return c.json({ success: true, data: { participant: rows[0] } }, 201)
})

// Start game
games.post('/:sessionId/start', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('sessionId')
  await requireGamePermission(user.id, sessionId, 'start_game')

  const { rows: sessions } = await query(
    `SELECT gs.*, e.buy_in_amount, e.blind_structure_id FROM game_sessions gs
     JOIN events e ON e.id = gs.event_id WHERE gs.id = $1`,
    [sessionId]
  )
  if (sessions.length === 0) throw new NotFoundError('Game session')

  const session = sessions[0]
  if (session.status !== 'pending') {
    throw new ValidationError('Game can only be started from pending status')
  }

  // Get participants
  const { rows: participants } = await query(
    `SELECT * FROM game_participants WHERE session_id = $1 AND status = 'registered'`,
    [sessionId]
  )
  if (participants.length < 2) {
    throw new ValidationError('Need at least 2 registered players to start')
  }

  // Calculate prize pool
  const prizePool = participants.length * parseFloat(session.buy_in_amount || 0)

  // Get blind structure
  let blindLevels = [
    { level_number: 1, small_blind: 25, big_blind: 50, ante: 0, duration_minutes: 15 },
    { level_number: 2, small_blind: 50, big_blind: 100, ante: 0, duration_minutes: 15 },
    { level_number: 3, small_blind: 75, big_blind: 150, ante: 25, duration_minutes: 15 },
    { level_number: 4, small_blind: 100, big_blind: 200, ante: 25, duration_minutes: 15 },
    { level_number: 5, small_blind: 150, big_blind: 300, ante: 50, duration_minutes: 15 },
    { level_number: 6, small_blind: 200, big_blind: 400, ante: 50, duration_minutes: 15 },
    { level_number: 7, small_blind: 300, big_blind: 600, ante: 75, duration_minutes: 15 },
    { level_number: 8, small_blind: 500, big_blind: 1000, ante: 100, duration_minutes: 15 }
  ]

  if (session.blind_structure_id) {
    const { rows: levels } = await query(
      `SELECT * FROM blind_levels WHERE structure_id = $1 ORDER BY level_number`,
      [session.blind_structure_id]
    )
    if (levels.length > 0) blindLevels = levels
  }

  // Update session and participants
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE game_sessions SET status = 'running', is_running = true, prize_pool = $1, player_count = $2, started_at = NOW() WHERE id = $3`,
      [prizePool, participants.length, sessionId]
    )
    await client.query(
      `UPDATE game_participants SET status = 'playing' WHERE session_id = $1 AND status = 'registered'`,
      [sessionId]
    )
  })

  // Initialize timer
  const timer = initializeTimer(sessionId, blindLevels)
  setTimerRunning(sessionId, true)

  broadcast(sessionId, {
    type: 'GAME_STARTED',
    playerCount: participants.length,
    prizePool,
    timer
  })

  return c.json({ success: true, data: { timer, prizePool, playerCount: participants.length } })
})

// Pause game
games.post('/:sessionId/pause', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('sessionId')
  await requireGamePermission(user.id, sessionId, 'pause_timer')

  const timer = setTimerRunning(sessionId, false)
  await query(`UPDATE game_sessions SET is_running = false WHERE id = $1`, [sessionId])

  broadcast(sessionId, { type: 'TIMER_PAUSED', timeRemaining: timer?.timeRemaining })
  return c.json({ success: true, data: { timer } })
})

// Resume game
games.post('/:sessionId/resume', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('sessionId')
  await requireGamePermission(user.id, sessionId, 'pause_timer')

  const timer = setTimerRunning(sessionId, true)
  await query(`UPDATE game_sessions SET is_running = true WHERE id = $1`, [sessionId])

  broadcast(sessionId, { type: 'TIMER_RESUMED', timeRemaining: timer?.timeRemaining })
  return c.json({ success: true, data: { timer } })
})

// Eliminate player
games.post('/:sessionId/eliminate', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('sessionId')
  await requireGamePermission(user.id, sessionId, 'eliminate_player')

  const { eliminatedUserId, eliminatorUserId } = await c.req.json()
  if (!eliminatedUserId) throw new ValidationError('eliminatedUserId is required')

  const result = await withTransaction(async (client) => {
    // Get current active players
    const { rows: activePlayers } = await client.query(
      `SELECT * FROM game_participants WHERE session_id = $1 AND status = 'playing'`,
      [sessionId]
    )

    const eliminated = activePlayers.find(p => p.user_id === eliminatedUserId)
    if (!eliminated) throw new ValidationError('Player is not active in this game')

    const finishPosition = activePlayers.length

    // Update eliminated player
    await client.query(
      `UPDATE game_participants SET status = 'eliminated', finish_position = $1, eliminated_by = $2, eliminated_at = NOW()
       WHERE session_id = $3 AND user_id = $4`,
      [finishPosition, eliminatorUserId || null, sessionId, eliminatedUserId]
    )

    // Update eliminator bounty count
    if (eliminatorUserId) {
      await client.query(
        `UPDATE game_participants SET bounty_count = bounty_count + 1 WHERE session_id = $1 AND user_id = $2`,
        [sessionId, eliminatorUserId]
      )
    }

    // Log event
    await client.query(
      `INSERT INTO game_events (session_id, event_type, event_data, actor_id)
       VALUES ($1, 'elimination', $2, $3)`,
      [sessionId, JSON.stringify({ eliminatedUserId, eliminatorUserId, finishPosition }), user.id]
    )

    const remainingPlayers = activePlayers.length - 1

    // Check if game is over (1 player remaining)
    if (remainingPlayers === 1) {
      const winner = activePlayers.find(p => p.user_id !== eliminatedUserId)

      // Set winner
      await client.query(
        `UPDATE game_participants SET status = 'winner', finish_position = 1 WHERE session_id = $1 AND user_id = $2`,
        [sessionId, winner.user_id]
      )

      // Get all participants for payout/points
      const { rows: allParticipants } = await client.query(
        `SELECT * FROM game_participants WHERE session_id = $1`,
        [sessionId]
      )

      // Get session details
      const { rows: sessionRows } = await client.query(
        `SELECT * FROM game_sessions WHERE id = $1`,
        [sessionId]
      )
      const session = sessionRows[0]

      // Calculate payouts
      const payouts = await calculatePayouts(session.league_id, allParticipants.length, parseFloat(session.prize_pool))

      // Apply payouts
      for (const [position, amount] of Object.entries(payouts)) {
        const participant = allParticipants.find(p => p.finish_position === parseInt(position))
        if (participant) {
          await client.query(
            `UPDATE game_participants SET winnings = $1 WHERE id = $2`,
            [amount, participant.id]
          )
        }
      }

      // Calculate points
      const { rows: finalParticipants } = await client.query(
        `SELECT * FROM game_participants WHERE session_id = $1`,
        [sessionId]
      )
      const points = await calculatePoints(session.league_id, finalParticipants)

      // Apply points
      for (const [participantId, pts] of Object.entries(points)) {
        await client.query(
          `UPDATE game_participants SET points_earned = $1 WHERE id = $2`,
          [pts, participantId]
        )
      }

      // Update league member stats
      for (const p of finalParticipants) {
        await client.query(
          `UPDATE league_members SET
             games_played = games_played + 1,
             total_wins = total_wins + CASE WHEN $1 = 1 THEN 1 ELSE 0 END,
             total_points = total_points + $2,
             total_winnings = total_winnings + $3,
             total_bounties = total_bounties + $4
           WHERE league_id = $5 AND user_id = $6`,
          [p.finish_position, points[p.id] || 0, parseFloat(p.winnings || 0), p.bounty_count || 0, session.league_id, p.user_id]
        )
      }

      // End game
      await client.query(
        `UPDATE game_sessions SET status = 'completed', is_running = false, ended_at = NOW() WHERE id = $1`,
        [sessionId]
      )

      destroyTimer(sessionId)

      return { gameOver: true, winner: winner.user_id, finishPosition, payouts, points }
    }

    return { gameOver: false, finishPosition, remainingPlayers }
  })

  broadcast(sessionId, {
    type: result.gameOver ? 'GAME_ENDED' : 'PLAYER_ELIMINATED',
    ...result,
    eliminatedUserId,
    eliminatorUserId
  })

  // Send notifications when game ends
  if (result.gameOver) {
    try {
      const { rows: participants } = await query(
        `SELECT gp.user_id, gp.finish_position, gp.winnings, gp.points_earned,
                gs.league_id, e.title as event_title
         FROM game_participants gp
         JOIN game_sessions gs ON gs.id = gp.session_id
         JOIN events e ON e.id = gs.event_id
         WHERE gp.session_id = $1`,
        [sessionId]
      )
      for (const p of participants) {
        const winnings = parseFloat(p.winnings || 0)
        const body = p.finish_position === 1
          ? `You won! Earned ${p.points_earned || 0} pts${winnings > 0 ? ` and $${winnings.toFixed(0)}` : ''}`
          : `Finished #${p.finish_position}. Earned ${p.points_earned || 0} pts${winnings > 0 ? ` and $${winnings.toFixed(0)}` : ''}`
        await query(
          `INSERT INTO notifications (user_id, league_id, type, title, body, data)
           VALUES ($1, $2, 'game_result', $3, $4, $5)`,
          [p.user_id, p.league_id, `Game Complete: ${p.event_title}`, body,
           JSON.stringify({ finish_position: p.finish_position, points: p.points_earned, winnings })]
        )
      }
    } catch (e) {
      console.error('Failed to create game notifications:', e.message)
    }
  }

  return c.json({ success: true, data: result })
})

// Process rebuy
games.post('/:sessionId/rebuy', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('sessionId')
  await requireGamePermission(user.id, sessionId, 'rebuy_player')

  const { userId: rebuyUserId } = await c.req.json()
  if (!rebuyUserId) throw new ValidationError('userId is required')

  const { rows: sessions } = await query(
    `SELECT gs.*, e.max_rebuys, e.rebuy_amount, e.rebuy_cutoff_level FROM game_sessions gs
     JOIN events e ON e.id = gs.event_id WHERE gs.id = $1`,
    [sessionId]
  )
  if (sessions.length === 0) throw new NotFoundError('Game session')
  const session = sessions[0]

  // Enforce rebuy cutoff level
  if (session.rebuy_cutoff_level > 0) {
    const timerState = getTimerState(sessionId)
    if (timerState && timerState.currentLevel > session.rebuy_cutoff_level) {
      throw new ValidationError(`Rebuys are closed after level ${session.rebuy_cutoff_level}`)
    }
  }

  const { rows: participants } = await query(
    `SELECT * FROM game_participants WHERE session_id = $1 AND user_id = $2`,
    [sessionId, rebuyUserId]
  )
  if (participants.length === 0) throw new NotFoundError('Participant')

  const participant = participants[0]
  if (participant.status !== 'eliminated') {
    throw new ValidationError('Player must be eliminated to rebuy')
  }
  if (participant.rebuy_count >= (session.max_rebuys || 0)) {
    throw new ValidationError('Maximum rebuys reached')
  }

  const rebuyAmount = parseFloat(session.rebuy_amount || 0)

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE game_participants SET status = 'playing', rebuy_count = rebuy_count + 1, finish_position = NULL, eliminated_by = NULL, eliminated_at = NULL WHERE session_id = $1 AND user_id = $2`,
      [sessionId, rebuyUserId]
    )
    await client.query(
      `UPDATE game_sessions SET total_rebuys = total_rebuys + 1, prize_pool = prize_pool + $1 WHERE id = $2`,
      [rebuyAmount, sessionId]
    )
    await client.query(
      `INSERT INTO game_events (session_id, event_type, event_data, actor_id)
       VALUES ($1, 'rebuy', $2, $3)`,
      [sessionId, JSON.stringify({ userId: rebuyUserId, rebuyCount: participant.rebuy_count + 1 }), user.id]
    )
  })

  broadcast(sessionId, {
    type: 'REBUY',
    userId: rebuyUserId,
    newPrizePool: parseFloat(sessions[0].prize_pool) + rebuyAmount
  })

  return c.json({ success: true, data: { rebuyCount: participant.rebuy_count + 1 } })
})

// End game manually
games.post('/:sessionId/end', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('sessionId')
  await requireGamePermission(user.id, sessionId, 'end_game')

  await query(
    `UPDATE game_sessions SET status = 'completed', is_running = false, ended_at = NOW() WHERE id = $1`,
    [sessionId]
  )

  destroyTimer(sessionId)
  broadcast(sessionId, { type: 'GAME_ENDED', manual: true })

  return c.json({ success: true })
})

export default games
