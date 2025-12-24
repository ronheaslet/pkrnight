import { useState, useEffect, useRef } from 'react'
import { useLeague } from '../../contexts/LeagueContext'
import { supabase } from '../../lib/supabase'

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

export default function DealerScreen({ canPauseTimer = true }) {
  const { currentLeague } = useLeague()
  const [gameSession, setGameSession] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [timeRemaining, setTimeRemaining] = useState(15 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(1)
  const timerRef = useRef(null)

  useEffect(() => {
    if (currentLeague) {
      fetchActiveGame()
      subscribeToGame()
    }
    return () => {
      supabase.removeAllChannels()
      clearInterval(timerRef.current)
    }
  }, [currentLeague])

  const fetchActiveGame = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    const { data: events } = await supabase
      .from('events')
      .select(`
        id,
        game_sessions (
          id, current_level, time_remaining_seconds, is_running, ended_at
        )
      `)
      .eq('league_id', currentLeague.id)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(1)

    const event = events?.[0]
    const session = event?.game_sessions?.[0]
    
    if (session && !session.ended_at) {
      setGameSession(session)
      setCurrentLevel(session.current_level || 1)
      setTimeRemaining(session.time_remaining_seconds || DEFAULT_BLINDS[0].duration * 60)
      setIsRunning(session.is_running || false)
    }
    setLoading(false)
  }

  const subscribeToGame = () => {
    const channel = supabase
      .channel('dealer-game-sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions' },
        (payload) => {
          if (payload.new && !payload.new.ended_at) {
            setCurrentLevel(payload.new.current_level || 1)
            setTimeRemaining(payload.new.time_remaining_seconds || 15 * 60)
            setIsRunning(payload.new.is_running || false)
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
            playSound()
            return DEFAULT_BLINDS[currentLevel]?.duration * 60 || 15 * 60
          }
          return t - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isRunning, currentLevel])

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
    } catch (e) {}
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const currentBlinds = DEFAULT_BLINDS[currentLevel - 1] || DEFAULT_BLINDS[0]
  const nextBlinds = DEFAULT_BLINDS[currentLevel] || null

  if (loading) {
    return (
      <div className="min-h-screen bg-felt-dark flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </div>
    )
  }

  if (!gameSession) {
    return (
      <div className="min-h-screen bg-felt-dark flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🃏</div>
          <div className="text-xl text-white/60">No Active Game</div>
          <div className="text-white/40 mt-2">Waiting for a game to start...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-felt-dark flex flex-col">
      {/* Minimal header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🃏</span>
          <span className="text-gold font-display">Dealer View</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${isRunning ? 'bg-green-600' : 'bg-yellow-600'}`}>
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
            <div className="text-gold font-display text-xl">{currentLevel}/15</div>
          </div>
        </div>
      </div>
    </div>
  )
}
