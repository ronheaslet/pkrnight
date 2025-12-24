import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function Header({ leagueName, onLeagueClick, hasMultipleLeagues, viewMode, onViewModeChange, userRoles = [] }) {
  const { profile } = useAuth()
  const [showModeMenu, setShowModeMenu] = useState(false)
  
  const initials = profile?.display_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'U'

  // Determine available modes based on roles
  const isAdmin = userRoles.some(r => ['owner', 'admin'].includes(r.slug))
  const isDealer = userRoles.some(r => r.slug === 'dealer' || r.can_pause_timer)
  const hasSpecialRole = userRoles.some(r => !r.is_system_role)

  const viewModes = [
    { id: 'player', label: 'Player', icon: '🎮', desc: 'Standard player view' },
  ]
  
  if (isDealer) {
    viewModes.push({ id: 'dealer', label: 'Dealer', icon: '🃏', desc: 'Timer & blinds only' })
  }
  
  if (isAdmin) {
    viewModes.push({ id: 'admin', label: 'Admin', icon: '⚙️', desc: 'Full admin controls' })
  }

  const currentMode = viewModes.find(m => m.id === viewMode) || viewModes[0]

  const getModeColor = (mode) => {
    switch (mode) {
      case 'admin': return 'bg-gold text-felt-dark'
      case 'dealer': return 'bg-chip-blue text-white'
      default: return 'bg-green-600 text-white'
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-felt-dark/95 backdrop-blur-lg border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-3">
        {/* League name */}
        <button 
          onClick={onLeagueClick}
          className="flex items-center gap-2"
        >
          <span className="text-2xl">🃏</span>
          <div>
            <div className="font-display text-lg text-gold flex items-center gap-1">
              {leagueName}
              {hasMultipleLeagues && (
                <span className="text-white/40 text-sm">▼</span>
              )}
            </div>
          </div>
        </button>

        {/* Right side: View Mode Toggle + Avatar */}
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          {viewModes.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowModeMenu(!showModeMenu)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${getModeColor(viewMode)}`}
              >
                <span>{currentMode.icon}</span>
                <span className="hidden sm:inline">{currentMode.label}</span>
                <span className="text-xs opacity-70">▼</span>
              </button>

              {showModeMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowModeMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-felt-dark border border-white/20 rounded-xl shadow-xl z-50 overflow-hidden">
                    {viewModes.map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          onViewModeChange(mode.id)
                          setShowModeMenu(false)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                          viewMode === mode.id ? 'bg-white/10' : ''
                        }`}
                      >
                        <span className="text-xl">{mode.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{mode.label}</div>
                          <div className="text-xs text-white/50">{mode.desc}</div>
                        </div>
                        {viewMode === mode.id && (
                          <span className="ml-auto text-green-400">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* User avatar with role indicator */}
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center text-felt-dark font-semibold text-sm">
              {initials}
            </div>
            {hasSpecialRole && (
              <div className="absolute -bottom-1 -right-1 text-xs">
                {userRoles.find(r => !r.is_system_role)?.emoji || '⭐'}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
