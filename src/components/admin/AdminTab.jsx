import { useState, useEffect } from 'react'
import { useLeague } from '../../contexts/LeagueContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function AdminTab() {
  const { currentLeague, refreshLeague } = useLeague()
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [seasonStats, setSeasonStats] = useState({ games: 0, prizePools: 0 })
  
  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [showPayoutsModal, setShowPayoutsModal] = useState(false)
  const [showBlindsModal, setShowBlindsModal] = useState(false)
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [showBalancesModal, setShowBalancesModal] = useState(false)

  useEffect(() => {
    if (currentLeague) {
      fetchMembers()
      fetchSeasonStats()
    }
  }, [currentLeague])

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('league_members')
      .select(`id, role, status, games_played, total_wins, total_points, total_bounties, joined_at, users (id, full_name, display_name, email)`)
      .eq('league_id', currentLeague.id)
      .order('role', { ascending: true })
    
    if (!error && data) setMembers(data)
    setLoading(false)
  }

  const fetchSeasonStats = async () => {
    const { data: games } = await supabase
      .from('game_sessions')
      .select(`id, events!inner(league_id)`)
      .eq('events.league_id', currentLeague.id)
      .not('ended_at', 'is', null)

    const { data: results } = await supabase
      .from('game_participants')
      .select(`winnings, game_sessions!inner(events!inner(league_id))`)
      .eq('game_sessions.events.league_id', currentLeague.id)

    setSeasonStats({
      games: games?.length || 0,
      prizePools: results?.reduce((sum, r) => sum + parseFloat(r.winnings || 0), 0) || 0
    })
  }

  const copyInviteCode = () => {
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
      case 'owner': return 'bg-gold text-felt-dark'
      case 'admin': return 'bg-chip-blue'
      default: return 'bg-green-600'
    }
  }

  const adminTiles = [
    { id: 'settings', icon: '⚙️', title: 'League Settings', desc: 'Name, buy-ins, rules', onClick: () => setShowSettingsModal(true) },
    { id: 'members', icon: '👥', title: 'Manage Members', desc: `${members.filter(m => m.status === 'active').length} active members`, onClick: () => setShowMembersModal(true) },
    { id: 'invite', icon: '🔗', title: 'Invite Code', desc: currentLeague?.slug || '...', onClick: copyInviteCode },
    { id: 'points', icon: '📊', title: 'Points Structure', desc: 'Scoring settings', onClick: () => setShowPointsModal(true) },
    { id: 'payouts', icon: '💰', title: 'Payout Structure', desc: 'Prize distribution', onClick: () => setShowPayoutsModal(true) },
    { id: 'blinds', icon: '⏱️', title: 'Blind Structure', desc: 'Timer levels', onClick: () => setShowBlindsModal(true) },
    { id: 'season', icon: '🏆', title: 'Season Manager', desc: 'View & close season', onClick: () => setShowSeasonModal(true) },
    { id: 'balances', icon: '💳', title: 'Player Balances', desc: 'Dues & credits', onClick: () => setShowBalancesModal(true) },
  ]

  return (
    <div className="px-4 py-4">
      <h2 className="font-display text-xl text-gold mb-4">Admin Panel</h2>

      {/* Admin tiles grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {adminTiles.map(tile => (
          <button key={tile.id} className="card text-left hover:bg-white/5 transition-colors relative" onClick={tile.onClick}>
            <div className="text-2xl mb-2">{tile.icon}</div>
            <div className="font-semibold text-sm text-white">{tile.title}</div>
            <div className="text-xs text-white/50">{tile.desc}</div>
            {tile.id === 'invite' && copied && (
              <div className="absolute top-2 right-2 text-xs text-green-400">Copied!</div>
            )}
          </button>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="card mb-4">
        <h3 className="font-semibold text-sm mb-3">Season Stats</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="font-display text-2xl text-gold">{seasonStats.games}</div>
            <div className="text-xs text-white/50">Games</div>
          </div>
          <div>
            <div className="font-display text-2xl text-green-400">${seasonStats.prizePools.toLocaleString()}</div>
            <div className="text-xs text-white/50">Prize Pools</div>
          </div>
          <div>
            <div className="font-display text-2xl text-white">{members.filter(m => m.status === 'active').length}</div>
            <div className="text-xs text-white/50">Members</div>
          </div>
        </div>
      </div>

      {/* Invite Code Box */}
      <div className="card mb-4">
        <h3 className="font-semibold text-sm mb-3">Invite Code</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-black/30 rounded-lg px-4 py-3 font-mono text-lg text-gold">{currentLeague?.slug || '...'}</div>
          <button onClick={copyInviteCode} className="btn btn-primary px-4 py-3">{copied ? '✓ Copied' : 'Copy'}</button>
        </div>
        <p className="text-xs text-white/50 mt-2">Share this code with friends to invite them to your league</p>
      </div>

      {/* Members Preview */}
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-sm">Members ({members.filter(m => m.status === 'active').length})</h3>
          <button onClick={() => setShowMembersModal(true)} className="text-gold text-xs">View All →</button>
        </div>
        {loading ? (
          <div className="text-white/50 text-center py-4">Loading...</div>
        ) : (
          <div className="space-y-2">
            {members.filter(m => m.status === 'active').slice(0, 5).map(member => (
              <div key={member.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${getRoleColor(member.role)} flex items-center justify-center font-semibold text-xs`}>
                  {getInitials(member.users?.display_name || member.users?.full_name)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{member.users?.display_name || member.users?.full_name}</div>
                  <div className="text-xs text-white/50 capitalize">{member.role}</div>
                </div>
                <div className="text-gold text-sm">{member.total_points || 0} pts</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showSettingsModal && <LeagueSettingsModal league={currentLeague} onClose={() => setShowSettingsModal(false)} onSave={refreshLeague} />}
      {showMembersModal && <MembersModal members={members} leagueId={currentLeague.id} onClose={() => setShowMembersModal(false)} onUpdate={fetchMembers} />}
      {showPointsModal && <PointsStructureModal league={currentLeague} onClose={() => setShowPointsModal(false)} />}
      {showPayoutsModal && <PayoutStructureModal league={currentLeague} onClose={() => setShowPayoutsModal(false)} />}
      {showBlindsModal && <BlindStructureModal league={currentLeague} onClose={() => setShowBlindsModal(false)} />}
      {showSeasonModal && <SeasonManagerModal league={currentLeague} stats={seasonStats} onClose={() => setShowSeasonModal(false)} />}
      {showBalancesModal && <PlayerBalancesModal members={members} leagueId={currentLeague.id} onClose={() => setShowBalancesModal(false)} />}
    </div>
  )
}

// League Settings Modal
function LeagueSettingsModal({ league, onClose, onSave }) {
  const [name, setName] = useState(league?.name || '')
  const [buyIn, setBuyIn] = useState(league?.default_buy_in || 20)
  const [rebuy, setRebuy] = useState(league?.default_rebuy_cost || 20)
  const [bounty, setBounty] = useState(league?.bounty_amount || 5)
  const [maxPlayers, setMaxPlayers] = useState(league?.max_players_per_game || 10)
  const [allowRebuys, setAllowRebuys] = useState(league?.allow_rebuys !== false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('leagues').update({
      name, default_buy_in: buyIn, default_rebuy_cost: rebuy, bounty_amount: bounty,
      max_players_per_game: maxPlayers, allow_rebuys: allowRebuys
    }).eq('id', league.id)
    setSaving(false)
    onSave?.()
    onClose()
  }

  return (
    <Modal title="⚙️ League Settings" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-white/60 mb-1">League Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-white/60 mb-1">Default Buy-in</label>
            <input type="number" value={buyIn} onChange={(e) => setBuyIn(Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Rebuy Cost</label>
            <input type="number" value={rebuy} onChange={(e) => setRebuy(Number(e.target.value))} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-white/60 mb-1">Bounty Amount</label>
            <input type="number" value={bounty} onChange={(e) => setBounty(Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Max Players</label>
            <input type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} className="input" />
          </div>
        </div>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={allowRebuys} onChange={(e) => setAllowRebuys(e.target.checked)} className="w-5 h-5 rounded" />
          <span className="text-sm">Allow Rebuys</span>
        </label>
        <button onClick={handleSave} disabled={saving} className="w-full btn btn-primary py-3">{saving ? 'Saving...' : 'Save Settings'}</button>
      </div>
    </Modal>
  )
}

// Members Modal
function MembersModal({ members, leagueId, onClose, onUpdate }) {
  const [search, setSearch] = useState('')

  const updateRole = async (memberId, newRole) => {
    await supabase.from('league_members').update({ role: newRole }).eq('id', memberId)
    onUpdate?.()
  }

  const removeMember = async (memberId) => {
    if (!confirm('Remove this member from the league?')) return
    await supabase.from('league_members').update({ status: 'inactive' }).eq('id', memberId)
    onUpdate?.()
  }

  const filtered = members.filter(m => {
    const name = (m.users?.display_name || m.users?.full_name || '').toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const getRoleColor = (role) => role === 'owner' ? 'bg-gold text-felt-dark' : role === 'admin' ? 'bg-chip-blue' : 'bg-green-600'

  return (
    <Modal title="👥 Manage Members" onClose={onClose}>
      <input type="text" placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="input mb-4" />
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {filtered.map(member => (
          <div key={member.id} className="card flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${getRoleColor(member.role)} flex items-center justify-center font-semibold text-sm`}>
              {getInitials(member.users?.display_name || member.users?.full_name)}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{member.users?.display_name || member.users?.full_name}</div>
              <div className="text-xs text-white/50">{member.users?.email}</div>
            </div>
            {member.role !== 'owner' && (
              <div className="flex gap-2">
                <select value={member.role} onChange={(e) => updateRole(member.id, e.target.value)} className="input text-xs py-1 px-2">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={() => removeMember(member.id)} className="text-red-400 text-xs px-2">✕</button>
              </div>
            )}
            {member.role === 'owner' && <span className="text-gold text-xs">Owner</span>}
          </div>
        ))}
      </div>
    </Modal>
  )
}

// Points Structure Modal
function PointsStructureModal({ league, onClose }) {
  const [points, setPoints] = useState([
    { position: 1, points: 25, label: '1st Place' },
    { position: 2, points: 18, label: '2nd Place' },
    { position: 3, points: 15, label: '3rd Place' },
    { position: 4, points: 12, label: '4th Place' },
    { position: 5, points: 10, label: '5th Place' },
    { position: 6, points: 8, label: '6th Place' },
    { position: 7, points: 6, label: '7th Place' },
    { position: 8, points: 4, label: '8th Place' },
    { position: 9, points: 2, label: '9th Place' },
    { position: 10, points: 1, label: '10th Place' },
  ])
  const [bonusPoints, setBonusPoints] = useState({ participation: 1, bounty: 2 })

  const updatePoints = (idx, value) => {
    const updated = [...points]
    updated[idx].points = Number(value)
    setPoints(updated)
  }

  return (
    <Modal title="📊 Points Structure" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {points.map((p, idx) => (
            <div key={p.position} className="flex items-center gap-3">
              <span className="text-sm text-white/60 w-24">{p.label}</span>
              <input type="number" value={p.points} onChange={(e) => updatePoints(idx, e.target.value)} className="input flex-1 text-center" />
              <span className="text-xs text-white/40">pts</span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-sm font-semibold mb-2">Bonus Points</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/60">Participation</label>
              <input type="number" value={bonusPoints.participation} onChange={(e) => setBonusPoints({...bonusPoints, participation: Number(e.target.value)})} className="input" />
            </div>
            <div>
              <label className="text-xs text-white/60">Per Bounty</label>
              <input type="number" value={bonusPoints.bounty} onChange={(e) => setBonusPoints({...bonusPoints, bounty: Number(e.target.value)})} className="input" />
            </div>
          </div>
        </div>
        <button className="w-full btn btn-primary py-3">Save Points Structure</button>
      </div>
    </Modal>
  )
}

// Payout Structure Modal
function PayoutStructureModal({ league, onClose }) {
  const [payouts, setPayouts] = useState([
    { players: '2-3', first: 100, second: 0, third: 0 },
    { players: '4-5', first: 70, second: 30, third: 0 },
    { players: '6-7', first: 60, second: 30, third: 10 },
    { players: '8-9', first: 50, second: 30, third: 20 },
    { players: '10+', first: 50, second: 30, third: 20 },
  ])

  return (
    <Modal title="💰 Payout Structure" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-white/60">Set prize distribution percentages by number of players:</p>
        <div className="space-y-3">
          {payouts.map((payout, idx) => (
            <div key={payout.players} className="card">
              <div className="text-sm font-semibold mb-2">{payout.players} Players</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-white/50">1st</label>
                  <div className="flex items-center gap-1">
                    <input type="number" value={payout.first} onChange={(e) => {
                      const updated = [...payouts]
                      updated[idx].first = Number(e.target.value)
                      setPayouts(updated)
                    }} className="input text-center" />
                    <span className="text-xs">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/50">2nd</label>
                  <div className="flex items-center gap-1">
                    <input type="number" value={payout.second} onChange={(e) => {
                      const updated = [...payouts]
                      updated[idx].second = Number(e.target.value)
                      setPayouts(updated)
                    }} className="input text-center" />
                    <span className="text-xs">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/50">3rd</label>
                  <div className="flex items-center gap-1">
                    <input type="number" value={payout.third} onChange={(e) => {
                      const updated = [...payouts]
                      updated[idx].third = Number(e.target.value)
                      setPayouts(updated)
                    }} className="input text-center" />
                    <span className="text-xs">%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full btn btn-primary py-3">Save Payouts</button>
      </div>
    </Modal>
  )
}

// Blind Structure Modal
function BlindStructureModal({ league, onClose }) {
  const [levels, setLevels] = useState([
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
  ])

  const updateLevel = (idx, field, value) => {
    const updated = [...levels]
    updated[idx][field] = Number(value)
    setLevels(updated)
  }

  const addLevel = () => {
    const last = levels[levels.length - 1]
    setLevels([...levels, {
      level: levels.length + 1,
      sb: last.sb * 1.5,
      bb: last.bb * 1.5,
      ante: last.ante * 1.5,
      duration: 15
    }])
  }

  return (
    <Modal title="⏱️ Blind Structure" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-2 text-xs text-white/50 font-medium">
          <div>Level</div><div>SB</div><div>BB</div><div>Ante</div><div>Min</div>
        </div>
        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {levels.map((level, idx) => (
            <div key={level.level} className="grid grid-cols-5 gap-2">
              <div className="flex items-center justify-center text-gold font-bold">{level.level}</div>
              <input type="number" value={level.sb} onChange={(e) => updateLevel(idx, 'sb', e.target.value)} className="input text-center text-sm py-1" />
              <input type="number" value={level.bb} onChange={(e) => updateLevel(idx, 'bb', e.target.value)} className="input text-center text-sm py-1" />
              <input type="number" value={level.ante} onChange={(e) => updateLevel(idx, 'ante', e.target.value)} className="input text-center text-sm py-1" />
              <input type="number" value={level.duration} onChange={(e) => updateLevel(idx, 'duration', e.target.value)} className="input text-center text-sm py-1" />
            </div>
          ))}
        </div>
        <button onClick={addLevel} className="w-full py-2 border border-dashed border-white/20 rounded-lg text-white/50 text-sm">+ Add Level</button>
        <button className="w-full btn btn-primary py-3">Save Blind Structure</button>
      </div>
    </Modal>
  )
}

// Season Manager Modal
function SeasonManagerModal({ league, stats, onClose }) {
  const currentYear = new Date().getFullYear()
  
  return (
    <Modal title="🏆 Season Manager" onClose={onClose}>
      <div className="space-y-4">
        <div className="card card-gold text-center">
          <div className="text-xs text-gold uppercase">Current Season</div>
          <div className="font-display text-2xl text-white">{currentYear}</div>
          <div className="text-sm text-white/60 mt-2">{stats.games} games • ${stats.prizePools.toLocaleString()} in prizes</div>
        </div>
        
        <div className="card">
          <h4 className="font-semibold mb-2">Season Actions</h4>
          <div className="space-y-2">
            <button className="w-full btn btn-secondary py-2 text-left flex items-center gap-3">
              <span>📊</span> Export Season Stats
            </button>
            <button className="w-full btn btn-secondary py-2 text-left flex items-center gap-3">
              <span>🏆</span> Award Season Trophies
            </button>
            <button className="w-full bg-red-600/20 border border-red-500/30 py-2 px-4 rounded-lg text-red-400 text-left flex items-center gap-3">
              <span>🔒</span> Close Season & Archive
            </button>
          </div>
        </div>

        <div className="text-xs text-white/40 text-center">
          Closing a season will archive all stats and start fresh for the new year.
        </div>
      </div>
    </Modal>
  )
}

// Player Balances Modal
function PlayerBalancesModal({ members, leagueId, onClose }) {
  const [balances, setBalances] = useState(members.map(m => ({ ...m, balance: 0, dues: 0 })))

  const updateBalance = (idx, field, value) => {
    const updated = [...balances]
    updated[idx][field] = Number(value)
    setBalances(updated)
  }

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <Modal title="💳 Player Balances" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-white/60">Track league dues and credits for each player:</p>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {balances.filter(m => m.status === 'active').map((member, idx) => (
            <div key={member.id} className="card flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-chip-blue flex items-center justify-center text-xs font-semibold">
                {getInitials(member.users?.display_name || member.users?.full_name)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{member.users?.display_name || member.users?.full_name}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">$</span>
                <input type="number" value={member.balance} onChange={(e) => updateBalance(idx, 'balance', e.target.value)} 
                  className={`input w-20 text-center text-sm ${member.balance >= 0 ? 'text-green-400' : 'text-red-400'}`} />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Total Outstanding:</span>
            <span className={balances.reduce((sum, b) => sum + (b.balance || 0), 0) >= 0 ? 'text-green-400' : 'text-red-400'}>
              ${Math.abs(balances.reduce((sum, b) => sum + (b.balance || 0), 0))}
            </span>
          </div>
        </div>
        <button className="w-full btn btn-primary py-3">Save Balances</button>
      </div>
    </Modal>
  )
}

// Reusable Modal Component
function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-felt-dark rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-xl text-gold">{title}</h2>
          <button onClick={onClose} className="text-white/60 text-2xl">&times;</button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
