import { useState, useEffect } from 'react'
import { useLeague } from '../../contexts/LeagueContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

// Default roles to create for new leagues
const DEFAULT_ROLES = [
  { name: 'Owner', slug: 'owner', emoji: '👑', max_assignees: 1, is_system_role: true, can_pause_timer: true, can_start_game: true, can_manage_rebuys: true, can_eliminate_players: true, can_manage_money: true, can_edit_settings: true, can_manage_members: true, display_order: 0 },
  { name: 'Admin', slug: 'admin', emoji: '⭐', max_assignees: null, is_system_role: true, can_pause_timer: true, can_start_game: true, can_manage_rebuys: true, can_eliminate_players: true, can_manage_money: true, can_edit_settings: true, can_manage_members: true, display_order: 1 },
  { name: 'Accountant', slug: 'accountant', emoji: '📊', max_assignees: 1, is_system_role: false, can_pause_timer: false, can_start_game: false, can_manage_rebuys: false, can_eliminate_players: false, can_manage_money: true, can_edit_settings: false, can_manage_members: false, display_order: 2 },
  { name: 'Sergeant at Arms', slug: 'sergeant-at-arms', emoji: '🛡️', max_assignees: 1, is_system_role: false, can_pause_timer: true, can_start_game: true, can_manage_rebuys: true, can_eliminate_players: true, can_manage_money: false, can_edit_settings: false, can_manage_members: false, display_order: 3 },
  { name: 'Dealer', slug: 'dealer', emoji: '🃏', max_assignees: null, is_system_role: false, can_pause_timer: true, can_start_game: false, can_manage_rebuys: false, can_eliminate_players: false, can_manage_money: false, can_edit_settings: false, can_manage_members: false, display_order: 4 },
  { name: 'Rebuy Handler', slug: 'rebuy-handler', emoji: '🔄', max_assignees: null, is_system_role: false, can_pause_timer: false, can_start_game: false, can_manage_rebuys: true, can_eliminate_players: false, can_manage_money: false, can_edit_settings: false, can_manage_members: false, display_order: 5 },
]

