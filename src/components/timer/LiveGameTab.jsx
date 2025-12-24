import { useState, useEffect, useRef } from 'react'
import { useLeague } from '../../contexts/LeagueContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

// Default blind structure
const DEFAULT_BLINDS = [
  { level: 1, sb: 25, bb: 50, ante: 0, duration: 15 },
  { level: 2, sb: 50, bb: 100, ante: 0, duration: 15 },
  { level: 3, sb: 75, bb: 150, ante: 0, duration: 15 },
  { level: 4, sb: 100, bb: 200, ante: 25, duration: 15 },
  { level: 5, sb: 150, bb: 300, ante: 25, duration: 15 },
  { level: 6, sb: 200, bb: 400, ante: 50, duration: 15 },
  { level: 7, sb: 300, bb: 600, ante: 75, duration: 15 },
  { level: 8, sb: 400, bb: 800, ante: 100, duration: 15 },
  { level: 9, sb: 500, bb: 1000, ante: 100, duration: 15 },
  { level: 10, sb: 600, bb: 1200, ante: 200, duration: 15 },
  { level: 11, sb: 800, bb: 1600, ante: 200, duration: 12 },
  { level: 12, sb: 1000, bb: 2000, ante: 300, duration: 12 },
  { level: 13, sb: 1500, bb: 3000, ante: 400, duration: 12 },
  { level: 14, sb: 2000, bb: 4000, ante: 500, duration: 12 },
  { level: 15, sb: 3000, bb: 6000, ante: 1000, duration: 10 },
]

