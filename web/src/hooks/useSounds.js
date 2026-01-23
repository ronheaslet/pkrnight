import { useRef, useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'pkr_sound_settings'

function getSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return { enabled: true, voice: true, volume: 0.7 }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function useSounds() {
  const audioCtxRef = useRef(null)
  const [settings, setSettings] = useState(getSettings)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }, [])

  const playTone = useCallback((frequency, duration, startTime, volume = 0.3) => {
    if (!settings.enabled) return
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = frequency
    oscillator.type = 'sine'

    const adjustedVolume = volume * settings.volume
    gainNode.gain.setValueAtTime(adjustedVolume, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }, [settings.enabled, settings.volume, getAudioContext])

  // Three-tone ascending chime for level change
  const playLevelChange = useCallback(() => {
    if (!settings.enabled) return
    const ctx = getAudioContext()
    const now = ctx.currentTime
    playTone(523.25, 0.3, now, 0.4)       // C5
    playTone(659.25, 0.3, now + 0.15, 0.4) // E5
    playTone(783.99, 0.5, now + 0.3, 0.5)  // G5
  }, [settings.enabled, getAudioContext, playTone])

  // Warning beep at 60 seconds
  const playWarning = useCallback(() => {
    if (!settings.enabled) return
    const ctx = getAudioContext()
    const now = ctx.currentTime
    playTone(440, 0.2, now, 0.3)      // A4
    playTone(440, 0.2, now + 0.3, 0.3) // A4 again
  }, [settings.enabled, getAudioContext, playTone])

  // Voice announcement for level change
  const announceLevel = useCallback((blinds) => {
    if (!settings.enabled || !settings.voice) return
    if (!('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    const text = `Blinds going up. ${blinds.smallBlind} ${blinds.bigBlind}${blinds.ante > 0 ? `. Ante ${blinds.ante}` : ''}`
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.volume = settings.volume
    window.speechSynthesis.speak(utterance)
  }, [settings.enabled, settings.voice, settings.volume])

  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }, [])

  // Ensure audio context is unlocked on first user interaction
  useEffect(() => {
    function unlock() {
      getAudioContext()
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
    }
    document.addEventListener('click', unlock)
    document.addEventListener('touchstart', unlock)
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
    }
  }, [getAudioContext])

  return {
    settings,
    updateSettings,
    playLevelChange,
    playWarning,
    announceLevel
  }
}
