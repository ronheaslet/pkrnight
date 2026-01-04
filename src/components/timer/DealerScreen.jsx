import { useState, useEffect, useRef } from 'react'
import { useLeague } from '../../contexts/LeagueContext'
import { supabase } from '../../lib/supabase'
import { FALLBACK_BLINDS, DEFAULT_TIMER_SECONDS } from '../../utils/constants'
import { formatTime } from '../../utils/helpers'

export default function DealerScreen({ canPauseTimer = true }) {
  const { currentLeague } = useLeague()
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [gameSession, setGameSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [blindStructure, setBlindStructure] = useState(FALLBACK_BLINDS)

  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_TIMER_SECONDS)
  const [isRunning, setIsRunning] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(1)
  const timerRef = useRef(null)
  const channelRef = useRef(null)

  // Fetch events and blind structure on mount
  useEffect(() => {
    if (currentLeague) {
      fetchBlindStructure()
      fetchEvents()
    }
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      clearInterval(timerRef.current)
    }
  }, [currentLeague])

  // Subscribe to selected game session updates
  useEffect(() => {
    if (selectedEvent && gameSession) {
      subscribeToGame(gameSession.id)
    }
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [selectedEvent, gameSession?.id])

  // Fetch blind structure from database
  const fetchBlindStructure = async () => {
    try {
      const { data: structure } = await supabase
        .from('blind_structures')
        .select('id')
        .eq('league_id', currentLeague.id)
        .eq('is_default', true)
        .single()

      if (!structure?.id) return

      const { data: levels } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('structure_id', structure.id)
        .order('level_number', { ascending: true })

      if (levels && levels.length > 0) {
        setBlindStructure(levels.map(l => ({
          level: l.level_number,
          sb: l.small_blind,
          bb: l.big_blind,
          ante: l.ante || 0,
          duration: l.duration_minutes
        })))
      }
    } catch {
      // Error fetching blind structure - using fallback
    }
  }

  // Fetch all events with game sessions
  const fetchEvents = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    // Fetch events from past 30 days to 30 days in future (to catch recent/upcoming games)
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 30)
    const pastDateStr = pastDate.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        event_date,
        game_sessions (
          id, current_level, time_remaining_seconds, is_running, started_at, ended_at
        )
      `)
      .eq('league_id', currentLeague.id)
      .gte('event_date', pastDateStr)
      .order('event_date', { ascending: false })
      .limit(20)

    if (!error && data) {
      // Filter to only events that have active (not ended) game sessions, or today's/future events
      const relevantEvents = data.filter(e => {
        const hasActiveSession = e.game_sessions?.some(s => s.started_at && !s.ended_at)
        const isTodayOrFuture = e.event_date >= today
        return hasActiveSession || isTodayOrFuture
      })

      // Sort: active games first, then by date (today first, then future, then past)
      relevantEvents.sort((a, b) => {
        const aHasActive = a.game_sessions?.some(s => s.started_at && !s.ended_at)
        const bHasActive = b.game_sessions?.some(s => s.started_at && !s.ended_at)

        // Active games first
        if (aHasActive && !bHasActive) return -1
        if (bHasActive && !aHasActive) return 1

        // Then by date (closest to today first)
        const aDate = new Date(a.event_date)
        const bDate = new Date(b.event_date)
        const todayDate = new Date(today)
        const aDiff = Math.abs(aDate - todayDate)
        const bDiff = Math.abs(bDate - todayDate)
        return aDiff - bDiff
      })

      setEvents(relevantEvents)

      // Auto-select: first active game, or today's event, or first in list
      const activeEvent = relevantEvents.find(e =>
        e.game_sessions?.some(s => s.started_at && !s.ended_at)
      )
      const todayEvent = relevantEvents.find(e => e.event_date === today)
      const defaultEvent = activeEvent || todayEvent || relevantEvents[0] || null

      if (defaultEvent) {
        setSelectedEvent(defaultEvent)
        loadGameSession(defaultEvent)
      } else {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }

  // Load game session for selected event
  const loadGameSession = async (event) => {
    if (!event) {
      setGameSession(null)
      setLoading(false)
      return
    }

    const activeSession = event.game_sessions?.find(s => s.started_at && !s.ended_at)

    if (activeSession) {
      setGameSession(activeSession)
      setCurrentLevel(activeSession.current_level || 1)
      setTimeRemaining(activeSession.time_remaining_seconds || blindStructure[0].duration * 60)
      setIsRunning(activeSession.is_running || false)
    } else {
      setGameSession(null)
      setCurrentLevel(1)
      setTimeRemaining(blindStructure[0].duration * 60)
      setIsRunning(false)
    }
    setLoading(false)
  }

  // Handle event selection change
  const handleEventChange = (eventId) => {
    const event = events.find(e => e.id === eventId)
    if (event) {
      setSelectedEvent(event)
      setLoading(true)
      loadGameSession(event)
    }
  }

  // Subscribe to game session updates
  const subscribeToGame = (sessionId) => {
    // Remove previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    channelRef.current = supabase
      .channel(`dealer-game-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.new) {
            if (payload.new.ended_at) {
              // Game ended - refresh events list
              fetchEvents()
            } else {
              setCurrentLevel(payload.new.current_level || 1)
              setTimeRemaining(payload.new.time_remaining_seconds || DEFAULT_TIMER_SECONDS)
              setIsRunning(payload.new.is_running || false)
            }
          }
        }
      )
      .subscribe()
  }

  // Timer countdown
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(t => {
          if (t <= 1) {
            return 0
          }
          return t - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isRunning])

  // Handle level advance when timer hits zero
  useEffect(() => {
    if (timeRemaining === 0 && isRunning) {
      playSound()
      const nextLevel = Math.min(currentLevel + 1, blindStructure.length)
      setCurrentLevel(nextLevel)
      const nextLevelDuration = blindStructure[nextLevel - 1]?.duration * 60 || DEFAULT_TIMER_SECONDS
      setTimeRemaining(nextLevelDuration)
    }
  }, [timeRemaining, isRunning, currentLevel, blindStructure])

  const toggleTimer = async () => {
    if (!gameSession || !canPauseTimer) return

    const newIsRunning = !isRunning
    setIsRunning(newIsRunning)

    await supabase
      .from('game_sessions')
      .update({ is_running: newIsRunning })
      .eq('id', gameSession.id)
  }

  const playSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3
      oscillator.start()
      setTimeout(() => {
        oscillator.frequency.value = 1000
        setTimeout(() => oscillator.stop(), 300)
      }, 300)
    } catch {
      // Audio not available
    }
  }

  const formatEventDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00')
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    if (dateStr === todayStr) return 'Today'

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const currentBlinds = blindStructure[currentLevel - 1] || blindStructure[0]
  const nextBlinds = blindStructure[currentLevel] || null

  if (loading) {
    return (
      <div className="min-h-screen bg-felt-dark flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </div>
    )
  }

  // No events at all
  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-felt-dark flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🃏</div>
          <div className="text-xl text-white/60">No Games Scheduled</div>
          <div className="text-white/40 mt-2">Schedule a game in the Calendar tab</div>
        </div>
      </div>
    )
  }

  // No active game session for selected event
  if (!gameSession) {
    return (
      <div className="min-h-screen bg-felt-dark flex flex-col">
        {/* Header with game selector */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🃏</span>
            <span className="text-gold font-display">Dealer View</span>
          </div>
          {events.length > 1 && (
            <select
              value={selectedEvent?.id || ''}
              onChange={(e) => handleEventChange(e.target.value)}
              className="input w-full text-sm"
            >
              {events.map(ev => {
                const hasActiveGame = ev.game_sessions?.some(s => s.started_at && !s.ended_at)
                return (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} - {formatEventDate(ev.event_date)}
                    {hasActiveGame ? ' 🔴 LIVE' : ''}
                  </option>
                )
              })}
            </select>
          )}
        </div>

        {/* Waiting message */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <div className="text-xl text-white/60 mb-2">
              {selectedEvent?.title || 'No Game Selected'}
            </div>
            <div className="text-white/40">
              {selectedEvent
                ? 'Waiting for game to start...'
                : 'Select a game from the dropdown above'}
            </div>
            {selectedEvent && (
              <div className="text-white/30 text-sm mt-4">
                {formatEventDate(selectedEvent.event_date)}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-felt-dark flex flex-col">
      {/* Header with game selector */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl">🃏</span>
          {events.length > 1 ? (
            <select
              value={selectedEvent?.id || ''}
              onChange={(e) => handleEventChange(e.target.value)}
              className="bg-transparent text-gold font-display text-sm border-none outline-none cursor-pointer flex-1 min-w-0 truncate"
            >
              {events.map(ev => {
                const hasActiveGame = ev.game_sessions?.some(s => s.started_at && !s.ended_at)
                return (
                  <option key={ev.id} value={ev.id} className="bg-felt-dark text-white">
                    {ev.title} - {formatEventDate(ev.event_date)}
                    {hasActiveGame ? ' 🔴' : ''}
                  </option>
                )
              })}
            </select>
          ) : (
            <span className="text-gold font-display truncate">
              {selectedEvent?.title || 'Dealer View'}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ml-2 ${isRunning ? 'bg-green-600' : 'bg-yellow-600'}`}>
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-white animate-pulse' : 'bg-white'}`}></div>
          {isRunning ? 'LIVE' : 'PAUSED'}
        </div>
      </div>

      {/* Main timer display - large and centered */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Level indicator */}
        <div className="text-white/60 text-lg mb-2">Level {currentLevel}</div>

        {/* Giant timer */}
        <div
          className={`font-display tracking-wider mb-4 ${
            timeRemaining <= 60 ? 'text-red-500 animate-pulse' : 'text-white'
          }`}
          style={{ fontSize: 'min(30vw, 180px)' }}
        >
          {formatTime(timeRemaining)}
        </div>

        {/* Blinds - large */}
        <div className="text-center mb-8">
          <div className="font-display text-gold" style={{ fontSize: 'min(15vw, 80px)' }}>
            {currentBlinds.sb.toLocaleString()}/{currentBlinds.bb.toLocaleString()}
          </div>
          {currentBlinds.ante > 0 && (
            <div className="text-white/60 text-2xl mt-2">
              Ante: {currentBlinds.ante.toLocaleString()}
            </div>
          )}
        </div>

        {/* Next level preview */}
        {nextBlinds && (
          <div className="text-white/40 text-lg">
            Next: {nextBlinds.sb.toLocaleString()}/{nextBlinds.bb.toLocaleString()}
            {nextBlinds.ante > 0 && ` (${nextBlinds.ante})`}
          </div>
        )}

        {/* Pause/Play button for dealers */}
        {canPauseTimer && (
          <button
            onClick={toggleTimer}
            className={`mt-8 px-12 py-4 rounded-2xl text-2xl font-bold transition-all ${
              isRunning
                ? 'bg-yellow-600 hover:bg-yellow-500'
                : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            {isRunning ? '⏸ PAUSE' : '▶ START'}
          </button>
        )}
      </div>

      {/* Footer with quick info */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex justify-around text-center">
          <div>
            <div className="text-white/40 text-xs">Small Blind</div>
            <div className="text-gold font-display text-xl">{currentBlinds.sb}</div>
          </div>
          <div>
            <div className="text-white/40 text-xs">Big Blind</div>
            <div className="text-gold font-display text-xl">{currentBlinds.bb}</div>
          </div>
          <div>
            <div className="text-white/40 text-xs">Ante</div>
            <div className="text-gold font-display text-xl">{currentBlinds.ante || '-'}</div>
          </div>
          <div>
            <div className="text-white/40 text-xs">Level</div>
            <div className="text-gold font-display text-xl">{currentLevel}/{blindStructure.length}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