export default function AdminTab() {
  const { currentLeague, refreshLeague } = useLeague()
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [roles, setRoles] = useState([])
  const [roleAssignments, setRoleAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [seasonStats, setSeasonStats] = useState({ games: 0, prizePools: 0 })
  const [seasonPot, setSeasonPot] = useState(null)
  
  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showRolesModal, setShowRolesModal] = useState(false)
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [showPayoutsModal, setShowPayoutsModal] = useState(false)
  const [showBlindsModal, setShowBlindsModal] = useState(false)
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [showBalancesModal, setShowBalancesModal] = useState(false)
  const [showDuesModal, setShowDuesModal] = useState(false)
  const [showPotModal, setShowPotModal] = useState(false)

  useEffect(() => {
    if (currentLeague) {
      fetchMembers()
      fetchRoles()
      fetchSeasonStats()
      fetchSeasonPot()
    }
  }, [currentLeague])

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('league_members')
      .select(`id, user_id, role, status, member_type, dues_paid, dues_paid_date, guest_buyins_count, guest_fees_paid, big_game_eligible, games_played, total_wins, total_points, total_bounties, joined_at, users (id, full_name, display_name, email)`)
      .eq('league_id', currentLeague.id)
      .order('member_type', { ascending: false })
      .order('role', { ascending: true })
    
    if (!error && data) setMembers(data)
    setLoading(false)
  }

  const fetchRoles = async () => {
    // Try to fetch existing roles
    let { data: existingRoles } = await supabase
      .from('league_roles')
      .select('*')
      .eq('league_id', currentLeague.id)
      .order('display_order', { ascending: true })

    // If no roles exist, create defaults
    if (!existingRoles || existingRoles.length === 0) {
      const rolesToInsert = DEFAULT_ROLES.map(r => ({ ...r, league_id: currentLeague.id }))
      const { data: newRoles } = await supabase
        .from('league_roles')
        .insert(rolesToInsert)
        .select()
      existingRoles = newRoles || []
    }

    setRoles(existingRoles)

    // Fetch role assignments
    const { data: assignments } = await supabase
      .from('member_role_assignments')
      .select('*')
      .eq('league_id', currentLeague.id)

    setRoleAssignments(assignments || [])
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

  const fetchSeasonPot = async () => {
    const currentYear = new Date().getFullYear()
    const { data } = await supabase
      .from('season_pot')
      .select('*')
      .eq('league_id', currentLeague.id)
      .eq('season_year', currentYear)
      .single()
    setSeasonPot(data)
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

  const getRoleColor = (role, memberType) => {
    if (role === 'owner') return 'bg-gold text-felt-dark'
    if (role === 'admin') return 'bg-chip-blue'
    if (memberType === 'paid') return 'bg-green-600'
    return 'bg-gray-500'
  }

  const getMemberRoles = (userId) => {
    return roleAssignments
      .filter(a => a.user_id === userId)
      .map(a => roles.find(r => r.id === a.role_id))
      .filter(Boolean)
  }

  const paidMembers = members.filter(m => m.status === 'active' && m.member_type === 'paid')
  const guestMembers = members.filter(m => m.status === 'active' && m.member_type === 'guest')
  const eligibleGuests = guestMembers.filter(m => m.big_game_eligible || (m.guest_buyins_count || 0) >= (currentLeague?.guest_buyins_for_eligibility || 5))
  const specialRoles = roles.filter(r => !r.is_system_role)

  const adminTiles = [
    { id: 'settings', icon: '⚙️', title: 'League Settings', desc: 'Name, buy-ins, rules', onClick: () => setShowSettingsModal(true) },
    { id: 'members', icon: '👥', title: 'Manage Members', desc: `${paidMembers.length} paid, ${guestMembers.length} guests`, onClick: () => setShowMembersModal(true) },
    { id: 'roles', icon: '🎭', title: 'Roles & Permissions', desc: `${specialRoles.length} custom roles`, onClick: () => setShowRolesModal(true) },
    { id: 'dues', icon: '💵', title: 'Dues & Fees', desc: `$${currentLeague?.annual_dues || 50} annual`, onClick: () => setShowDuesModal(true) },
    { id: 'pot', icon: '🎱', title: 'Season Pot', desc: `$${seasonPot?.total_pot || 0} accumulated`, onClick: () => setShowPotModal(true) },
    { id: 'invite', icon: '🔗', title: 'Invite Code', desc: currentLeague?.slug || '...', onClick: copyInviteCode },
    { id: 'points', icon: '📊', title: 'Points Structure', desc: 'Scoring settings', onClick: () => setShowPointsModal(true) },
    { id: 'payouts', icon: '💰', title: 'Payout Structure', desc: 'Prize distribution', onClick: () => setShowPayoutsModal(true) },
    { id: 'blinds', icon: '⏱️', title: 'Blind Structure', desc: 'Timer levels', onClick: () => setShowBlindsModal(true) },
    { id: 'season', icon: '🏆', title: 'Season Manager', desc: 'View & close season', onClick: () => setShowSeasonModal(true) },
  ]

  return (
    <div className="px-4 py-4">
      <h2 className="font-display text-xl text-gold mb-4">Admin Panel</h2>

      {/* Member Summary Card */}
      <div className="card card-gold mb-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs text-gold uppercase tracking-wider">Membership</div>
            <div className="font-display text-lg text-white">{paidMembers.length} Paid Members</div>
            <div className="text-sm text-white/60">{guestMembers.length} Guests ({eligibleGuests.length} eligible)</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/50">Season Pot</div>
            <div className="font-display text-2xl text-gold">${seasonPot?.total_pot || 0}</div>
          </div>
        </div>
      </div>

      {/* Admin tiles grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {adminTiles.map(tile => (
          <button key={tile.id} className="card text-left hover:bg-white/5 transition-colors relative" onClick={tile.onClick}>
            <div className="text-2xl mb-2">{tile.icon}</div>
            <div className="font-semibold text-sm text-white">{tile.title}</div>
            <div className="text-xs text-white/50">{tile.desc}</div>
            {tile.id === 'invite' && copied && <div className="absolute top-2 right-2 text-xs text-green-400">Copied!</div>}
          </button>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="card mb-4">
        <h3 className="font-semibold text-sm mb-3">Season Stats</h3>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div><div className="font-display text-xl text-gold">{seasonStats.games}</div><div className="text-xs text-white/50">Games</div></div>
          <div><div className="font-display text-xl text-green-400">${seasonStats.prizePools.toLocaleString()}</div><div className="text-xs text-white/50">Prizes</div></div>
          <div><div className="font-display text-xl text-white">{paidMembers.length}</div><div className="text-xs text-white/50">Paid</div></div>
          <div><div className="font-display text-xl text-white/60">{guestMembers.length}</div><div className="text-xs text-white/50">Guests</div></div>
        </div>
      </div>

      {/* Role Holders Quick View */}
      {specialRoles.some(r => roleAssignments.some(a => a.role_id === r.id)) && (
        <div className="card mb-4">
          <h3 className="font-semibold text-sm mb-3">🎭 Role Holders</h3>
          <div className="flex flex-wrap gap-2">
            {specialRoles.map(role => {
              const holders = roleAssignments
                .filter(a => a.role_id === role.id)
                .map(a => members.find(m => m.user_id === a.user_id))
                .filter(Boolean)
              
              if (holders.length === 0) return null
              
              return (
                <div key={role.id} className="bg-white/5 rounded-lg px-3 py-2">
                  <div className="text-xs text-white/50 mb-1">{role.emoji} {role.name}</div>
                  <div className="text-sm">
                    {holders.map(h => h.users?.display_name || h.users?.full_name).join(', ')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Members Preview */}
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-sm">Members</h3>
          <button onClick={() => setShowMembersModal(true)} className="text-gold text-xs">Manage →</button>
        </div>
        {loading ? (
          <div className="text-white/50 text-center py-4">Loading...</div>
        ) : (
          <div className="space-y-2">
            {members.filter(m => m.status === 'active').slice(0, 6).map(member => {
              const memberRoles = getMemberRoles(member.user_id)
              return (
                <div key={member.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${getRoleColor(member.role, member.member_type)} flex items-center justify-center font-semibold text-xs`}>
                    {getInitials(member.users?.display_name || member.users?.full_name)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {member.users?.display_name || member.users?.full_name}
                      {memberRoles.map(r => <span key={r.id} title={r.name}>{r.emoji}</span>)}
                    </div>
                    <div className="text-xs text-white/50">
                      {member.member_type === 'paid' ? '✓ Paid' : `Guest (${member.guest_buyins_count || 0}/${currentLeague?.guest_buyins_for_eligibility || 5})`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showSettingsModal && <LeagueSettingsModal league={currentLeague} onClose={() => setShowSettingsModal(false)} onSave={refreshLeague} />}
      {showMembersModal && <MembersModal members={members} roles={roles} roleAssignments={roleAssignments} league={currentLeague} onClose={() => setShowMembersModal(false)} onUpdate={() => { fetchMembers(); fetchRoles(); }} />}
      {showRolesModal && <RolesModal roles={roles} members={members} roleAssignments={roleAssignments} leagueId={currentLeague.id} onClose={() => setShowRolesModal(false)} onUpdate={fetchRoles} />}
      {showDuesModal && <DuesModal members={members} league={currentLeague} onClose={() => setShowDuesModal(false)} onUpdate={() => { fetchMembers(); fetchSeasonPot(); }} />}
      {showPotModal && <SeasonPotModal league={currentLeague} pot={seasonPot} onClose={() => setShowPotModal(false)} onUpdate={fetchSeasonPot} />}
      {showPointsModal && <PointsStructureModal league={currentLeague} onClose={() => setShowPointsModal(false)} />}
      {showPayoutsModal && <PayoutStructureModal league={currentLeague} onClose={() => setShowPayoutsModal(false)} />}
      {showBlindsModal && <BlindStructureModal league={currentLeague} onClose={() => setShowBlindsModal(false)} />}
      {showSeasonModal && <SeasonManagerModal league={currentLeague} stats={seasonStats} pot={seasonPot} onClose={() => setShowSeasonModal(false)} />}
    </div>
  )
}

// ========== ROLES MODAL ==========
function RolesModal({ roles, members, roleAssignments, leagueId, onClose, onUpdate }) {
  const [selectedRole, setSelectedRole] = useState(null)
  const [showAddRole, setShowAddRole] = useState(false)
  const customRoles = roles.filter(r => !r.is_system_role)

  const assignRole = async (userId, roleId) => {
    const role = roles.find(r => r.id === roleId)
    
    // Check max assignees
    if (role?.max_assignees === 1) {
      // Remove existing assignment for this role
      await supabase.from('member_role_assignments').delete().eq('league_id', leagueId).eq('role_id', roleId)
    }
    
    // Check if already assigned
    const existing = roleAssignments.find(a => a.user_id === userId && a.role_id === roleId)
    if (existing) return

    await supabase.from('member_role_assignments').insert({
      league_id: leagueId, user_id: userId, role_id: roleId
    })
    onUpdate?.()
  }

  const removeAssignment = async (userId, roleId) => {
    await supabase.from('member_role_assignments').delete()
      .eq('league_id', leagueId).eq('user_id', userId).eq('role_id', roleId)
    onUpdate?.()
  }

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <Modal title="🎭 Roles & Permissions" onClose={onClose}>
      <div className="space-y-4">
        {/* Role list */}
        <div className="space-y-2">
          {customRoles.map(role => {
            const holders = roleAssignments
              .filter(a => a.role_id === role.id)
              .map(a => members.find(m => m.user_id === a.user_id))
              .filter(Boolean)

            return (
              <div key={role.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{role.emoji}</span>
                    <div>
                      <div className="font-semibold text-sm">{role.name}</div>
                      <div className="text-xs text-white/50">
                        {role.max_assignees === 1 ? 'Single holder' : 'Multiple allowed'}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedRole(selectedRole?.id === role.id ? null : role)} className="text-gold text-xs">
                    {selectedRole?.id === role.id ? 'Close' : 'Edit'}
                  </button>
                </div>

                {/* Current holders */}
                {holders.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {holders.map(holder => (
                      <div key={holder.id} className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
                        <div className="w-5 h-5 rounded-full bg-chip-blue flex items-center justify-center text-[10px]">
                          {getInitials(holder.users?.display_name || holder.users?.full_name)}
                        </div>
                        <span className="text-xs">{holder.users?.display_name || holder.users?.full_name}</span>
                        <button onClick={() => removeAssignment(holder.user_id, role.id)} className="text-red-400 ml-1">×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Assign dropdown */}
                {selectedRole?.id === role.id && (
                  <div className="border-t border-white/10 pt-2 mt-2">
                    <div className="text-xs text-white/50 mb-2">Assign to:</div>
                    <div className="space-y-1 max-h-[30vh] overflow-y-auto">
                      {members.filter(m => m.status === 'active' && !holders.some(h => h.user_id === m.user_id)).map(member => (
                        <button key={member.id} onClick={() => assignRole(member.user_id, role.id)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-left">
                          <div className="w-6 h-6 rounded-full bg-chip-blue flex items-center justify-center text-[10px]">
                            {getInitials(member.users?.display_name || member.users?.full_name)}
                          </div>
                          <span className="text-sm">{member.users?.display_name || member.users?.full_name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Permissions display */}
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-xs text-white/50 mb-2">Permissions:</div>
                      <div className="flex flex-wrap gap-1">
                        {role.can_pause_timer && <span className="text-xs bg-white/10 px-2 py-1 rounded">⏸ Pause Timer</span>}
                        {role.can_start_game && <span className="text-xs bg-white/10 px-2 py-1 rounded">🎲 Start Game</span>}
                        {role.can_manage_rebuys && <span className="text-xs bg-white/10 px-2 py-1 rounded">🔄 Rebuys</span>}
                        {role.can_eliminate_players && <span className="text-xs bg-white/10 px-2 py-1 rounded">💀 Eliminate</span>}
                        {role.can_manage_money && <span className="text-xs bg-white/10 px-2 py-1 rounded">💰 Money</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Add custom role */}
        {showAddRole ? (
          <AddRoleForm leagueId={leagueId} onClose={() => setShowAddRole(false)} onSave={() => { setShowAddRole(false); onUpdate?.(); }} />
        ) : (
          <button onClick={() => setShowAddRole(true)} className="w-full py-3 border border-dashed border-white/20 rounded-xl text-white/50">
            + Add Custom Role
          </button>
        )}
      </div>
    </Modal>
  )
}

function AddRoleForm({ leagueId, onClose, onSave }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🎯')
  const [maxAssignees, setMaxAssignees] = useState('unlimited')
  const [permissions, setPermissions] = useState({
    can_pause_timer: false, can_start_game: false, can_manage_rebuys: false,
    can_eliminate_players: false, can_manage_money: false, can_edit_settings: false, can_manage_members: false
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    
    const { data: existing } = await supabase.from('league_roles').select('display_order').eq('league_id', leagueId).order('display_order', { ascending: false }).limit(1)
    const nextOrder = (existing?.[0]?.display_order || 0) + 1

    await supabase.from('league_roles').insert({
      league_id: leagueId,
      name: name.trim(),
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      emoji,
      max_assignees: maxAssignees === 'unlimited' ? null : 1,
      is_system_role: false,
      display_order: nextOrder,
      ...permissions
    })

    setSaving(false)
    onSave?.()
  }

  return (
    <div className="card border border-gold/30">
      <h4 className="font-semibold mb-3">New Role</h4>
      <div className="space-y-3">
        <div className="flex gap-2">
          <input type="text" placeholder="Role name" value={name} onChange={(e) => setName(e.target.value)} className="input flex-1" />
          <select value={emoji} onChange={(e) => setEmoji(e.target.value)} className="input w-16 text-center">
            {['🎯', '🛡️', '🃏', '💼', '🎖️', '🔧', '📋', '🎪'].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <select value={maxAssignees} onChange={(e) => setMaxAssignees(e.target.value)} className="input">
          <option value="unlimited">Multiple people allowed</option>
          <option value="single">Single person only</option>
        </select>
        <div>
          <div className="text-xs text-white/50 mb-2">Permissions</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'can_pause_timer', label: '⏸ Pause Timer' },
              { key: 'can_start_game', label: '🎲 Start Game' },
              { key: 'can_manage_rebuys', label: '🔄 Handle Rebuys' },
              { key: 'can_eliminate_players', label: '💀 Eliminate' },
              { key: 'can_manage_money', label: '💰 Manage Money' },
            ].map(p => (
              <label key={p.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={permissions[p.key]} onChange={(e) => setPermissions({...permissions, [p.key]: e.target.checked})} className="rounded" />
                {p.label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 btn btn-secondary py-2">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1 btn btn-primary py-2 disabled:opacity-50">
            {saving ? 'Saving...' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ========== MEMBERS MODAL (Updated) ==========
function MembersModal({ members, roles, roleAssignments, league, onClose, onUpdate }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedMember, setSelectedMember] = useState(null)

  const updateMemberType = async (memberId, newType) => {
    await supabase.from('league_members').update({ member_type: newType, big_game_eligible: newType === 'paid' }).eq('id', memberId)
    onUpdate?.()
  }

  const updateRole = async (memberId, newRole) => {
    await supabase.from('league_members').update({ role: newRole }).eq('id', memberId)
    onUpdate?.()
  }

  const removeMember = async (memberId) => {
    if (!confirm('Remove this member from the league?')) return
    await supabase.from('league_members').update({ status: 'inactive' }).eq('id', memberId)
    onUpdate?.()
  }

  const getMemberRoles = (userId) => {
    return roleAssignments
      .filter(a => a.user_id === userId)
      .map(a => roles.find(r => r.id === a.role_id))
      .filter(Boolean)
  }

  const filtered = members.filter(m => {
    if (m.status !== 'active') return false
    const name = (m.users?.display_name || m.users?.full_name || '').toLowerCase()
    const matchesSearch = name.includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || m.member_type === filter
    return matchesSearch && matchesFilter
  })

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const getRoleColor = (role, memberType) => role === 'owner' ? 'bg-gold text-felt-dark' : role === 'admin' ? 'bg-chip-blue' : memberType === 'paid' ? 'bg-green-600' : 'bg-gray-500'

  return (
    <Modal title="👥 Manage Members" onClose={onClose}>
      <div className="flex gap-2 mb-4">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="input flex-1" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-28">
          <option value="all">All</option>
          <option value="paid">Paid</option>
          <option value="guest">Guests</option>
        </select>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filtered.map(member => {
          const memberRoles = getMemberRoles(member.user_id)
          const isExpanded = selectedMember?.id === member.id
          
          return (
            <div key={member.id} className="card">
              <button onClick={() => setSelectedMember(isExpanded ? null : member)} className="w-full flex items-center gap-3 text-left">
                <div className={`w-10 h-10 rounded-full ${getRoleColor(member.role, member.member_type)} flex items-center justify-center font-semibold text-sm`}>
                  {getInitials(member.users?.display_name || member.users?.full_name)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {member.users?.display_name || member.users?.full_name}
                    {memberRoles.map(r => <span key={r.id} title={r.name}>{r.emoji}</span>)}
                  </div>
                  <div className="text-xs text-white/50">
                    {member.member_type === 'paid' ? <span className="text-green-400">✓ Paid</span> : <span>Guest • {member.guest_buyins_count || 0}/{league?.guest_buyins_for_eligibility || 5}</span>}
                    {member.big_game_eligible && <span className="text-gold ml-2">🎱</span>}
                  </div>
                </div>
                <span className="text-white/40">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && member.role !== 'owner' && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-white/50 mb-1 block">Member Type</label>
                      <select value={member.member_type || 'guest'} onChange={(e) => updateMemberType(member.id, e.target.value)} className="input text-sm">
                        <option value="guest">Guest</option>
                        <option value="paid">Paid Member</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-white/50 mb-1 block">Access Level</label>
                      <select value={member.role} onChange={(e) => updateRole(member.id, e.target.value)} className="input text-sm">
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  {memberRoles.length > 0 && (
                    <div>
                      <label className="text-xs text-white/50 mb-1 block">Assigned Roles</label>
                      <div className="flex flex-wrap gap-1">
                        {memberRoles.map(r => (
                          <span key={r.id} className="bg-white/10 px-2 py-1 rounded text-xs">{r.emoji} {r.name}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => removeMember(member.id)} className="text-red-400 text-xs">Remove from league</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

// ========== OTHER MODALS (keeping them compact) ==========
function LeagueSettingsModal({ league, onClose, onSave }) {
  const [name, setName] = useState(league?.name || '')
  const [buyIn, setBuyIn] = useState(league?.default_buy_in || 20)
  const [rebuy, setRebuy] = useState(league?.default_rebuy_cost || 20)
  const [bounty, setBounty] = useState(league?.bounty_amount || 5)
  const [maxPlayers, setMaxPlayers] = useState(league?.max_players_per_game || 10)
  const [allowRebuys, setAllowRebuys] = useState(league?.allow_rebuys !== false)
  const [annualDues, setAnnualDues] = useState(league?.annual_dues || 50)
  const [guestFee, setGuestFee] = useState(league?.guest_fee || 10)
  const [guestBuyinsRequired, setGuestBuyinsRequired] = useState(league?.guest_buyins_for_eligibility || 5)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('leagues').update({ name, default_buy_in: buyIn, default_rebuy_cost: rebuy, bounty_amount: bounty, max_players_per_game: maxPlayers, allow_rebuys: allowRebuys, annual_dues: annualDues, guest_fee: guestFee, guest_buyins_for_eligibility: guestBuyinsRequired }).eq('id', league.id)
    setSaving(false); onSave?.(); onClose()
  }

  return (
    <Modal title="⚙️ League Settings" onClose={onClose}>
      <div className="space-y-4">
        <div><label className="block text-sm text-white/60 mb-1">League Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" /></div>
        <div className="border-t border-white/10 pt-4"><h4 className="text-sm font-semibold mb-3">Game Settings</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-white/60 mb-1">Buy-in</label><input type="number" value={buyIn} onChange={(e) => setBuyIn(Number(e.target.value))} className="input" /></div>
            <div><label className="block text-xs text-white/60 mb-1">Rebuy</label><input type="number" value={rebuy} onChange={(e) => setRebuy(Number(e.target.value))} className="input" /></div>
            <div><label className="block text-xs text-white/60 mb-1">Bounty</label><input type="number" value={bounty} onChange={(e) => setBounty(Number(e.target.value))} className="input" /></div>
            <div><label className="block text-xs text-white/60 mb-1">Max Players</label><input type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} className="input" /></div>
          </div>
          <label className="flex items-center gap-3 mt-3"><input type="checkbox" checked={allowRebuys} onChange={(e) => setAllowRebuys(e.target.checked)} className="w-5 h-5 rounded" /><span className="text-sm">Allow Rebuys</span></label>
        </div>
        <div className="border-t border-white/10 pt-4"><h4 className="text-sm font-semibold mb-3">Membership</h4>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs text-white/60 mb-1">Annual Dues</label><input type="number" value={annualDues} onChange={(e) => setAnnualDues(Number(e.target.value))} className="input" /></div>
            <div><label className="block text-xs text-white/60 mb-1">Guest Fee</label><input type="number" value={guestFee} onChange={(e) => setGuestFee(Number(e.target.value))} className="input" /></div>
            <div><label className="block text-xs text-white/60 mb-1">Buy-ins for Elig.</label><input type="number" value={guestBuyinsRequired} onChange={(e) => setGuestBuyinsRequired(Number(e.target.value))} className="input" /></div>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="w-full btn btn-primary py-3">{saving ? 'Saving...' : 'Save Settings'}</button>
      </div>
    </Modal>
  )
}

function DuesModal({ members, league, onClose, onUpdate }) {
  const [selectedMember, setSelectedMember] = useState(null)
  const [paymentType, setPaymentType] = useState('annual_dues')
  const [amount, setAmount] = useState(league?.annual_dues || 50)
  const [saving, setSaving] = useState(false)
  const currentYear = new Date().getFullYear()

  const recordPayment = async () => {
    if (!selectedMember) return; setSaving(true)
    await supabase.from('dues_payments').insert({ league_id: league.id, user_id: selectedMember.users.id, season_year: currentYear, amount, payment_type: paymentType })
    if (paymentType === 'annual_dues') {
      await supabase.from('league_members').update({ member_type: 'paid', dues_paid: amount, dues_paid_date: new Date().toISOString(), big_game_eligible: true }).eq('id', selectedMember.id)
    } else {
      const newCount = (selectedMember.guest_buyins_count || 0) + 1
      await supabase.from('league_members').update({ guest_buyins_count: newCount, guest_fees_paid: (selectedMember.guest_fees_paid || 0) + amount, big_game_eligible: newCount >= (league?.guest_buyins_for_eligibility || 5) }).eq('id', selectedMember.id)
    }
    const { data: pot } = await supabase.from('season_pot').select('*').eq('league_id', league.id).eq('season_year', currentYear).single()
    if (pot) { const updates = paymentType === 'annual_dues' ? { dues_collected: (pot.dues_collected || 0) + amount, dues_remaining: (pot.dues_remaining || 0) + amount } : { guest_fees_collected: (pot.guest_fees_collected || 0) + amount }; updates.total_pot = (pot.dues_remaining || 0) + (pot.guest_fees_collected || 0) + amount; await supabase.from('season_pot').update(updates).eq('id', pot.id) }
    else { await supabase.from('season_pot').insert({ league_id: league.id, season_year: currentYear, dues_collected: paymentType === 'annual_dues' ? amount : 0, dues_remaining: paymentType === 'annual_dues' ? amount : 0, guest_fees_collected: paymentType === 'guest_fee' ? amount : 0, total_pot: amount }) }
    setSaving(false); setSelectedMember(null); onUpdate?.()
  }

  const paidMembers = members.filter(m => m.status === 'active' && m.member_type === 'paid')
  const unpaidMembers = members.filter(m => m.status === 'active' && m.member_type !== 'paid')
  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <Modal title="💵 Dues & Fees" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3"><div className="card text-center"><div className="font-display text-2xl text-green-400">{paidMembers.length}</div><div className="text-xs text-white/50">Paid</div></div><div className="card text-center"><div className="font-display text-2xl text-white/60">{unpaidMembers.length}</div><div className="text-xs text-white/50">Unpaid</div></div></div>
        <div className="card"><h4 className="font-semibold text-sm mb-3">Record Payment</h4>
          <div className="space-y-3">
            <select value={selectedMember?.id || ''} onChange={(e) => setSelectedMember(members.find(m => m.id === e.target.value))} className="input"><option value="">Select member...</option>{members.filter(m => m.status === 'active').map(m => <option key={m.id} value={m.id}>{m.users?.display_name || m.users?.full_name} {m.member_type === 'paid' ? '(Paid)' : '(Guest)'}</option>)}</select>
            <div className="grid grid-cols-2 gap-3"><select value={paymentType} onChange={(e) => { setPaymentType(e.target.value); setAmount(e.target.value === 'annual_dues' ? league?.annual_dues || 50 : league?.guest_fee || 10) }} className="input"><option value="annual_dues">Annual Dues</option><option value="guest_fee">Guest Fee</option></select><input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="input" /></div>
            <button onClick={recordPayment} disabled={!selectedMember || saving} className="w-full btn btn-primary py-2 disabled:opacity-50">{saving ? 'Recording...' : 'Record Payment'}</button>
          </div>
        </div>
        {unpaidMembers.length > 0 && <div><h4 className="font-semibold text-sm mb-2">Guests ({unpaidMembers.length})</h4><div className="space-y-2 max-h-[30vh] overflow-y-auto">{unpaidMembers.map(member => <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5"><div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-xs font-semibold">{getInitials(member.users?.display_name || member.users?.full_name)}</div><div className="flex-1"><div className="text-sm">{member.users?.display_name || member.users?.full_name}</div><div className="text-xs text-white/50">{member.guest_buyins_count || 0}/{league?.guest_buyins_for_eligibility || 5} buy-ins</div></div>{(member.guest_buyins_count || 0) >= (league?.guest_buyins_for_eligibility || 5) && <span className="text-xs text-green-400">🎱</span>}</div>)}</div></div>}
      </div>
    </Modal>
  )
}

function SeasonPotModal({ league, pot, onClose, onUpdate }) {
  const [description, setDescription] = useState(''); const [expenseAmount, setExpenseAmount] = useState(''); const [saving, setSaving] = useState(false); const [incidentals, setIncidentals] = useState([])
  const currentYear = new Date().getFullYear()
  useEffect(() => { const fetch = async () => { const { data } = await supabase.from('incidentals_log').select('*').eq('league_id', league.id).eq('season_year', currentYear).order('created_at', { ascending: false }); setIncidentals(data || []) }; fetch() }, [])
  const recordExpense = async () => { if (!description || !expenseAmount) return; setSaving(true); await supabase.from('incidentals_log').insert({ league_id: league.id, season_year: currentYear, description, amount: parseFloat(expenseAmount) }); if (pot) { const newRemaining = (pot.dues_remaining || 0) - parseFloat(expenseAmount); await supabase.from('season_pot').update({ dues_remaining: Math.max(0, newRemaining), incidentals_spent: (pot.incidentals_spent || 0) + parseFloat(expenseAmount), total_pot: Math.max(0, newRemaining) + (pot.guest_fees_collected || 0) }).eq('id', pot.id) }; setDescription(''); setExpenseAmount(''); setSaving(false); const { data } = await supabase.from('incidentals_log').select('*').eq('league_id', league.id).eq('season_year', currentYear).order('created_at', { ascending: false }); setIncidentals(data || []); onUpdate?.() }
  return (
    <Modal title="🎱 Season Pot" onClose={onClose}>
      <div className="space-y-4">
        <div className="card card-gold text-center"><div className="text-xs text-gold uppercase">Big Game Pot</div><div className="font-display text-4xl text-white">${pot?.total_pot || 0}</div></div>
        <div className="grid grid-cols-2 gap-3"><div className="card"><div className="text-xs text-white/50">Dues Collected</div><div className="font-display text-lg text-green-400">${pot?.dues_collected || 0}</div></div><div className="card"><div className="text-xs text-white/50">Incidentals</div><div className="font-display text-lg text-red-400">-${pot?.incidentals_spent || 0}</div></div><div className="card"><div className="text-xs text-white/50">Dues Remaining</div><div className="font-display text-lg text-white">${pot?.dues_remaining || 0}</div></div><div className="card"><div className="text-xs text-white/50">Guest Fees</div><div className="font-display text-lg text-gold">${pot?.guest_fees_collected || 0}</div></div></div>
        <div className="card"><h4 className="font-semibold text-sm mb-3">Record Expense</h4><input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="input mb-2" /><div className="flex gap-2"><input type="number" placeholder="Amount" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="input flex-1" /><button onClick={recordExpense} disabled={!description || !expenseAmount || saving} className="btn btn-primary px-4 disabled:opacity-50">{saving ? '...' : 'Add'}</button></div></div>
        {incidentals.length > 0 && <div><h4 className="font-semibold text-sm mb-2">Expenses</h4><div className="space-y-1 max-h-[20vh] overflow-y-auto">{incidentals.map(inc => <div key={inc.id} className="flex justify-between text-sm p-2 rounded bg-white/5"><span className="text-white/70">{inc.description}</span><span className="text-red-400">-${inc.amount}</span></div>)}</div></div>}
      </div>
    </Modal>
  )
}

function PointsStructureModal({ league, onClose }) {
  const [points, setPoints] = useState([{ position: 1, points: 25 },{ position: 2, points: 18 },{ position: 3, points: 15 },{ position: 4, points: 12 },{ position: 5, points: 10 },{ position: 6, points: 8 },{ position: 7, points: 6 },{ position: 8, points: 4 },{ position: 9, points: 2 },{ position: 10, points: 1 }])
  const [bonusPoints, setBonusPoints] = useState({ participation: 1, bounty: 2 })
  return (<Modal title="📊 Points Structure" onClose={onClose}><div className="space-y-4"><div className="space-y-2 max-h-[40vh] overflow-y-auto">{points.map((p, idx) => <div key={p.position} className="flex items-center gap-3"><span className="text-sm text-white/60 w-16">{getOrdinal(p.position)}</span><input type="number" value={p.points} onChange={(e) => { const u = [...points]; u[idx].points = Number(e.target.value); setPoints(u) }} className="input flex-1 text-center" /><span className="text-xs text-white/40">pts</span></div>)}</div><div className="border-t border-white/10 pt-4"><h4 className="text-sm font-semibold mb-2">Bonus Points</h4><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-white/60">Participation</label><input type="number" value={bonusPoints.participation} onChange={(e) => setBonusPoints({...bonusPoints, participation: Number(e.target.value)})} className="input" /></div><div><label className="text-xs text-white/60">Per Bounty</label><input type="number" value={bonusPoints.bounty} onChange={(e) => setBonusPoints({...bonusPoints, bounty: Number(e.target.value)})} className="input" /></div></div></div><button className="w-full btn btn-primary py-3">Save</button></div></Modal>)
}

function PayoutStructureModal({ league, onClose }) {
  const [payouts, setPayouts] = useState([{ players: '2-3', first: 100, second: 0, third: 0 },{ players: '4-5', first: 70, second: 30, third: 0 },{ players: '6-7', first: 60, second: 30, third: 10 },{ players: '8-9', first: 50, second: 30, third: 20 },{ players: '10+', first: 50, second: 30, third: 20 }])
  return (<Modal title="💰 Payout Structure" onClose={onClose}><div className="space-y-3">{payouts.map((p, idx) => <div key={p.players} className="card"><div className="text-sm font-semibold mb-2">{p.players} Players</div><div className="grid grid-cols-3 gap-2">{['first','second','third'].map((place, i) => <div key={place}><label className="text-xs text-white/50">{getOrdinal(i+1)}</label><div className="flex items-center gap-1"><input type="number" value={p[place]} onChange={(e) => { const u = [...payouts]; u[idx][place] = Number(e.target.value); setPayouts(u) }} className="input text-center" /><span className="text-xs">%</span></div></div>)}</div></div>)}<button className="w-full btn btn-primary py-3">Save</button></div></Modal>)
}

function BlindStructureModal({ league, onClose }) {
  const [levels, setLevels] = useState([{ level: 1, sb: 25, bb: 50, ante: 0, duration: 15 },{ level: 2, sb: 50, bb: 100, ante: 0, duration: 15 },{ level: 3, sb: 75, bb: 150, ante: 0, duration: 15 },{ level: 4, sb: 100, bb: 200, ante: 25, duration: 15 },{ level: 5, sb: 150, bb: 300, ante: 25, duration: 15 },{ level: 6, sb: 200, bb: 400, ante: 50, duration: 15 },{ level: 7, sb: 300, bb: 600, ante: 75, duration: 15 },{ level: 8, sb: 400, bb: 800, ante: 100, duration: 15 }])
  return (<Modal title="⏱️ Blind Structure" onClose={onClose}><div className="space-y-4"><div className="grid grid-cols-5 gap-2 text-xs text-white/50 font-medium"><div>Lvl</div><div>SB</div><div>BB</div><div>Ante</div><div>Min</div></div><div className="space-y-2 max-h-[40vh] overflow-y-auto">{levels.map((l, idx) => <div key={l.level} className="grid grid-cols-5 gap-2"><div className="flex items-center justify-center text-gold font-bold">{l.level}</div>{['sb','bb','ante','duration'].map(f => <input key={f} type="number" value={l[f]} onChange={(e) => { const u = [...levels]; u[idx][f] = Number(e.target.value); setLevels(u) }} className="input text-center text-sm py-1" />)}</div>)}</div><button onClick={() => setLevels([...levels, { level: levels.length + 1, sb: Math.round(levels[levels.length-1].sb * 1.5), bb: Math.round(levels[levels.length-1].bb * 1.5), ante: levels[levels.length-1].ante, duration: 15 }])} className="w-full py-2 border border-dashed border-white/20 rounded-lg text-white/50 text-sm">+ Add Level</button><button className="w-full btn btn-primary py-3">Save</button></div></Modal>)
}

function SeasonManagerModal({ league, stats, pot, onClose }) {
  return (<Modal title="🏆 Season Manager" onClose={onClose}><div className="space-y-4"><div className="card card-gold text-center"><div className="text-xs text-gold uppercase">Current Season</div><div className="font-display text-2xl text-white">{new Date().getFullYear()}</div><div className="text-sm text-white/60 mt-2">{stats.games} games • ${stats.prizePools.toLocaleString()} prizes</div></div><div className="card"><div className="text-center mb-4"><div className="text-xs text-white/50">Big Game Pot</div><div className="font-display text-3xl text-gold">${pot?.total_pot || 0}</div></div><h4 className="font-semibold mb-2">Actions</h4><div className="space-y-2"><button className="w-full btn btn-secondary py-2 text-left flex items-center gap-3"><span>📊</span> Export Stats</button><button className="w-full btn btn-secondary py-2 text-left flex items-center gap-3"><span>🏆</span> Award Trophies</button><button className="w-full bg-red-600/20 border border-red-500/30 py-2 px-4 rounded-lg text-red-400 text-left flex items-center gap-3"><span>🔒</span> Close Season</button></div></div></div></Modal>)
}

function Modal({ title, children, onClose }) {
  return (<div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"><div className="bg-felt-dark rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"><div className="p-4 border-b border-white/10 flex items-center justify-between"><h2 className="font-display text-xl text-gold">{title}</h2><button onClick={onClose} className="text-white/60 text-2xl">&times;</button></div><div className="p-4 flex-1 overflow-y-auto">{children}</div></div></div>)
}

function getOrdinal(n) { const s = ['th','st','nd','rd']; const v = n % 100; return n + (s[(v-20)%10] || s[v] || s[0]) }
