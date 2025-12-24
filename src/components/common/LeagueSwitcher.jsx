import { useNavigate } from 'react-router-dom'
import { useLeague } from '../../contexts/LeagueContext'

export default function LeagueSwitcher({ onClose }) {
  const navigate = useNavigate()
  const { leagues, currentLeague, switchLeague } = useLeague()

  const handleSelect = (leagueId) => {
    switchLeague(leagueId)
    onClose()
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return <span className="text-xs bg-gold text-felt-dark px-2 py-0.5 rounded-full">Owner</span>
      case 'admin':
        return <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full">Admin</span>
      default:
        return null
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Switch League</h2>

        <div className="space-y-2 mb-6">
          {leagues.map(league => (
            <button
              key={league.id}
              onClick={() => handleSelect(league.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${
                league.id === currentLeague?.id
                  ? 'bg-gold/20 border-2 border-gold'
                  : 'bg-black/20 border-2 border-transparent hover:bg-black/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🃏</span>
                <div className="text-left">
                  <div className="font-semibold text-white">{league.name}</div>
                  <div className="text-xs text-white/50">/{league.slug}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getRoleBadge(league.role)}
                {league.id === currentLeague?.id && (
                  <span className="text-gold">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { onClose(); navigate('/create') }}
            className="btn btn-secondary py-3 text-sm"
          >
            + Create League
          </button>
          <button
            onClick={() => { onClose(); navigate('/join') }}
            className="btn btn-secondary py-3 text-sm"
          >
            Join with Code
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 text-white/60 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
