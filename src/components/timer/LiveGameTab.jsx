import { useState, useEffect, useRef } from 'react'
import { useLeague } from '../../contexts/LeagueContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { FALLBACK_BLINDS } from '../../utils/constants'

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
  const [showTVMode, setShowTVMode] = useState(false)
  const [showSoundSettings, setShowSoundSettings] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [rebuyRequests, setRebuyRequests] = useState([])
  
  // Blind structure state - loaded from DB
  const [blindStructure, setBlindStructure] = useState(FALLBACK_BLINDS)
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(15 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(1)
  const [warningPlayed, setWarningPlayed] = useState(false)
  const timerRef = useRef(null)
  const audioContextRef = useRef(null)
  
  // Game settings
  const [rebuysCutoffLevel, setRebuysCutoffLevel] = useState(6)
  const [rebuysCutoffType, setRebuysCutoffType] = useState('level') // 'level' or 'halftime'
  const [buyInAmount, setBuyInAmount] = useState(20)
  const [rebuyAmount, setRebuyAmount] = useState(20)
  const [bountyAmount, setBountyAmount] = useState(5)
  const [startingChips, setStartingChips] = useState(10000)
  const [totalRebuys, setTotalRebuys] = useState(0)
  
  // Sound settings
  const [soundSettings, setSoundSettings] = useState({
    levelChange: true,
    warningTime: 60,
    warningEnabled: true,
    rebuyAlert: true,
    rebuyClosing: true,
    volume: 80,
    voiceStyle: 'southern'
  })

  // Fetch today's/upcoming events and blind structure
  useEffect(() => {
    if (currentLeague) {
      fetchEvents()
      fetchBlindStructure()
      setBuyInAmount(currentLeague.default_buy_in || 20)
      setRebuyAmount(currentLeague.default_rebuy_cost || 20)
      setBountyAmount(currentLeague.bounty_amount || 5)
    }
  }, [currentLeague])

  // Fetch blind structure from database
  const fetchBlindStructure = async (structureId = null) => {
    try {
      // If no specific structureId, get the league's default
      let targetStructureId = structureId
      
      if (!targetStructureId) {
        const { data: structure } = await supabase
          .from('blind_structures')
          .select('id')
          .eq('league_id', currentLeague.id)
          .eq('is_default', true)
          .single()
        
        targetStructureId = structure?.id
      }
      
      if (!targetStructureId) {
        console.log('No blind structure found, using fallback')
        return FALLBACK_BLINDS
      }
      
      const { data: levels, error } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('structure_id', targetStructureId)
        .order('level_number', { ascending: true })
      
      if (error || !levels || levels.length === 0) {
        console.log('No blind levels found, using fallback')
        return FALLBACK_BLINDS
      }
      
      // Transform DB format to component format
      const blinds = levels.map(l => ({
        level: l.level_number,
        sb: l.small_blind,
        bb: l.big_blind,
        ante: l.ante || 0,
        duration: l.duration_minutes
      }))
      
      setBlindStructure(blinds)
      return blinds
    } catch (err) {
      console.error('Error fetching blind structure:', err)
      return FALLBACK_BLINDS
    }
  }

  const fetchEvents = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('events')
      .select(`*, game_sessions (id, current_level, time_remaining_seconds, is_running, started_at, ended_at)`)
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
      setTimeRemaining(session.time_remaining_seconds || blindStructure[0].duration * 60)
      setIsRunning(session.is_running || false)
      
      const { data: parts } = await supabase
        .from('game_participants')
        .select(`*, users (id, full_name, display_name), eliminated_by_user:users!game_participants_eliminated_by_fkey (full_name, display_name)`)
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
      setTimeRemaining(blindStructure[0].duration * 60)
      setIsRunning(false)
      setTotalRebuys(0)
    }
  }

  // Timer countdown
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(t => {
          // Warning sound
          if (t === soundSettings.warningTime && soundSettings.warningEnabled && !warningPlayed) {
            playSound('warning')
            setWarningPlayed(true)
          }
          
          if (t <= 1) {
            playSound('levelEnd')
            setWarningPlayed(false)
            advanceLevel()
            return blindStructure[currentLevel]?.duration * 60 || 15 * 60
          }
          return t - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isRunning, currentLevel, warningPlayed, soundSettings])

  // Sync timer to database
  useEffect(() => {
    if (gameSession && isAdmin) {
      const syncInterval = setInterval(() => syncTimerToDatabase(), 10000)
      return () => clearInterval(syncInterval)
    }
  }, [gameSession, isRunning, timeRemaining, currentLevel])

  const syncTimerToDatabase = async () => {
    if (!gameSession) return
    await supabase
      .from('game_sessions')
      .update({ current_level: currentLevel, time_remaining_seconds: timeRemaining, is_running: isRunning })
      .eq('id', gameSession.id)
  }

  // Audio functions
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioContextRef.current
  }

  const playTone = (frequency, duration, type = 'sine') => {
    try {
      const ctx = initAudio()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.value = frequency
      oscillator.type = type
      gainNode.gain.value = (soundSettings.volume / 100) * 0.5
      oscillator.start()
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
      oscillator.stop(ctx.currentTime + duration)
    } catch (e) {
      console.log('Audio not available')
    }
  }

  const speak = (text) => {
    if ('speechSynthesis' in window && soundSettings.voiceStyle !== 'none') {
      speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.volume = soundSettings.volume / 100
      utterance.rate = soundSettings.voiceStyle === 'southern' ? 0.85 : 0.95
      speechSynthesis.speak(utterance)
    }
  }

  const playSound = (type) => {
    if (type === 'levelEnd' && soundSettings.levelChange) {
      playTone(523, 0.2)
      setTimeout(() => playTone(659, 0.2), 150)
      setTimeout(() => playTone(784, 0.3), 300)
      if (soundSettings.voiceStyle !== 'none') {
        const phrases = {
          southern: "Blinds goin' up y'all!",
          professional: "New level. Blinds increasing.",
          neutral: "Blinds going up"
        }
        setTimeout(() => speak(phrases[soundSettings.voiceStyle] || phrases.neutral), 500)
      }
    } else if (type === 'warning' && soundSettings.warningEnabled) {
      playTone(800, 0.1)
      setTimeout(() => playTone(800, 0.1), 150)
      if (soundSettings.voiceStyle !== 'none') {
        const phrases = {
          southern: "One minute warnin' y'all!",
          professional: "One minute remaining",
          neutral: "One minute warning"
        }
        setTimeout(() => speak(phrases[soundSettings.voiceStyle] || phrases.neutral), 300)
      }
    } else if (type === 'rebuy' && soundSettings.rebuyAlert) {
      playTone(880, 0.15)
      setTimeout(() => playTone(1100, 0.2), 150)
    } else if (type === 'rebuyClosing' && soundSettings.rebuyClosing) {
      playTone(600, 0.15)
      setTimeout(() => playTone(800, 0.15), 150)
      if (soundSettings.voiceStyle !== 'none') {
        setTimeout(() => speak("Last call for rebuys!"), 300)
      }
    }
  }

  const advanceLevel = () => {
    const newLevel = Math.min(currentLevel + 1, blindStructure.length)
    setCurrentLevel(newLevel)
    
    // Check if approaching rebuy cutoff
    if (rebuysCutoffType === 'level' && newLevel === rebuysCutoffLevel - 1) {
      playSound('rebuyClosing')
    }
  }

  const rebuysAllowed = () => {
    if (rebuysCutoffType === 'halftime') {
      return currentLevel <= Math.floor(blindStructure.length / 2)
    }
    return currentLevel < rebuysCutoffLevel
  }

  const startGame = async (playerIds, settings) => {
    setRebuysCutoffLevel(settings.rebuysCutoffLevel)
    setRebuysCutoffType(settings.rebuysCutoffType)
    setBuyInAmount(settings.buyIn)
    setRebuyAmount(settings.rebuyAmount)
    setBountyAmount(settings.bountyAmount)
    setStartingChips(settings.startingChips)

    const { data: session, error } = await supabase
      .from('game_sessions')
      .insert({
        event_id: selectedEvent.id,
        current_level: 1,
        time_remaining_seconds: blindStructure[0].duration * 60,
        is_running: false,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) return

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
      await supabase.from('game_sessions').update({ is_running: newIsRunning }).eq('id', gameSession.id)
    }
  }

  const changeLevel = async (delta) => {
    const newLevel = Math.max(1, Math.min(currentLevel + delta, blindStructure.length))
    setCurrentLevel(newLevel)
    setTimeRemaining(blindStructure[newLevel - 1].duration * 60)
    setWarningPlayed(false)
    if (gameSession) {
      await supabase.from('game_sessions')
        .update({ current_level: newLevel, time_remaining_seconds: blindStructure[newLevel - 1].duration * 60 })
        .eq('id', gameSession.id)
    }
  }

  const addTime = (seconds) => setTimeRemaining(t => Math.max(0, t + seconds))

  const handleRebuy = async (participantId) => {
    if (!rebuysAllowed()) return
    playSound('rebuy')
    const participant = participants.find(p => p.id === participantId)
    const newRebuyCount = (participant?.rebuy_count || 0) + 1
    await supabase.from('game_participants').update({ rebuy_count: newRebuyCount }).eq('id', participantId)
    setTotalRebuys(prev => prev + 1)
    fetchGameSession()
    setShowRebuyModal(false)
  }

  const requestRebuy = async () => {
    playSound('rebuy')
    setRebuyRequests(prev => [...prev, { id: Date.now(), userId: user.id, name: user.full_name || user.email, time: new Date() }])
  }

  // Fetch payout structure from database
  const fetchPayoutTiers = async () => {
    try {
      // Get the league's default payout structure
      const { data: structure } = await supabase
        .from('payout_structures')
        .select('id')
        .eq('league_id', currentLeague.id)
        .eq('is_default', true)
        .single()
      
      if (!structure?.id) return null
      
      const { data: tiers } = await supabase
        .from('payout_tiers')
        .select('*')
        .eq('structure_id', structure.id)
        .order('min_players', { ascending: true })
      
      return tiers || null
    } catch (err) {
      console.error('Error fetching payout tiers:', err)
      return null
    }
  }

  // Fetch points structure from database
  const fetchPointsStructure = async () => {
    try {
      const { data: structure } = await supabase
        .from('points_structures')
        .select('id')
        .eq('league_id', currentLeague.id)
        .eq('is_default', true)
        .single()
      
      if (!structure?.id) return null
      
      const { data: positions } = await supabase
        .from('points_by_position')
        .select('*')
        .eq('structure_id', structure.id)
        .order('position', { ascending: true })
      
      // Also get bonus points from the structure
      const { data: structureData } = await supabase
        .from('points_structures')
        .select('participation_points, bounty_points')
        .eq('id', structure.id)
        .single()
      
      return {
        positions: positions || [],
        participationPoints: structureData?.participation_points || 0,
        bountyPoints: structureData?.bounty_points || 0
      }
    } catch (err) {
      console.error('Error fetching points structure:', err)
      return null
    }
  }

  // Calculate payouts for all players when game ends
  const calculatePayouts = async (allParticipants, totalPrizePool) => {
    const tiers = await fetchPayoutTiers()
    const playerCount = allParticipants.length
    
    // Find the right tier for this player count
    let tier = null
    if (tiers) {
      tier = tiers.find(t => playerCount >= t.min_players && playerCount <= t.max_players)
    }
    
    // Default percentages if no tier found
    const payoutPercentages = tier ? {
      1: tier.first_place_pct,
      2: tier.second_place_pct,
      3: tier.third_place_pct
    } : {
      1: playerCount <= 3 ? 100 : playerCount <= 5 ? 70 : 50,
      2: playerCount <= 3 ? 0 : playerCount <= 5 ? 30 : 30,
      3: playerCount <= 5 ? 0 : 20
    }
    
    // Calculate actual payouts
    const payouts = {}
    for (let position = 1; position <= 3; position++) {
      const pct = payoutPercentages[position] || 0
      payouts[position] = Math.round((totalPrizePool * pct / 100) * 100) / 100 // Round to cents
    }
    
    return payouts
  }

  // Calculate points for all players when game ends
  const calculatePoints = async (allParticipants) => {
    const pointsData = await fetchPointsStructure()
    const points = {}
    
    // Calculate bounty counts for each player
    const bountyCounts = {}
    allParticipants.forEach(p => {
      if (p.eliminated_by) {
        bountyCounts[p.eliminated_by] = (bountyCounts[p.eliminated_by] || 0) + 1
      }
    })
    
    allParticipants.forEach(p => {
      let playerPoints = 0
      
      // Position points
      if (pointsData?.positions && p.finish_position) {
        const positionData = pointsData.positions.find(pos => pos.position === p.finish_position)
        playerPoints += positionData?.points || 0
      } else if (p.finish_position) {
        // Default points: 10 for 1st, 7 for 2nd, 5 for 3rd, 3 for 4th, 2 for 5th, 1 for rest
        const defaultPoints = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
        playerPoints += defaultPoints[p.finish_position] || 1
      }
      
      // Participation points
      playerPoints += pointsData?.participationPoints || 1
      
      // Bounty points
      const playerBounties = bountyCounts[p.user_id] || 0
      playerPoints += playerBounties * (pointsData?.bountyPoints || 1)
      
      points[p.id] = {
        total: playerPoints,
        bountyCount: playerBounties
      }
    })
    
    return points
  }

  const eliminatePlayer = async (participantId, eliminatedById = null) => {
    const activePlayers = participants.filter(p => p.status === 'playing')
    const position = activePlayers.length

    // Update the eliminated player
    await supabase.from('game_participants')
      .update({ 
        status: 'eliminated', 
        finish_position: position, 
        eliminated_by: eliminatedById, 
        eliminated_at: new Date().toISOString() 
      })
      .eq('id', participantId)

    // Check if game is over (2 players left means we just eliminated to leave 1)
    if (activePlayers.length <= 2) {
      const winner = activePlayers.find(p => p.id !== participantId)
      if (winner) {
        // Mark winner
        await supabase.from('game_participants')
          .update({ status: 'winner', finish_position: 1 })
          .eq('id', winner.id)
        
        // End the game session
        await supabase.from('game_sessions')
          .update({ is_running: false, ended_at: new Date().toISOString() })
          .eq('id', gameSession.id)
        
        setIsRunning(false)
        playSound('levelEnd')
        
        // Calculate and apply payouts and points
        await finalizeGameResults()
      }
    }
    
    fetchGameSession()
    setShowEliminateModal(false)
    setSelectedPlayer(null)
  }

  // Finalize game - calculate payouts, points, and update all records
  const finalizeGameResults = async () => {
    try {
      // Fetch fresh participant data with finish positions
      const { data: finalParticipants } = await supabase
        .from('game_participants')
        .select('*, users(id, full_name, display_name)')
        .eq('session_id', gameSession.id)
      
      if (!finalParticipants) return
      
      const totalPrizePool = (buyInAmount * finalParticipants.length) + (rebuyAmount * totalRebuys)
      
      // Calculate payouts
      const payouts = await calculatePayouts(finalParticipants, totalPrizePool)
      
      // Calculate points
      const points = await calculatePoints(finalParticipants)
      
      // Update each participant with their winnings and points
      for (const participant of finalParticipants) {
        const winnings = payouts[participant.finish_position] || 0
        const pointsData = points[participant.id] || { total: 0, bountyCount: 0 }
        
        // Calculate bounty winnings
        const bountyWinnings = pointsData.bountyCount * bountyAmount
        
        await supabase.from('game_participants')
          .update({
            winnings: winnings,
            bounty_winnings: bountyWinnings,
            points_earned: pointsData.total
          })
          .eq('id', participant.id)
        
        // Update league member stats
        await supabase.rpc('update_member_stats', {
          p_user_id: participant.user_id,
          p_league_id: currentLeague.id,
          p_points: pointsData.total,
          p_bounties: pointsData.bountyCount,
          p_is_winner: participant.finish_position === 1
        }).catch(() => {
          // If RPC doesn't exist, update directly
          updateMemberStatsDirectly(
            participant.user_id,
            pointsData.total,
            pointsData.bountyCount,
            participant.finish_position === 1
          )
        })
      }
      
      console.log('Game finalized - payouts:', payouts, 'points:', points)
    } catch (err) {
      console.error('Error finalizing game results:', err)
    }
  }

  // Fallback function to update member stats directly
  const updateMemberStatsDirectly = async (userId, points, bounties, isWinner) => {
    const { data: member } = await supabase
      .from('league_members')
      .select('games_played, total_wins, total_points, total_bounties')
      .eq('league_id', currentLeague.id)
      .eq('user_id', userId)
      .single()
    
    if (member) {
      await supabase.from('league_members')
        .update({
          games_played: (member.games_played || 0) + 1,
          total_wins: (member.total_wins || 0) + (isWinner ? 1 : 0),
          total_points: (member.total_points || 0) + points,
          total_bounties: (member.total_bounties || 0) + bounties
        })
        .eq('league_id', currentLeague.id)
        .eq('user_id', userId)
    }
  }

  const openTVMode = () => {
    setShowTVMode(true)
    // Try to use Presentation API for casting
    if ('presentation' in navigator && navigator.presentation.defaultRequest) {
      navigator.presentation.defaultRequest.start()
        .then(connection => console.log('Connected to display:', connection))
        .catch(err => console.log('Presentation API not available, using fullscreen'))
    }
    // Fallback to fullscreen
    document.documentElement.requestFullscreen?.()
  }

  const closeTVMode = () => {
    setShowTVMode(false)
    document.exitFullscreen?.()
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const currentBlinds = blindStructure[currentLevel - 1] || blindStructure[0]
  const nextBlinds = blindStructure[currentLevel] || null
  const activePlayers = participants.filter(p => p.status === 'playing')
  const eliminatedPlayers = participants.filter(p => p.status === 'eliminated').sort((a, b) => a.finish_position - b.finish_position)
  const winner = participants.find(p => p.status === 'winner')
  
  const prizePool = (buyInAmount * participants.length) + (rebuyAmount * totalRebuys)
  const bountyPool = bountyAmount * participants.length
  const avgStack = activePlayers.length > 0 ? Math.round((startingChips * participants.length + startingChips * totalRebuys) / activePlayers.length) : 0
  const progressPercent = ((blindStructure[currentLevel - 1]?.duration * 60 - timeRemaining) / (blindStructure[currentLevel - 1]?.duration * 60)) * 100

  if (loading) return <div className="px-4 py-8 text-center text-white/50">Loading...</div>

  if (events.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="text-4xl mb-4">⏱️</div>
        <div className="text-white/60 mb-2">No upcoming games</div>
        <div className="text-white/40 text-sm">Schedule a game in the Calendar tab</div>
      </div>
    )
  }

  // TV MODE - Full screen display for casting
  if (showTVMode) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#041a10] via-[#0a4d2c] to-[#041a10] z-50 flex flex-col items-center justify-center p-8">
        <button onClick={closeTVMode} className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 text-white text-2xl">✕</button>
        
        {/* League Name */}
        <div className="font-display text-3xl text-gold tracking-widest mb-2">{currentLeague?.name?.toUpperCase()}</div>
        
        {/* Live indicator */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
          <span className={`text-lg ${isRunning ? 'text-green-400' : 'text-yellow-400'}`}>{isRunning ? 'LIVE' : 'PAUSED'}</span>
        </div>

        {/* Level badge */}
        <div className="bg-gradient-to-r from-gold to-[#b8860b] px-12 py-4 rounded-full mb-6">
          <div className="font-display text-4xl font-bold text-black tracking-wider">LEVEL {currentLevel}</div>
        </div>

        {/* Giant Timer */}
        <div className={`font-mono text-[180px] leading-none font-medium tracking-tight ${timeRemaining <= 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          {formatTime(timeRemaining)}
        </div>

        {/* Progress bar */}
        <div className="w-4/5 max-w-3xl h-3 bg-white/20 rounded-full my-8 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#b4942f] via-gold to-[#f0d060] rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
        </div>

        {/* Blinds */}
        <div className="bg-black/40 border-4 border-gold rounded-3xl px-16 py-8 mb-6">
          <div className="text-white/50 text-sm tracking-widest text-center mb-2">BLINDS</div>
          <div className="font-display text-7xl text-white text-center">{currentBlinds.sb.toLocaleString()} / {currentBlinds.bb.toLocaleString()}</div>
          {currentBlinds.ante > 0 && <div className="text-gold text-2xl text-center mt-2">Ante: {currentBlinds.ante}</div>}
        </div>

        {/* Next level */}
        {nextBlinds && (
          <div className="opacity-70 text-center">
            <div className="text-white/50 text-sm tracking-widest">NEXT LEVEL</div>
            <div className="font-display text-3xl text-white">{nextBlinds.sb.toLocaleString()} / {nextBlinds.bb.toLocaleString()}</div>
          </div>
        )}

        {/* Rebuy status */}
        <div className={`mt-6 px-6 py-2 rounded-full text-lg font-semibold ${rebuysAllowed() ? 'bg-green-500/20 border border-green-500 text-green-400' : 'bg-red-500/20 border border-red-500 text-red-400'}`}>
          {rebuysAllowed() ? `🔄 Rebuys Open (until Level ${rebuysCutoffLevel})` : '🚫 Rebuys Closed'}
        </div>

        {/* Stats bar at bottom */}
        <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
          <div className="flex gap-16">
            <div className="text-center">
              <div className="font-display text-5xl text-white">{activePlayers.length}</div>
              <div className="text-white/50 text-sm tracking-widest">REMAINING</div>
            </div>
            <div className="text-center">
              <div className="font-display text-5xl text-white">{participants.length}</div>
              <div className="text-white/50 text-sm tracking-widest">ENTRIES</div>
            </div>
            <div className="text-center">
              <div className="font-display text-5xl text-white">{avgStack.toLocaleString()}</div>
              <div className="text-white/50 text-sm tracking-widest">AVG STACK</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white/50 text-sm tracking-widest">PRIZE POOL</div>
            <div className="font-display text-6xl text-gold">${prizePool.toLocaleString()}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      {/* Event selector */}
      {events.length > 1 && (
        <select value={selectedEvent?.id || ''} onChange={(e) => setSelectedEvent(events.find(ev => ev.id === e.target.value))} className="input mb-4">
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title} - {new Date(ev.event_date + 'T00:00').toLocaleDateString()}</option>)}
        </select>
      )}

      {/* No game session yet */}
      {!gameSession && selectedEvent && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎰</div>
          <h3 className="text-xl font-display text-gold mb-2">{selectedEvent.title}</h3>
          <p className="text-white/60 mb-6">{new Date(selectedEvent.event_date + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          {isAdmin ? (
            <button onClick={() => setShowStartModal(true)} className="btn btn-primary py-3 px-8 text-lg">🎲 Start Game</button>
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
              <span className={`text-sm font-medium ${isRunning ? 'text-green-400' : 'text-yellow-400'}`}>{isRunning ? 'Live' : 'Paused'}</span>
              <span className="text-white/40 text-sm">• {activePlayers.length} players</span>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <>
                  <button onClick={() => setShowSoundSettings(!showSoundSettings)} className="text-white/50 text-sm">🔊</button>
                  <button onClick={() => setShowSettingsModal(true)} className="text-white/50 text-sm">⚙️</button>
                </>
              )}
            </div>
          </div>

          {/* Timer display */}
          <div className={`card text-center mb-4 ${timeRemaining <= 60 ? 'border-2 border-red-500' : 'card-gold'}`}>
            <div className="text-white/60 text-sm mb-1">Level {currentLevel} of {blindStructure.length}</div>
            <div className={`font-display text-6xl mb-2 tracking-wider ${timeRemaining <= 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {formatTime(timeRemaining)}
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-2 bg-white/20 rounded-full mb-3 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-gold to-[#f0d060] rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
            </div>

            <div className="text-2xl font-display text-gold">
              {currentBlinds.sb.toLocaleString()}/{currentBlinds.bb.toLocaleString()}
              {currentBlinds.ante > 0 && <span className="text-white/60 text-lg"> (ante {currentBlinds.ante})</span>}
            </div>
            
            {nextBlinds && <div className="text-white/40 text-sm mt-2">Next: {nextBlinds.sb.toLocaleString()}/{nextBlinds.bb.toLocaleString()}</div>}

            {/* Rebuy status */}
            <div className={`mt-3 text-sm px-4 py-1 rounded-full inline-block ${rebuysAllowed() ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {rebuysAllowed() ? `🔄 Rebuys open until Level ${rebuysCutoffLevel}` : '🚫 Rebuys closed'}
            </div>
            
            {/* Admin controls */}
            {isAdmin && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2 justify-center flex-wrap">
                  <button onClick={() => changeLevel(-1)} className="btn btn-secondary py-2 px-3" disabled={currentLevel <= 1}>◀ Prev</button>
                  <button onClick={() => addTime(-60)} className="btn btn-secondary py-2 px-3">-1m</button>
                  <button onClick={toggleTimer} className={`btn py-2 px-6 ${isRunning ? 'bg-yellow-600' : 'btn-primary'}`}>
                    {isRunning ? '⏸ Pause' : '▶ Start'}
                  </button>
                  <button onClick={() => addTime(60)} className="btn btn-secondary py-2 px-3">+1m</button>
                  <button onClick={() => changeLevel(1)} className="btn btn-secondary py-2 px-3" disabled={currentLevel >= blindStructure.length}>Next ▶</button>
                </div>
              </div>
            )}

            {!isAdmin && <div className="text-white/40 text-xs mt-4">Timer controlled by tournament director</div>}
          </div>

          {/* Sound Settings Panel */}
          {showSoundSettings && isAdmin && (
            <div className="card mb-4 bg-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">🔊 Sound Settings</span>
                <button onClick={() => setShowSoundSettings(false)} className="text-white/50">✕</button>
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm">Level Change Alert</span>
                  <input type="checkbox" checked={soundSettings.levelChange} onChange={e => setSoundSettings({...soundSettings, levelChange: e.target.checked})} />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Warning Alert</span>
                  <input type="checkbox" checked={soundSettings.warningEnabled} onChange={e => setSoundSettings({...soundSettings, warningEnabled: e.target.checked})} />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Rebuy Alerts</span>
                  <input type="checkbox" checked={soundSettings.rebuyAlert} onChange={e => setSoundSettings({...soundSettings, rebuyAlert: e.target.checked})} />
                </label>
                <div>
                  <label className="text-sm text-white/60">Voice Style</label>
                  <select value={soundSettings.voiceStyle} onChange={e => setSoundSettings({...soundSettings, voiceStyle: e.target.value})} className="input mt-1">
                    <option value="southern">🤠 Southern</option>
                    <option value="professional">🎩 Professional</option>
                    <option value="neutral">🗣 Neutral</option>
                    <option value="none">🔇 No Voice</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-white/60">Volume: {soundSettings.volume}%</label>
                  <input type="range" min="0" max="100" value={soundSettings.volume} onChange={e => setSoundSettings({...soundSettings, volume: parseInt(e.target.value)})} className="w-full" />
                </div>
                <button onClick={() => playSound('levelEnd')} className="btn btn-secondary w-full py-2">🔊 Test Sound</button>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="card text-center py-3">
              <div className="font-display text-2xl text-white">{activePlayers.length}</div>
              <div className="text-xs text-white/50">Remaining</div>
            </div>
            <div className="card text-center py-3">
              <div className="font-display text-2xl text-white">{participants.length + totalRebuys}</div>
              <div className="text-xs text-white/50">Entries</div>
            </div>
            <div className="card text-center py-3">
              <div className="font-display text-2xl text-white">{avgStack.toLocaleString()}</div>
              <div className="text-xs text-white/50">Avg Stack</div>
            </div>
          </div>

          {/* Prize pool & Bounties */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="card text-center bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30">
              <div className="text-white/60 text-xs">Prize Pool</div>
              <div className="font-display text-2xl text-gold">${prizePool.toLocaleString()}</div>
              <div className="text-xs text-white/40">{participants.length} buy-ins + {totalRebuys} rebuys</div>
            </div>
            <div className="card text-center">
              <div className="text-white/60 text-xs">Bounties</div>
              <div className="font-display text-2xl text-chip-red">${bountyPool.toLocaleString()}</div>
              <div className="text-xs text-white/40">${bountyAmount} per player</div>
            </div>
          </div>

          {/* Rebuy Alert Button (Admin) */}
          {isAdmin && rebuysAllowed() && (
            <button onClick={() => setShowRebuyModal(true)} className="w-full card bg-green-600/20 border border-green-500 text-center py-4 mb-4">
              <div className="text-2xl mb-1">🔄</div>
              <div className="text-green-400 font-semibold">Record Rebuy</div>
              <div className="text-green-400/60 text-xs">${rebuyAmount} • {totalRebuys} total rebuys</div>
            </button>
          )}

          {/* Rebuy Request Button (Player) */}
          {!isAdmin && rebuysAllowed() && (
            <button onClick={requestRebuy} className="w-full card bg-chip-red/20 border border-chip-red text-center py-4 mb-4">
              <div className="text-2xl mb-1">🔄</div>
              <div className="text-white font-semibold">Request Rebuy</div>
              <div className="text-white/60 text-xs">Tap to alert tournament director</div>
            </button>
          )}

          {/* Rebuy Requests Queue (Admin) */}
          {isAdmin && rebuyRequests.length > 0 && (
            <div className="card mb-4 bg-yellow-500/10 border border-yellow-500">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-yellow-400">🔔</span>
                <span className="font-medium text-yellow-400">Rebuy Requests ({rebuyRequests.length})</span>
              </div>
              {rebuyRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3 p-2 bg-black/20 rounded-lg mb-2">
                  <span className="flex-1">{req.name}</span>
                  <button onClick={() => { handleRebuy(req.userId); setRebuyRequests(prev => prev.filter(r => r.id !== req.id)) }} className="btn btn-primary text-xs py-1 px-3">Approve</button>
                  <button onClick={() => setRebuyRequests(prev => prev.filter(r => r.id !== req.id))} className="text-white/50 text-xs">Deny</button>
                </div>
              ))}
            </div>
          )}

          {/* TV Mode Button */}
          {isAdmin && (
            <button onClick={openTVMode} className="w-full card bg-white/5 border border-white/20 text-center py-4 mb-4">
              <div className="text-2xl mb-1">📺</div>
              <div className="text-white font-semibold">Open TV Display Mode</div>
              <div className="text-white/40 text-xs">Full-screen for TV or projector casting</div>
            </button>
          )}

          {/* Players */}
          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium">Players</span>
              <span className="text-gold font-display text-lg">{activePlayers.length}/{participants.length}</span>
            </div>
            
            {/* Active players */}
            <div className="space-y-2 mb-4">
              {activePlayers.map((player) => (
                <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-sm font-semibold">
                    {getInitials(player.users?.display_name || player.users?.full_name)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{player.users?.display_name || player.users?.full_name}</div>
                    <div className="text-xs text-white/50">
                      {player.rebuy_count > 0 && <span className="text-yellow-400">{player.rebuy_count} rebuy{player.rebuy_count > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  {/* Bounty chip */}
                  <div className="w-6 h-6 rounded-full bg-chip-red text-white text-xs flex items-center justify-center font-bold">
                    {1 + (player.bounties_collected || 0)}
                  </div>
                  {isAdmin && activePlayers.length > 1 && (
                    <button onClick={() => { setSelectedPlayer(player); setShowEliminateModal(true) }} className="text-red-400 text-xs px-3 py-1 rounded bg-red-500/20">
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
                        <div className="text-sm line-through">{player.users?.display_name || player.users?.full_name}</div>
                        <div className="text-xs text-red-400">
                          {getOrdinal(player.finish_position)} place
                          {player.eliminated_by_user && <span className="text-white/40"> • by {player.eliminated_by_user.display_name || player.eliminated_by_user.full_name}</span>}
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
          {winner && <p className="text-white text-xl mb-4">🎉 {winner.users?.display_name || winner.users?.full_name} Wins! 🎉</p>}
          <div className="card mt-4 text-left">
            <h4 className="font-medium mb-3 text-center">Final Results</h4>
            <div className="space-y-2">
              {[winner, ...eliminatedPlayers].filter(Boolean).map((player, idx) => (
                <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-gold text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/20'}`}>{idx + 1}</div>
                  <span className="flex-1">{player.users?.display_name || player.users?.full_name}</span>
                  {player.rebuy_count > 0 && <span className="text-xs text-yellow-400">{player.rebuy_count}R</span>}
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

      {/* Modals */}
      {showStartModal && <StartGameModal eventId={selectedEvent.id} leagueId={currentLeague.id} defaultBuyIn={buyInAmount} defaultRebuy={rebuyAmount} defaultBounty={bountyAmount} defaultChips={startingChips} onClose={() => setShowStartModal(false)} onStart={startGame} />}
      {showRebuyModal && <RebuyModal players={activePlayers} rebuyAmount={rebuyAmount} onClose={() => setShowRebuyModal(false)} onRebuy={handleRebuy} />}
      {showEliminateModal && selectedPlayer && <EliminateModal player={selectedPlayer} players={activePlayers} bountyAmount={bountyAmount} onClose={() => { setShowEliminateModal(false); setSelectedPlayer(null) }} onEliminate={eliminatePlayer} />}
      {showSettingsModal && <SettingsModal rebuysCutoffLevel={rebuysCutoffLevel} rebuysCutoffType={rebuysCutoffType} onSave={(s) => { setRebuysCutoffLevel(s.rebuysCutoffLevel); setRebuysCutoffType(s.rebuysCutoffType); setShowSettingsModal(false) }} onClose={() => setShowSettingsModal(false)} />}
    </div>
  )
}

// ========== MODALS ==========

function StartGameModal({ eventId, leagueId, defaultBuyIn, defaultRebuy, defaultBounty, defaultChips, onClose, onStart }) {
  const [members, setMembers] = useState([])
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [buyIn, setBuyIn] = useState(defaultBuyIn)
  const [rebuyAmount, setRebuyAmount] = useState(defaultRebuy)
  const [bountyAmount, setBountyAmount] = useState(defaultBounty)
  const [startingChips, setStartingChips] = useState(defaultChips || 10000)
  const [rebuysCutoffLevel, setRebuysCutoffLevel] = useState(6)
  const [rebuysCutoffType, setRebuysCutoffType] = useState('level')

  useEffect(() => {
    const fetchMembers = async () => {
      const { data: rsvps } = await supabase.from('event_rsvps').select(`user_id, users (id, full_name, display_name)`).eq('event_id', eventId).eq('status', 'going')
      const { data: leagueMembers } = await supabase.from('league_members').select(`user_id, member_type, guest_buyins_count, big_game_eligible, users (id, full_name, display_name)`).eq('league_id', leagueId).eq('status', 'active')
      
      const goingUserIds = new Set(rsvps?.map(r => r.user_id) || [])
      const memberMap = {}
      leagueMembers?.forEach(m => { if (m.users) memberMap[m.user_id] = m })
      
      const combinedUsers = leagueMembers?.map(m => ({
        ...m.users,
        member_type: m.member_type || 'guest',
        guest_buyins_count: m.guest_buyins_count || 0,
        big_game_eligible: m.big_game_eligible,
        rsvp: goingUserIds.has(m.user_id) ? 'going' : 'other'
      })) || []
      
      // Sort: RSVP'd first, then paid members, then guests
      combinedUsers.sort((a, b) => {
        if (a.rsvp === 'going' && b.rsvp !== 'going') return -1
        if (b.rsvp === 'going' && a.rsvp !== 'going') return 1
        if (a.member_type === 'paid' && b.member_type !== 'paid') return -1
        if (b.member_type === 'paid' && a.member_type !== 'paid') return 1
        return 0
      })
      
      setMembers(combinedUsers)
      setSelectedPlayers(combinedUsers.filter(u => u.rsvp === 'going').map(u => u.id))
      setLoading(false)
    }
    fetchMembers()
  }, [eventId, leagueId])

  const togglePlayer = (userId) => setSelectedPlayers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-felt-dark rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-xl text-gold">Start Game</h2>
          <button onClick={onClose} className="text-white/60 text-2xl">&times;</button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-white/50 mb-1">Buy-in ($)</label><input type="number" value={buyIn} onChange={(e) => setBuyIn(Number(e.target.value))} className="input text-center" /></div>
            <div><label className="block text-xs text-white/50 mb-1">Rebuy ($)</label><input type="number" value={rebuyAmount} onChange={(e) => setRebuyAmount(Number(e.target.value))} className="input text-center" /></div>
            <div><label className="block text-xs text-white/50 mb-1">Bounty ($)</label><input type="number" value={bountyAmount} onChange={(e) => setBountyAmount(Number(e.target.value))} className="input text-center" /></div>
            <div><label className="block text-xs text-white/50 mb-1">Starting Chips</label><input type="number" value={startingChips} onChange={(e) => setStartingChips(Number(e.target.value))} className="input text-center" /></div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <label className="block text-sm text-white/60 mb-2">Rebuys Close At</label>
            <div className="flex gap-2">
              <select value={rebuysCutoffType} onChange={(e) => setRebuysCutoffType(e.target.value)} className="input flex-1">
                <option value="level">Specific Level</option>
                <option value="halftime">Halftime</option>
              </select>
              {rebuysCutoffType === 'level' && (
                <select value={rebuysCutoffLevel} onChange={(e) => setRebuysCutoffLevel(Number(e.target.value))} className="input w-24">
                  {[...Array(15)].map((_, i) => <option key={i + 1} value={i + 1}>Level {i + 1}</option>)}
                </select>
              )}
            </div>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">Select players ({selectedPlayers.length}):</p>
            {loading ? <div className="text-center py-4 text-white/50">Loading...</div> : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {members.map(member => (
                  <button key={member.id} onClick={() => togglePlayer(member.id)} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${selectedPlayers.includes(member.id) ? 'bg-green-600/30 border border-green-500' : 'bg-white/5 border border-transparent'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${member.member_type === 'paid' ? 'bg-green-600' : 'bg-gray-500'}`}>{getInitials(member.display_name || member.full_name)}</div>
                    <div className="flex-1 text-left">
                      <div>{member.display_name || member.full_name}</div>
                      <div className="text-xs text-white/50">
                        {member.member_type === 'paid' ? (
                          <span className="text-green-400">✓ Paid Member</span>
                        ) : (
                          <span className="text-yellow-400">Guest (+$10 fee)</span>
                        )}
                      </div>
                    </div>
                    {member.rsvp === 'going' && <span className="text-xs text-green-400">RSVP'd</span>}
                    {selectedPlayers.includes(member.id) && <span className="text-green-400">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-white/10">
          <button onClick={() => selectedPlayers.length >= 2 && onStart(selectedPlayers, { buyIn, rebuyAmount, bountyAmount, startingChips, rebuysCutoffLevel, rebuysCutoffType })} disabled={selectedPlayers.length < 2} className="w-full btn btn-primary py-3 disabled:opacity-50">
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
              <button key={player.id} onClick={() => onRebuy(player.id)} className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-green-600/20 transition-colors">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-sm font-semibold">{getInitials(player.users?.display_name || player.users?.full_name)}</div>
                <span className="flex-1 text-left">{player.users?.display_name || player.users?.full_name}</span>
                {player.rebuy_count > 0 && <span className="text-yellow-400 text-sm">{player.rebuy_count}R</span>}
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
        <div className="p-4 border-b border-white/10"><h2 className="font-display text-xl text-red-400">💀 Eliminate Player</h2></div>
        <div className="p-4">
          <div className="text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-600/30 flex items-center justify-center text-2xl font-semibold mx-auto mb-2">{getInitials(player.users?.display_name || player.users?.full_name)}</div>
            <div className="text-white font-medium">{player.users?.display_name || player.users?.full_name}</div>
          </div>
          {bountyAmount > 0 && (
            <div className="mb-4">
              <p className="text-white/60 text-sm mb-2">Who gets the ${bountyAmount} bounty?</p>
              <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                {otherPlayers.map(p => (
                  <button key={p.id} onClick={() => setEliminatedBy(p.id)} className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${eliminatedBy === p.id ? 'bg-gold/30 border border-gold' : 'bg-white/5'}`}>
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-xs font-semibold">{getInitials(p.users?.display_name || p.users?.full_name)}</div>
                    <span className="text-sm">{p.users?.display_name || p.users?.full_name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 text-white">Cancel</button>
            <button onClick={() => onEliminate(player.id, eliminatedBy)} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold">Confirm Bust</button>
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
              <select value={cutoffType} onChange={(e) => setCutoffType(e.target.value)} className="input flex-1">
                <option value="level">Specific Level</option>
                <option value="halftime">Halftime</option>
              </select>
              {cutoffType === 'level' && (
                <select value={cutoffLevel} onChange={(e) => setCutoffLevel(Number(e.target.value))} className="input w-24">
                  {[...Array(15)].map((_, i) => <option key={i + 1} value={i + 1}>Level {i + 1}</option>)}
                </select>
              )}
            </div>
          </div>
          <button onClick={() => onSave({ rebuysCutoffLevel: cutoffLevel, rebuysCutoffType: cutoffType })} className="w-full btn btn-primary py-3">Save Settings</button>
        </div>
      </div>
    </div>
  )
}

// ========== HELPERS ==========
function getInitials(name) { if (!name) return '?'; return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) }
function getOrdinal(n) { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]) }