export default function LiveGameTab() {
  const { currentLeague, isAdmin } = useLeague()
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [gameSession, setGameSession] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [showStartModal, setShowStartModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showRebuyModal, setShowRebuyModal] = useState(false)
  const [showEliminateModal, setShowEliminateModal] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(15 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(1)
  const timerRef = useRef(null)
  
  // Game settings
  const [rebuysCutoffLevel, setRebuysCutoffLevel] = useState(6)
  const [rebuysCutoffType, setRebuysCutoffType] = useState('level') // 'level' or 'halftime'
  const [buyInAmount, setBuyInAmount] = useState(20)
  const [rebuyAmount, setRebuyAmount] = useState(20)
  const [bountyAmount, setBountyAmount] = useState(5)
  const [totalRebuys, setTotalRebuys] = useState(0)

  // Fetch today's/upcoming events
  useEffect(() => {
    if (currentLeague) {
      fetchEvents()
      // Set defaults from league settings
      setBuyInAmount(currentLeague.default_buy_in || 20)
      setRebuyAmount(currentLeague.default_rebuy_cost || 20)
      setBountyAmount(currentLeague.bounty_amount || 5)
    }
  }, [currentLeague])

  const fetchEvents = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        game_sessions (
          id,
          current_level,
          time_remaining_seconds,
          is_running,
          started_at,
          ended_at
        )
      `)
      .eq('league_id', currentLeague.id)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(5)

    if (!error && data) {
      setEvents(data)
      const activeEvent = data.find(e => e.game_sessions?.length > 0 && !e.game_sessions[0].ended_at)
      const todayEvent = data.find(e => e.event_date === today)
      setSelectedEvent(activeEvent || todayEvent || data[0] || null)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (selectedEvent) {
      fetchGameSession()
      if (selectedEvent.buy_in) setBuyInAmount(selectedEvent.buy_in)
    }
  }, [selectedEvent])

  const fetchGameSession = async () => {
    const { data: session } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('event_id', selectedEvent.id)
      .single()

    if (session) {
      setGameSession(session)
      setCurrentLevel(session.current_level || 1)
      setTimeRemaining(session.time_remaining_seconds || DEFAULT_BLINDS[0].duration * 60)
      setIsRunning(session.is_running || false)
      
      const { data: parts } = await supabase
        .from('game_participants')
        .select(`
          *,
          users (id, full_name, display_name),
          eliminated_by_user:users!game_participants_eliminated_by_fkey (full_name, display_name)
        `)
        .eq('session_id', session.id)
        .order('finish_position', { ascending: true, nullsFirst: true })

      if (parts) {
        setParticipants(parts)
        setTotalRebuys(parts.reduce((sum, p) => sum + (p.rebuy_count || 0), 0))
      }
    } else {
      setGameSession(null)
      setParticipants([])
      setCurrentLevel(1)
      setTimeRemaining(DEFAULT_BLINDS[0].duration * 60)
      setIsRunning(false)
      setTotalRebuys(0)
    }
  }

  // Timer countdown
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(t => {
          if (t <= 1) {
            playSound('levelEnd')
            advanceLevel()
            return DEFAULT_BLINDS[currentLevel]?.duration * 60 || 15 * 60
          }
          // Warning at 1 minute
          if (t === 60) {
            playSound('warning')
          }
          return t - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isRunning, currentLevel])

  // Sync timer to database
  useEffect(() => {
    if (gameSession && isAdmin) {
      const syncInterval = setInterval(() => {
        syncTimerToDatabase()
      }, 10000)
      return () => clearInterval(syncInterval)
    }
  }, [gameSession, isRunning, timeRemaining, currentLevel])

  const syncTimerToDatabase = async () => {
    if (!gameSession) return
    await supabase
      .from('game_sessions')
      .update({
        current_level: currentLevel,
        time_remaining_seconds: timeRemaining,
        is_running: isRunning
      })
      .eq('id', gameSession.id)
  }

  const playSound = (type) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      if (type === 'levelEnd') {
        oscillator.frequency.value = 800
        gainNode.gain.value = 0.4
        oscillator.start()
        setTimeout(() => {
          oscillator.frequency.value = 1000
          setTimeout(() => oscillator.stop(), 300)
        }, 300)
      } else if (type === 'warning') {
        oscillator.frequency.value = 600
        gainNode.gain.value = 0.2
        oscillator.start()
        setTimeout(() => oscillator.stop(), 200)
      } else if (type === 'rebuy') {
        oscillator.frequency.value = 500
        gainNode.gain.value = 0.3
        oscillator.start()
        setTimeout(() => oscillator.stop(), 150)
      }
    } catch (e) {
      console.log('Audio not supported')
    }
  }

  const advanceLevel = () => {
    const newLevel = Math.min(currentLevel + 1, DEFAULT_BLINDS.length)
    setCurrentLevel(newLevel)
    
    // Check if rebuys should be cut off
    if (rebuysCutoffType === 'level' && newLevel === rebuysCutoffLevel) {
      // Announce rebuys closed
      playSound('levelEnd')
    }
  }

  const rebuysAllowed = () => {
    if (rebuysCutoffType === 'halftime') {
      return currentLevel <= Math.floor(DEFAULT_BLINDS.length / 2)
    }
    return currentLevel < rebuysCutoffLevel
  }

  const startGame = async (playerIds, settings) => {
    setRebuysCutoffLevel(settings.rebuysCutoffLevel)
    setRebuysCutoffType(settings.rebuysCutoffType)
    setBuyInAmount(settings.buyIn)
    setRebuyAmount(settings.rebuyAmount)
    setBountyAmount(settings.bountyAmount)

    const { data: session, error } = await supabase
      .from('game_sessions')
      .insert({
        event_id: selectedEvent.id,
        current_level: 1,
        time_remaining_seconds: DEFAULT_BLINDS[0].duration * 60,
        is_running: false,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      return
    }

    const participantInserts = playerIds.map(userId => ({
      session_id: session.id,
      user_id: userId,
      status: 'playing',
      rebuy_count: 0
    }))

    await supabase.from('game_participants').insert(participantInserts)

    setGameSession(session)
    setShowStartModal(false)
    fetchGameSession()
  }

  const toggleTimer = async () => {
    const newIsRunning = !isRunning
    setIsRunning(newIsRunning)
    
    if (gameSession) {
      await supabase
        .from('game_sessions')
        .update({ is_running: newIsRunning })
        .eq('id', gameSession.id)
    }
  }

  const changeLevel = async (delta) => {
    const newLevel = Math.max(1, Math.min(currentLevel + delta, DEFAULT_BLINDS.length))
    setCurrentLevel(newLevel)
    setTimeRemaining(DEFAULT_BLINDS[newLevel - 1].duration * 60)
    
    if (gameSession) {
      await supabase
        .from('game_sessions')
        .update({ 
          current_level: newLevel,
          time_remaining_seconds: DEFAULT_BLINDS[newLevel - 1].duration * 60
        })
        .eq('id', gameSession.id)
    }
  }

  const addMinute = () => setTimeRemaining(t => t + 60)
  const subtractMinute = () => setTimeRemaining(t => Math.max(0, t - 60))

  const handleRebuy = async (participantId) => {
    if (!rebuysAllowed()) return
    
    playSound('rebuy')
    
    const participant = participants.find(p => p.id === participantId)
    const newRebuyCount = (participant?.rebuy_count || 0) + 1
    
    await supabase
      .from('game_participants')
      .update({ rebuy_count: newRebuyCount })
      .eq('id', participantId)
    
    setTotalRebuys(prev => prev + 1)
    fetchGameSession()
    setShowRebuyModal(false)
  }

  const eliminatePlayer = async (participantId, eliminatedById = null) => {
    const activePlayers = participants.filter(p => p.status === 'playing')
    const position = activePlayers.length

    await supabase
      .from('game_participants')
      .update({
        status: 'eliminated',
        finish_position: position,
        eliminated_by: eliminatedById,
        eliminated_at: new Date().toISOString()
      })
      .eq('id', participantId)

    if (activePlayers.length <= 2) {
      const winner = activePlayers.find(p => p.id !== participantId)
      if (winner) {
        await supabase
          .from('game_participants')
          .update({ status: 'winner', finish_position: 1 })
          .eq('id', winner.id)

        await supabase
          .from('game_sessions')
          .update({ is_running: false, ended_at: new Date().toISOString() })
          .eq('id', gameSession.id)
        
        setIsRunning(false)
        playSound('levelEnd')
      }
    }

    fetchGameSession()
    setShowEliminateModal(false)
    setSelectedPlayer(null)
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const currentBlinds = DEFAULT_BLINDS[currentLevel - 1] || DEFAULT_BLINDS[0]
  const nextBlinds = DEFAULT_BLINDS[currentLevel] || null
  const activePlayers = participants.filter(p => p.status === 'playing')
  const eliminatedPlayers = participants.filter(p => p.status === 'eliminated').sort((a, b) => a.finish_position - b.finish_position)
  const winner = participants.find(p => p.status === 'winner')
  
  // Calculate prize pool
  const prizePool = (buyInAmount * participants.length) + (rebuyAmount * totalRebuys)
  const bountyPool = bountyAmount * participants.length

  if (loading) {
    return <div className="px-4 py-8 text-center text-white/50">Loading...</div>
  }

  if (events.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="text-4xl mb-4">⏱️</div>
        <div className="text-white/60 mb-2">No upcoming games</div>
        <div className="text-white/40 text-sm">Schedule a game in the Calendar tab</div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      {/* Event selector */}
      {events.length > 1 && (
        <select
          value={selectedEvent?.id || ''}
          onChange={(e) => setSelectedEvent(events.find(ev => ev.id === e.target.value))}
          className="input mb-4"
        >
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.title} - {new Date(ev.event_date + 'T00:00').toLocaleDateString()}
            </option>
          ))}
        </select>
      )}

      {/* No game session yet */}
      {!gameSession && selectedEvent && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎰</div>
          <h3 className="text-xl font-display text-gold mb-2">{selectedEvent.title}</h3>
          <p className="text-white/60 mb-6">
            {new Date(selectedEvent.event_date + 'T00:00').toLocaleDateString('en-US', { 
              weekday: 'long', month: 'long', day: 'numeric' 
            })}
          </p>
          {isAdmin ? (
            <button
              onClick={() => setShowStartModal(true)}
              className="btn btn-primary py-3 px-8 text-lg"
            >
              🎲 Start Game
            </button>
          ) : (
            <p className="text-white/40">Waiting for game to start...</p>
          )}
        </div>
      )}

      {/* Game in progress */}
      {gameSession && !gameSession.ended_at && (
        <>
          {/* Status bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
              <span className={`text-sm font-medium ${isRunning ? 'text-green-400' : 'text-yellow-400'}`}>
                {isRunning ? 'Live' : 'Paused'}
              </span>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="text-white/50 text-sm"
              >
                ⚙️ Settings
              </button>
            )}
          </div>

          {/* Timer display */}
          <div className={`card text-center mb-4 ${timeRemaining <= 60 ? 'border-2 border-red-500 animate-pulse' : 'card-gold'}`}>
            <div className="text-white/60 text-sm mb-1">Level {currentLevel} of {DEFAULT_BLINDS.length}</div>
            <div className={`font-display text-6xl mb-2 tracking-wider ${timeRemaining <= 60 ? 'text-red-500' : 'text-white'}`}>
              {formatTime(timeRemaining)}
            </div>
            <div className="text-2xl font-display text-gold">
              {currentBlinds.sb.toLocaleString()}/{currentBlinds.bb.toLocaleString()}
              {currentBlinds.ante > 0 && (
                <span className="text-white/60 text-lg"> (ante {currentBlinds.ante})</span>
              )}
            </div>
            
            {nextBlinds && (
              <div className="text-white/40 text-sm mt-2">
                Next: {nextBlinds.sb.toLocaleString()}/{nextBlinds.bb.toLocaleString()}
              </div>
            )}

            {/* Rebuy status */}
            <div className={`mt-3 text-sm ${rebuysAllowed() ? 'text-green-400' : 'text-red-400'}`}>
              {rebuysAllowed() 
                ? `🔄 Rebuys open until Level ${rebuysCutoffLevel}`
                : '🚫 Rebuys closed'
              }
            </div>
            
            {/* Admin controls */}
            {isAdmin && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2 justify-center">
                  <button onClick={() => changeLevel(-1)} className="btn btn-secondary py-2 px-3" disabled={currentLevel <= 1}>
                    ◀ Prev
                  </button>
                  <button onClick={subtractMinute} className="btn btn-secondary py-2 px-3">-1m</button>
                  <button
                    onClick={toggleTimer}
                    className={`btn py-2 px-6 ${isRunning ? 'bg-yellow-600' : 'btn-primary'}`}
                  >
                    {isRunning ? '⏸ Pause' : '▶ Start'}
                  </button>
                  <button onClick={addMinute} className="btn btn-secondary py-2 px-3">+1m</button>
                  <button onClick={() => changeLevel(1)} className="btn btn-secondary py-2 px-3" disabled={currentLevel >= DEFAULT_BLINDS.length}>
                    Next ▶
                  </button>
                </div>
              </div>
            )}

            {!isAdmin && (
              <div className="text-white/40 text-xs mt-4">
                Timer controlled by tournament director
              </div>
            )}
          </div>

          {/* Prize pool & Rebuy button */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="card text-center">
              <div className="text-white/60 text-xs">Prize Pool</div>
              <div className="font-display text-2xl text-gold">${prizePool.toLocaleString()}</div>
              <div className="text-xs text-white/40">
                {participants.length} buy-ins + {totalRebuys} rebuys
              </div>
            </div>
            <div className="card text-center">
              <div className="text-white/60 text-xs">Bounties</div>
              <div className="font-display text-2xl text-chip-red">${bountyPool.toLocaleString()}</div>
              <div className="text-xs text-white/40">
                ${bountyAmount} per player
              </div>
            </div>
          </div>

          {/* Rebuy Alert Button */}
          {isAdmin && rebuysAllowed() && (
            <button
              onClick={() => setShowRebuyModal(true)}
              className="w-full card bg-green-600/20 border border-green-500 text-center py-4 mb-4"
            >
              <div className="text-2xl mb-1">🔄</div>
              <div className="text-green-400 font-semibold">Record Rebuy</div>
              <div className="text-green-400/60 text-xs">${rebuyAmount} • {totalRebuys} total rebuys</div>
            </button>
          )}

          {/* Players */}
          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium">Players</span>
              <span className="text-gold font-display text-lg">
                {activePlayers.length}/{participants.length}
              </span>
            </div>
            
            {/* Active players */}
            <div className="space-y-2 mb-4">
              {activePlayers.map((player) => (
                <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-sm font-semibold">
                    {getInitials(player.users?.display_name || player.users?.full_name)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {player.users?.display_name || player.users?.full_name}
                    </div>
                    <div className="text-xs text-white/50">
                      {player.rebuy_count > 0 && (
                        <span className="text-yellow-400">{player.rebuy_count} rebuy{player.rebuy_count > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                  {isAdmin && activePlayers.length > 1 && (
                    <button
                      onClick={() => {
                        setSelectedPlayer(player)
                        setShowEliminateModal(true)
                      }}
                      className="text-red-400 text-xs px-3 py-1 rounded bg-red-500/20"
                    >
                      Bust
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Eliminated players */}
            {eliminatedPlayers.length > 0 && (
              <>
                <div className="text-xs text-white/40 mb-2">Eliminated</div>
                <div className="space-y-1">
                  {eliminatedPlayers.map((player) => (
                    <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg opacity-50">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-semibold">
                        {getInitials(player.users?.display_name || player.users?.full_name)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">{player.users?.display_name || player.users?.full_name}</div>
                        <div className="text-xs text-red-400">
                          {getOrdinal(player.finish_position)} place
                          {player.eliminated_by_user && (
                            <span className="text-white/40"> • by {player.eliminated_by_user.display_name || player.eliminated_by_user.full_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Game ended */}
      {gameSession?.ended_at && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-2xl font-display text-gold mb-2">Game Complete!</h3>
          {winner && (
            <p className="text-white text-xl mb-4">
              🎉 {winner.users?.display_name || winner.users?.full_name} Wins! 🎉
            </p>
          )}
          <div className="card mt-4 text-left">
            <h4 className="font-medium mb-3 text-center">Final Results</h4>
            <div className="space-y-2">
              {[winner, ...eliminatedPlayers].filter(Boolean).map((player, idx) => (
                <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? 'bg-gold text-black' : 
                    idx === 1 ? 'bg-gray-300 text-black' : 
                    idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/20'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="flex-1">{player.users?.display_name || player.users?.full_name}</span>
                  {player.rebuy_count > 0 && (
                    <span className="text-xs text-yellow-400">{player.rebuy_count}R</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 text-center">
              <div className="text-white/60 text-sm">Total Prize Pool</div>
              <div className="font-display text-2xl text-gold">${prizePool.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Start Game Modal */}
      {showStartModal && (
        <StartGameModal
          eventId={selectedEvent.id}
          leagueId={currentLeague.id}
          defaultBuyIn={buyInAmount}
          defaultRebuy={rebuyAmount}
          defaultBounty={bountyAmount}
          onClose={() => setShowStartModal(false)}
          onStart={startGame}
        />
      )}

      {/* Rebuy Modal */}
      {showRebuyModal && (
        <RebuyModal
          players={activePlayers}
          rebuyAmount={rebuyAmount}
          onClose={() => setShowRebuyModal(false)}
          onRebuy={handleRebuy}
        />
      )}

      {/* Eliminate Modal */}
      {showEliminateModal && selectedPlayer && (
        <EliminateModal
          player={selectedPlayer}
          players={activePlayers}
          bountyAmount={bountyAmount}
          onClose={() => {
            setShowEliminateModal(false)
            setSelectedPlayer(null)
          }}
          onEliminate={eliminatePlayer}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          rebuysCutoffLevel={rebuysCutoffLevel}
          rebuysCutoffType={rebuysCutoffType}
          onSave={(settings) => {
            setRebuysCutoffLevel(settings.rebuysCutoffLevel)
            setRebuysCutoffType(settings.rebuysCutoffType)
            setShowSettingsModal(false)
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  )
}

function StartGameModal({ eventId, leagueId, defaultBuyIn, defaultRebuy, defaultBounty, onClose, onStart }) {
  const [members, setMembers] = useState([])
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [buyIn, setBuyIn] = useState(defaultBuyIn)
  const [rebuyAmount, setRebuyAmount] = useState(defaultRebuy)
  const [bountyAmount, setBountyAmount] = useState(defaultBounty)
  const [rebuysCutoffLevel, setRebuysCutoffLevel] = useState(6)
  const [rebuysCutoffType, setRebuysCutoffType] = useState('level')

  useEffect(() => {
    const fetchMembers = async () => {
      const { data: rsvps } = await supabase
        .from('event_rsvps')
        .select(`user_id, users (id, full_name, display_name)`)
        .eq('event_id', eventId)
        .eq('status', 'going')

      const { data: leagueMembers } = await supabase
        .from('league_members')
        .select(`user_id, users (id, full_name, display_name)`)
        .eq('league_id', leagueId)
        .eq('status', 'active')

      const goingUsers = rsvps?.map(r => r.users) || []
      const allUsers = leagueMembers?.map(m => m.users) || []
      
      const allUserIds = new Set()
      const combinedUsers = []
      
      goingUsers.forEach(u => {
        if (u && !allUserIds.has(u.id)) {
          allUserIds.add(u.id)
          combinedUsers.push({ ...u, rsvp: 'going' })
        }
      })
      
      allUsers.forEach(u => {
        if (u && !allUserIds.has(u.id)) {
          allUserIds.add(u.id)
          combinedUsers.push({ ...u, rsvp: 'other' })
        }
      })

      setMembers(combinedUsers)
      setSelectedPlayers(goingUsers.filter(u => u).map(u => u.id))
      setLoading(false)
    }
    fetchMembers()
  }, [eventId, leagueId])

  const togglePlayer = (userId) => {
    setSelectedPlayers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const handleStart = () => {
    if (selectedPlayers.length >= 2) {
      onStart(selectedPlayers, {
        buyIn,
        rebuyAmount,
        bountyAmount,
        rebuysCutoffLevel,
        rebuysCutoffType
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-felt-dark rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-xl text-gold">Start Game</h2>
          <button onClick={onClose} className="text-white/60 text-2xl">&times;</button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Game settings */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Buy-in</label>
              <input
                type="number"
                value={buyIn}
                onChange={(e) => setBuyIn(Number(e.target.value))}
                className="input text-center"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Rebuy</label>
              <input
                type="number"
                value={rebuyAmount}
                onChange={(e) => setRebuyAmount(Number(e.target.value))}
                className="input text-center"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Bounty</label>
              <input
                type="number"
                value={bountyAmount}
                onChange={(e) => setBountyAmount(Number(e.target.value))}
                className="input text-center"
              />
            </div>
          </div>

          {/* Rebuy cutoff */}
          <div className="bg-white/5 rounded-lg p-3">
            <label className="block text-sm text-white/60 mb-2">Rebuys Close At</label>
            <div className="flex gap-2">
              <select
                value={rebuysCutoffType}
                onChange={(e) => setRebuysCutoffType(e.target.value)}
                className="input flex-1"
              >
                <option value="level">Specific Level</option>
                <option value="halftime">Halftime</option>
              </select>
              {rebuysCutoffType === 'level' && (
                <select
                  value={rebuysCutoffLevel}
                  onChange={(e) => setRebuysCutoffLevel(Number(e.target.value))}
                  className="input w-24"
                >
                  {[...Array(15)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>Level {i + 1}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Player selection */}
          <div>
            <p className="text-white/60 text-sm mb-2">Select players ({selectedPlayers.length} selected):</p>
            {loading ? (
              <div className="text-center py-4 text-white/50">Loading...</div>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {members.map(member => (
                  <button
                    key={member.id}
                    onClick={() => togglePlayer(member.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedPlayers.includes(member.id)
                        ? 'bg-green-600/30 border border-green-500'
                        : 'bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      selectedPlayers.includes(member.id) ? 'bg-green-600' : 'bg-white/20'
                    }`}>
                      {getInitials(member.display_name || member.full_name)}
                    </div>
                    <span className="flex-1 text-left">{member.display_name || member.full_name}</span>
                    {member.rsvp === 'going' && <span className="text-xs text-green-400">RSVP'd</span>}
                    {selectedPlayers.includes(member.id) && <span className="text-green-400">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleStart}
            disabled={selectedPlayers.length < 2}
            className="w-full btn btn-primary py-3 disabled:opacity-50"
          >
            Start Game with {selectedPlayers.length} Players
          </button>
        </div>
      </div>
    </div>
  )
}

