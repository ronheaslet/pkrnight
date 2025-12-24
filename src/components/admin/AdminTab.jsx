import { useState, useEffect } from 'react'
import { useLeague } from '../../contexts/LeagueContext'
import { supabase } from '../../lib/supabase'

export default function AdminTab() {
  const { currentLeague } = useLeague()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Fetch real members
  useEffect(() => {
    const fetchMembers = async () => {
      if (!currentLeague) return
      
      const { data, error } = await supabase
        .from('league_members')
        .select(`
          id,
          role,
          status,
          games_played,
          total_wins,
          total_points,
          users (
            id,
            full_name,
            display_name,
            email
          )
        `)
        .eq('league_id', currentLeague.id)
        .eq('status', 'active')
      
      if (!error && data) {
        setMembers(data)
      }
      setLoading(false)
    }
    
    fetchMembers()
  }, [currentLeague])

  const inviteLink = `pkrnight.com/join/${currentLeague?.slug || ''}`
  
  const copyInviteLink = () => {
    navigator.clipboard.writeText(currentLeague?.slug || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'bg-gold'
      case 'admin': return 'bg-chip-blue'
      default: return 'bg-chip-green'
    }
  }

  const adminTiles = [
    { id: 'settings', icon: '⚙️', title: 'League Settings', desc: 'Buy-ins, rebuys, dues' },
    { id: 'members', icon: '👥', title: 'Manage Members', desc: `${members.length} active members` },
    { id: 'invite', icon: '🔗', title: 'Invite Link', desc: inviteLink },
    { id: 'points', icon: '📊', title: 'Edit Points', desc: 'Scoring structure' },
    { id: 'payouts', icon: '💰', title: 'Edit Payouts', desc: 'Prize distribution' },
    { id: 'blinds', icon: '⏱️', title: 'Blind Structure', desc: '15 levels configured' },
    { id: 'season', icon: '🏆', title: 'Season Summary', desc: 'View & close season' },
    { id: 'balances', icon: '💳', title: 'Player Balances', desc: 'Dues & credits' },
  ]

  const handleTileClick = (tileId) => {
    if (tileId === 'invite') {
      copyInviteLink()
    }
    // Other tile handlers will be added
  }

  return (
    <div className="px-4 py-4">
      <h2 className="font-display text-xl text-gold mb-4">Admin Panel</h2>

      {/* Admin tiles grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {adminTiles.map(tile => (
          <button
            key={tile.id}
            className="card text-left hover:bg-white/5 transition-colors relative"
            onClick={() => handleTileClick(tile.id)}
          >
            <div className="text-2xl mb-2">{tile.icon}</div>
            <div className="font-semibold text-sm text-white">{tile.title}</div>
            <div className="text-xs text-white/50">{tile.desc}</div>
            {tile.id === 'invite' && copied && (
              <div className="absolute top-2 right-2 text-xs text-green-400">Copied!</div>
            )}
          </button>
        ))}
      </div>

      {/* Real Members List */}
      <div className="mb-4">
        <h3 className="font-display text-lg text-gold mb-3">
          League Members ({members.length})
        </h3>
        {loading ? (
          <div className="text-white/50 text-center py-4">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="text-white/50 text-center py-4">No members yet</div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="card flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${getRoleColor(member.role)} flex items-center justify-center font-semibold text-sm text-black`}>
                  {getInitials(member.users?.full_name)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">
                    {member.users?.display_name || member.users?.full_name || 'Unknown'}
                  </div>
                  <div className="text-xs text-white/50 capitalize">
                    {member.role} • {member.games_played || 0} games
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg text-gold">{member.total_points || 0}</div>
                  <div className="text-xs text-white/50">points</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Code Box */}
      <div className="card mb-4">
        <h3 className="font-semibold text-sm mb-3">Invite Code</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-black/30 rounded-lg px-4 py-3 font-mono text-lg text-gold">
            {currentLeague?.slug || '...'}
          </div>
          <button 
            onClick={copyInviteLink}
            className="btn btn-primary px-4 py-3"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-white/50 mt-2">
          Share this code with friends to invite them to your league
        </p>
      </div>

      {/* Quick Stats */}
      <div className="card">
        <h3 className="font-semibold text-sm mb-3">Season Stats</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="font-display text-2xl text-gold">0</div>
            <div className="text-xs text-white/50">Games</div>
          </div>
          <div>
            <div className="font-display text-2xl text-green-400">$0</div>
            <div className="text-xs text-white/50">Prize Pools</div>
          </div>
          <div>
            <div className="font-display text-2xl text-white">{members.length}</div>
            <div className="text-xs text-white/50">Members</div>
          </div>
        </div>
      </div>
    </div>
  )
}
