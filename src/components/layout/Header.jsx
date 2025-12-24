import { useAuth } from '../../contexts/AuthContext'

export default function Header({ leagueName, onLeagueClick, hasMultipleLeagues }) {
  const { profile } = useAuth()
  
  const initials = profile?.display_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'U'

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

        {/* User avatar */}
        <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center text-felt-dark font-semibold text-sm">
          {initials}
        </div>
      </div>
    </header>
  )
}
