import { useState, useEffect, useRef } from 'react'

const MODES = [
  { key: 'player', icon: '🎮', label: 'Player', desc: 'Standard player view', color: 'text-green-400' },
  { key: 'dealer', icon: '🃏', label: 'Dealer', desc: 'Timer & blinds only', color: 'text-chip-blue' },
  { key: 'admin', icon: '⚙️', label: 'Admin', desc: 'Full admin controls', color: 'text-gold' }
]

export function ViewModeSwitcher({ isAdmin, isDealer }) {
  const [mode, setMode] = useState(() => localStorage.getItem('pkr_view_mode') || 'player')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectMode(key) {
    setMode(key)
    localStorage.setItem('pkr_view_mode', key)
    setOpen(false)
  }

  const available = MODES.filter(m => {
    if (m.key === 'admin') return isAdmin
    if (m.key === 'dealer') return isDealer || isAdmin
    return true
  })

  // Don't show if only player mode is available
  if (available.length <= 1) return null

  const current = MODES.find(m => m.key === mode) || MODES[0]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-sm ${current.color}`}
      >
        <span>{current.icon}</span>
        <span className="hidden sm:inline">{current.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-felt-dark border border-white/20 rounded-xl shadow-xl z-50 overflow-hidden">
          {available.map(m => (
            <button
              key={m.key}
              onClick={() => selectMode(m.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left ${
                mode === m.key ? 'bg-white/5' : ''
              }`}
            >
              <span className="text-lg">{m.icon}</span>
              <div>
                <div className={`text-sm font-medium ${m.color}`}>{m.label}</div>
                <div className="text-xs text-white/40">{m.desc}</div>
              </div>
              {mode === m.key && <span className="ml-auto text-gold text-sm">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