function RebuyModal({ players, rebuyAmount, onClose, onRebuy }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-felt-dark rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-xl text-gold">🔄 Record Rebuy</h2>
          <button onClick={onClose} className="text-white/60 text-2xl">&times;</button>
        </div>
        <div className="p-4">
          <p className="text-white/60 text-sm mb-4">Who is rebuying? (${rebuyAmount})</p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {players.map(player => (
              <button
                key={player.id}
                onClick={() => onRebuy(player.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-green-600/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-sm font-semibold">
                  {getInitials(player.users?.display_name || player.users?.full_name)}
                </div>
                <span className="flex-1 text-left">{player.users?.display_name || player.users?.full_name}</span>
                {player.rebuy_count > 0 && (
                  <span className="text-yellow-400 text-sm">{player.rebuy_count}R</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function EliminateModal({ player, players, bountyAmount, onClose, onEliminate }) {
  const [eliminatedBy, setEliminatedBy] = useState(null)
  const otherPlayers = players.filter(p => p.id !== player.id)

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-felt-dark rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b border-white/10">
          <h2 className="font-display text-xl text-red-400">💀 Eliminate Player</h2>
        </div>
        <div className="p-4">
          <div className="text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-600/30 flex items-center justify-center text-2xl font-semibold mx-auto mb-2">
              {getInitials(player.users?.display_name || player.users?.full_name)}
            </div>
            <div className="text-white font-medium">{player.users?.display_name || player.users?.full_name}</div>
          </div>

          {bountyAmount > 0 && (
            <div className="mb-4">
              <p className="text-white/60 text-sm mb-2">Who gets the ${bountyAmount} bounty?</p>
              <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                {otherPlayers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setEliminatedBy(p.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      eliminatedBy === p.id ? 'bg-gold/30 border border-gold' : 'bg-white/5'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-xs font-semibold">
                      {getInitials(p.users?.display_name || p.users?.full_name)}
                    </div>
                    <span className="text-sm">{p.users?.display_name || p.users?.full_name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 text-white">
              Cancel
            </button>
            <button
              onClick={() => onEliminate(player.id, eliminatedBy)}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold"
            >
              Confirm Bust
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsModal({ rebuysCutoffLevel, rebuysCutoffType, onSave, onClose }) {
  const [cutoffLevel, setCutoffLevel] = useState(rebuysCutoffLevel)
  const [cutoffType, setCutoffType] = useState(rebuysCutoffType)

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-felt-dark rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-xl text-gold">⚙️ Game Settings</h2>
          <button onClick={onClose} className="text-white/60 text-2xl">&times;</button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">Rebuys Close At</label>
            <div className="flex gap-2">
              <select
                value={cutoffType}
                onChange={(e) => setCutoffType(e.target.value)}
                className="input flex-1"
              >
                <option value="level">Specific Level</option>
                <option value="halftime">Halftime</option>
              </select>
              {cutoffType === 'level' && (
                <select
                  value={cutoffLevel}
                  onChange={(e) => setCutoffLevel(Number(e.target.value))}
                  className="input w-24"
                >
                  {[...Array(15)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>Level {i + 1}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <button
            onClick={() => onSave({ rebuysCutoffLevel: cutoffLevel, rebuysCutoffType: cutoffType })}
            className="w-full btn btn-primary py-3"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
