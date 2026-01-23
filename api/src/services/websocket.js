import { verifyToken } from '../middleware/auth.js'

// sessionId -> Set<WebSocket> (game sessions)
const connections = new Map()

// leagueId -> Set<WebSocket> (league chat/notifications)
const leagueConnections = new Map()

export function handleConnection(ws, req) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const token = url.searchParams.get('token')
  const sessionId = url.searchParams.get('session')
  const leagueId = url.searchParams.get('league')

  if (!token || (!sessionId && !leagueId)) {
    ws.close(4001, 'Missing token or session/league')
    return
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    ws.close(4001, 'Invalid token')
    return
  }

  ws.userId = decoded.sub

  if (leagueId) {
    // League-level connection (chat)
    if (!leagueConnections.has(leagueId)) {
      leagueConnections.set(leagueId, new Set())
    }
    leagueConnections.get(leagueId).add(ws)
    ws.leagueId = leagueId

    ws.send(JSON.stringify({ type: 'CONNECTED', leagueId }))

    ws.on('close', () => {
      const conns = leagueConnections.get(leagueId)
      if (conns) {
        conns.delete(ws)
        if (conns.size === 0) {
          leagueConnections.delete(leagueId)
        }
      }
    })
  } else {
    // Game session connection
    if (!connections.has(sessionId)) {
      connections.set(sessionId, new Set())
    }
    connections.get(sessionId).add(ws)
    ws.sessionId = sessionId

    ws.send(JSON.stringify({ type: 'CONNECTED', sessionId }))

    ws.on('close', () => {
      const conns = connections.get(sessionId)
      if (conns) {
        conns.delete(ws)
        if (conns.size === 0) {
          connections.delete(sessionId)
        }
      }
    })
  }

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message)
  })
}

export function broadcast(sessionId, message) {
  const conns = connections.get(sessionId)
  if (!conns) return

  const data = JSON.stringify(message)
  for (const ws of conns) {
    if (ws.readyState === 1) { // OPEN
      ws.send(data)
    }
  }
}

export function sendToSession(sessionId, message) {
  broadcast(sessionId, message)
}

export function getConnectionCount(sessionId) {
  const conns = connections.get(sessionId)
  return conns ? conns.size : 0
}

export function broadcastToLeague(leagueId, message) {
  const conns = leagueConnections.get(leagueId)
  if (!conns) return

  const data = JSON.stringify(message)
  for (const ws of conns) {
    if (ws.readyState === 1) {
      ws.send(data)
    }
  }
}
