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
  const { currentLeague, refreshLeagues } = useLeague()
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [roles, setRoles] = useState([])
  const [roleAssignments, setRoleAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [seasonStats, setSeasonStats] = useState({ games: 0, prizePools: 0 })
  const [seasonPot, setSeasonPot] = useState(null)
  const [currentSeason, setCurrentSeason] = useState(null)
  
  // Structure IDs for passing to modals
  const [structures, setStructures] = useState({
    blinds: null,
    points: null,
    payouts: null
  })
  
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
      fetchStructures()
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
    let { data: existingRoles } = await supabase
      .from('league_roles')
      .select('*')
      .eq('league_id', currentLeague.id)
      .order('display_order', { ascending: true })

    if (!existingRoles || existingRoles.length === 0) {
      const rolesToInsert = DEFAULT_ROLES.map(r => ({ ...r, league_id: currentLeague.id }))
      const { data: newRoles } = await supabase
        .from('league_roles')
        .insert(rolesToInsert)
        .select()
      existingRoles = newRoles || []
    }

    setRoles(existingRoles)

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
    
    // Also fetch current season
    const { data: season } = await supabase
      .from('seasons')
      .select('*')
      .eq('league_id', currentLeague.id)
      .eq('status', 'active')
      .single()
    setCurrentSeason(season)
  }

  const fetchStructures = async () => {
    // Get default structures for this league
    const { data: blinds } = await supabase
      .from('blind_structures')
      .select('id, name')
      .eq('league_id', currentLeague.id)
      .eq('is_default', true)
      .single()

    const { data: points } = await supabase
      .from('points_structures')
      .select('id, name')
      .eq('league_id', currentLeague.id)
      .eq('is_default', true)
      .single()

    const { data: payouts } = await supabase
      .from('payout_structures')
      .select('id, name')
      .eq('league_id', currentLeague.id)
      .eq('is_default', true)
      .single()

    setStructures({
      blinds: blinds?.id,
      points: points?.id,
      payouts: payouts?.id
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

      {/* Members Quick List */}
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-sm">Active Members</h3>
          <button onClick={() => setShowMembersModal(true)} className="text-gold text-xs">View All →</button>
        </div>
        <div className="space-y-2">
          {members.slice(0, 5).map(member => (
            <div key={member.id} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${getRoleColor(member.role, member.member_type)} flex items-center justify-center text-xs font-semibold`}>
                {getInitials(member.users?.display_name || member.users?.full_name)}
              </div>
              <div className="flex-1">
                <div className="text-sm">{member.users?.display_name || member.users?.full_name}</div>
                <div className="text-xs text-white/50">
                  {getMemberRoles(member.user_id).map(r => r.emoji).join(' ')}
                  {member.role === 'owner' && '👑'}
                  {member.role === 'admin' && '⭐'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-gold text-sm">{member.total_points || 0} pts</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showSettingsModal && (
        <SettingsModal
          league={currentLeague}
          onClose={() => setShowSettingsModal(false)}
          onSave={() => {
            setShowSettingsModal(false)
            refreshLeagues?.()
          }}
        />
      )}

      {showMembersModal && (
        <MembersModal
          league={currentLeague}
          members={members}
          roles={roles}
          roleAssignments={roleAssignments}
          onClose={() => setShowMembersModal(false)}
          onUpdate={() => {
            fetchMembers()
            fetchRoles()
          }}
        />
      )}

      {showRolesModal && (
        <RolesModal
          league={currentLeague}
          roles={roles}
          members={members}
          roleAssignments={roleAssignments}
          onClose={() => setShowRolesModal(false)}
          onUpdate={fetchRoles}
        />
      )}

      {showPointsModal && (
        <PointsStructureModal
          league={currentLeague}
          structureId={structures.points}
          onClose={() => setShowPointsModal(false)}
          onSave={() => {
            setShowPointsModal(false)
            fetchStructures()
          }}
        />
      )}

      {showPayoutsModal && (
        <PayoutStructureModal
          league={currentLeague}
          structureId={structures.payouts}
          onClose={() => setShowPayoutsModal(false)}
          onSave={() => {
            setShowPayoutsModal(false)
            fetchStructures()
          }}
        />
      )}

      {showBlindsModal && (
        <BlindStructureModal
          league={currentLeague}
          structureId={structures.blinds}
          onClose={() => setShowBlindsModal(false)}
          onSave={() => {
            setShowBlindsModal(false)
            fetchStructures()
          }}
        />
      )}

      {showSeasonModal && (
        <SeasonManagerModal
          league={currentLeague}
          season={currentSeason}
          stats={seasonStats}
          pot={seasonPot}
          onClose={() => setShowSeasonModal(false)}
          onUpdate={() => {
            fetchSeasonStats()
            fetchSeasonPot()
          }}
        />
      )}

      {showDuesModal && (
        <DuesModal
          league={currentLeague}
          members={members}
          pot={seasonPot}
          onClose={() => setShowDuesModal(false)}
          onUpdate={() => {
            fetchMembers()
            fetchSeasonPot()
          }}
        />
      )}

      {showPotModal && (
        <SeasonPotModal
          league={currentLeague}
          pot={seasonPot}
          onClose={() => setShowPotModal(false)}
          onUpdate={fetchSeasonPot}
        />
      )}
    </div>
  )
}

// ============================================
// SETTINGS MODAL
// ============================================
function SettingsModal({ league, onClose, onSave }) {
  const [form, setForm] = useState({
    name: league?.name || '',
    description: league?.description || '',
    default_buy_in: league?.default_buy_in || 20,
    default_rebuy_cost: league?.default_rebuy_cost || 20,
    bounty_amount: league?.bounty_amount || 5,
    max_players_per_game: league?.max_players_per_game || 10,
    allow_rebuys: league?.allow_rebuys ?? true,
    auto_approve_members: league?.auto_approve_members ?? true,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('leagues')
      .update(form)
      .eq('id', league.id)

    if (!error) onSave()
    setSaving(false)
  }

  return (
    <Modal title="⚙️ League Settings" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">League Name</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[80px]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Default Buy-in ($)</label>
            <input type="number" value={form.default_buy_in} onChange={(e) => setForm({ ...form, default_buy_in: Number(e.target.value) })} className="input text-center" />
          </div>
          <div>
            <label className="label">Rebuy Cost ($)</label>
            <input type="number" value={form.default_rebuy_cost} onChange={(e) => setForm({ ...form, default_rebuy_cost: Number(e.target.value) })} className="input text-center" />
          </div>
          <div>
            <label className="label">Bounty ($)</label>
            <input type="number" value={form.bounty_amount} onChange={(e) => setForm({ ...form, bounty_amount: Number(e.target.value) })} className="input text-center" />
          </div>
          <div>
            <label className="label">Max Players</label>
            <input type="number" value={form.max_players_per_game} onChange={(e) => setForm({ ...form, max_players_per_game: Number(e.target.value) })} className="input text-center" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.allow_rebuys} onChange={(e) => setForm({ ...form, allow_rebuys: e.target.checked })} className="w-5 h-5 rounded" />
            <span className="text-sm">Allow Rebuys</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.auto_approve_members} onChange={(e) => setForm({ ...form, auto_approve_members: e.target.checked })} className="w-5 h-5 rounded" />
            <span className="text-sm">Auto-approve new members</span>
          </label>
        </div>
        <button onClick={handleSave} disabled={saving} className="w-full btn btn-primary py-3 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </Modal>
  )
}

// ============================================
// MEMBERS MODAL (IMPROVED)
// ============================================
function MembersModal({ league, members, roles, roleAssignments, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedMember, setSelectedMember] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getMemberRoles = (userId) => {
    return roleAssignments
      .filter(a => a.user_id === userId)
      .map(a => roles.find(r => r.id === a.role_id))
      .filter(Boolean)
  }

  const updateMemberType = async (memberId, newType) => {
    setSaving(true)
    await supabase
      .from('league_members')
      .update({ member_type: newType })
      .eq('id', memberId)
    onUpdate()
    setSaving(false)
  }

  const updateMemberRole = async (memberId, newRole) => {
    setSaving(true)
    await supabase
      .from('league_members')
      .update({ role: newRole })
      .eq('id', memberId)
    onUpdate()
    setSaving(false)
  }

  const removeMember = async (memberId) => {
    if (!confirm('Remove this member from the league?')) return
    setSaving(true)
    await supabase
      .from('league_members')
      .update({ status: 'inactive' })
      .eq('id', memberId)
    onUpdate()
    setSaving(false)
  }

  // Filter members based on active tab and search
  const filteredMembers = members.filter(m => {
    if (m.status !== 'active') return false
    
    // Search filter
    const name = (m.users?.full_name || m.users?.display_name || '').toLowerCase()
    if (searchTerm && !name.includes(searchTerm.toLowerCase())) return false
    
    // Tab filter
    switch (activeTab) {
      case 'paid': return m.member_type === 'paid'
      case 'guests': return m.member_type === 'guest'
      case 'admins': return m.role === 'owner' || m.role === 'admin'
      default: return true
    }
  })

  const tabs = [
    { id: 'all', label: 'All', count: members.filter(m => m.status === 'active').length },
    { id: 'paid', label: 'Paid', count: members.filter(m => m.status === 'active' && m.member_type === 'paid').length },
    { id: 'guests', label: 'Guests', count: members.filter(m => m.status === 'active' && m.member_type === 'guest').length },
    { id: 'admins', label: 'Admins', count: members.filter(m => m.status === 'active' && (m.role === 'owner' || m.role === 'admin')).length },
  ]

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner': return 'bg-gold text-felt-dark'
      case 'admin': return 'bg-chip-blue text-white'
      default: return 'bg-white/20 text-white/70'
    }
  }

  const getTypeBadgeColor = (type) => {
    return type === 'paid' ? 'bg-green-600/30 text-green-400 border-green-500' : 'bg-gray-500/30 text-gray-300 border-gray-500'
  }

  return (
    <Modal title="👥 Manage Members" onClose={onClose}>
      <div className="space-y-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input"
        />

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-gold text-felt-dark' 
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Members list */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-white/50">No members found</div>
          ) : (
            filteredMembers.map(member => (
              <div key={member.id} className="card">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full ${member.member_type === 'paid' ? 'bg-green-600' : 'bg-gray-500'} flex items-center justify-center text-sm font-semibold flex-shrink-0`}>
                    {getInitials(member.users?.display_name || member.users?.full_name)}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white">
                      {member.users?.full_name || member.users?.display_name || 'Unknown'}
                    </div>
                    {member.users?.display_name && member.users?.full_name && member.users?.display_name !== member.users?.full_name && (
                      <div className="text-xs text-white/50">"{member.users?.display_name}"</div>
                    )}
                    <div className="text-xs text-white/40 truncate">{member.users?.email}</div>
                    
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {/* System role badge */}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                        {member.role === 'owner' ? '👑 Owner' : member.role === 'admin' ? '⭐ Admin' : 'Member'}
                      </span>
                      
                      {/* Member type badge */}
                      <span className={`px-2 py-0.5 rounded text-xs border ${getTypeBadgeColor(member.member_type)}`}>
                        {member.member_type === 'paid' ? '✓ Paid' : 'Guest'}
                      </span>
                      
                      {/* Special roles */}
                      {getMemberRoles(member.user_id).map(role => (
                        <span key={role.id} className="px-2 py-0.5 rounded text-xs bg-purple-600/30 text-purple-300 border border-purple-500">
                          {role.emoji} {role.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
                    className="text-white/40 hover:text-white p-1"
                  >
                    ⚙️
                  </button>
                </div>

                {/* Expanded edit section */}
                {selectedMember?.id === member.id && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-white/50 mb-1">Member Type</label>
                        <select
                          value={member.member_type || 'guest'}
                          onChange={(e) => updateMemberType(member.id, e.target.value)}
                          className="input text-sm"
                          disabled={saving}
                        >
                          <option value="guest">Guest</option>
                          <option value="paid">Paid Member</option>
                        </select>
                      </div>
                      
                      {member.role !== 'owner' && (
                        <div>
                          <label className="block text-xs text-white/50 mb-1">System Role</label>
                          <select
                            value={member.role}
                            onChange={(e) => updateMemberRole(member.id, e.target.value)}
                            className="input text-sm"
                            disabled={saving}
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Special roles */}
                    <div>
                      <label className="block text-xs text-white/50 mb-2">Special Roles</label>
                      <div className="flex flex-wrap gap-2">
                        {roles.filter(r => !r.is_system_role).map(role => {
                          const isAssigned = roleAssignments.some(a => a.role_id === role.id && a.user_id === member.user_id)
                          return (
                            <button
                              key={role.id}
                              onClick={async () => {
                                setSaving(true)
                                if (isAssigned) {
                                  const assignment = roleAssignments.find(a => a.role_id === role.id && a.user_id === member.user_id)
                                  await supabase.from('member_role_assignments').delete().eq('id', assignment.id)
                                } else {
                                  await supabase.from('member_role_assignments').insert({
                                    league_id: league.id,
                                    role_id: role.id,
                                    user_id: member.user_id
                                  })
                                }
                                onUpdate()
                                setSaving(false)
                              }}
                              disabled={saving}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                isAssigned 
                                  ? 'bg-purple-600 text-white' 
                                  : 'bg-white/10 text-white/60 hover:bg-white/20'
                              }`}
                            >
                              {role.emoji} {role.name} {isAssigned && '✓'}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {member.role !== 'owner' && (
                      <button
                        onClick={() => removeMember(member.id)}
                        disabled={saving}
                        className="text-red-400 text-xs hover:text-red-300"
                      >
                        Remove from league
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}

// ============================================
// ROLES MODAL (IMPROVED - with create new role)
// ============================================
function RolesModal({ league, roles, members, roleAssignments, onClose, onUpdate }) {
  const [selectedRole, setSelectedRole] = useState(null)
  const [showCreateRole, setShowCreateRole] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newRole, setNewRole] = useState({
    name: '',
    emoji: '🎯',
    description: '',
    max_assignees: null,
    can_pause_timer: false,
    can_start_game: false,
    can_manage_rebuys: false,
    can_eliminate_players: false,
    can_manage_money: false,
  })

  const emojiOptions = ['🎯', '🛡️', '📊', '🃏', '🔄', '💼', '🎪', '🔔', '📣', '🎖️', '⚡', '🔧', '📝', '🎬', '🏅']

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getRoleAssignees = (roleId) => {
    const assignedUserIds = roleAssignments.filter(a => a.role_id === roleId).map(a => a.user_id)
    return members.filter(m => assignedUserIds.includes(m.user_id))
  }

  const toggleRoleAssignment = async (roleId, userId) => {
    setSaving(true)
    const existing = roleAssignments.find(a => a.role_id === roleId && a.user_id === userId)

    if (existing) {
      await supabase.from('member_role_assignments').delete().eq('id', existing.id)
    } else {
      await supabase.from('member_role_assignments').insert({
        league_id: league.id,
        role_id: roleId,
        user_id: userId
      })
    }

    onUpdate()
    setSaving(false)
  }

  const createNewRole = async () => {
    if (!newRole.name.trim()) return
    
    setSaving(true)
    
    const maxOrder = Math.max(...roles.map(r => r.display_order || 0), 0)
    
    await supabase.from('league_roles').insert({
      league_id: league.id,
      name: newRole.name.trim(),
      slug: newRole.name.trim().toLowerCase().replace(/\s+/g, '-'),
      emoji: newRole.emoji,
      description: newRole.description,
      max_assignees: newRole.max_assignees || null,
      is_system_role: false,
      can_pause_timer: newRole.can_pause_timer,
      can_start_game: newRole.can_start_game,
      can_manage_rebuys: newRole.can_manage_rebuys,
      can_eliminate_players: newRole.can_eliminate_players,
      can_manage_money: newRole.can_manage_money,
      can_edit_settings: false,
      can_manage_members: false,
      display_order: maxOrder + 1
    })

    setNewRole({
      name: '',
      emoji: '🎯',
      description: '',
      max_assignees: null,
      can_pause_timer: false,
      can_start_game: false,
      can_manage_rebuys: false,
      can_eliminate_players: false,
      can_manage_money: false,
    })
    setShowCreateRole(false)
    onUpdate()
    setSaving(false)
  }

  const deleteRole = async (roleId) => {
    if (!confirm('Delete this role? All assignments will be removed.')) return
    
    setSaving(true)
    await supabase.from('member_role_assignments').delete().eq('role_id', roleId)
    await supabase.from('league_roles').delete().eq('id', roleId)
    onUpdate()
    setSaving(false)
  }

  const customRoles = roles.filter(r => !r.is_system_role)

  return (
    <Modal title="🎭 Roles & Permissions" onClose={onClose}>
      <div className="space-y-4">
        {/* System roles info */}
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-white/50 mb-2">System Roles (assigned in Members)</div>
          <div className="flex gap-2">
            <span className="px-2 py-1 rounded text-xs bg-gold text-felt-dark font-medium">👑 Owner</span>
            <span className="px-2 py-1 rounded text-xs bg-chip-blue text-white font-medium">⭐ Admin</span>
            <span className="px-2 py-1 rounded text-xs bg-white/20 text-white/70 font-medium">Member</span>
          </div>
        </div>

        {/* Custom roles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Custom Roles</div>
            <button
              onClick={() => setShowCreateRole(!showCreateRole)}
              className="text-gold text-sm hover:text-gold/80"
            >
              {showCreateRole ? '✕ Cancel' : '+ Add Role'}
            </button>
          </div>

          {/* Create new role form */}
          {showCreateRole && (
            <div className="card mb-4 border border-gold/30">
              <div className="text-sm font-semibold text-gold mb-3">Create New Role</div>
              
              <div className="space-y-3">
                <div className="flex gap-3">
                  {/* Emoji selector */}
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Icon</label>
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {emojiOptions.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => setNewRole({ ...newRole, emoji })}
                          className={`w-8 h-8 rounded flex items-center justify-center text-lg ${
                            newRole.emoji === emoji ? 'bg-gold/30 ring-2 ring-gold' : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name and description */}
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Role Name</label>
                      <input
                        type="text"
                        value={newRole.name}
                        onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                        className="input"
                        placeholder="e.g., Chip Runner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Description (optional)</label>
                      <input
                        type="text"
                        value={newRole.description}
                        onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                        className="input"
                        placeholder="What does this role do?"
                      />
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <label className="block text-xs text-white/50 mb-2">Permissions</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'can_pause_timer', label: '⏱️ Pause Timer' },
                      { key: 'can_start_game', label: '▶️ Start Game' },
                      { key: 'can_manage_rebuys', label: '🔄 Manage Rebuys' },
                      { key: 'can_eliminate_players', label: '💀 Eliminate Players' },
                      { key: 'can_manage_money', label: '💰 Manage Money' },
                    ].map(perm => (
                      <label key={perm.key} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRole[perm.key]}
                          onChange={(e) => setNewRole({ ...newRole, [perm.key]: e.target.checked })}
                          className="w-4 h-4 rounded"
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={createNewRole}
                  disabled={saving || !newRole.name.trim()}
                  className="w-full btn btn-primary py-2 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </div>
          )}

          {/* List of custom roles */}
          {customRoles.length === 0 ? (
            <div className="text-center py-6 text-white/50 text-sm">
              No custom roles yet. Create one above!
            </div>
          ) : (
            <div className="space-y-3">
              {customRoles.map(role => {
                const assignees = getRoleAssignees(role.id)
                const isExpanded = selectedRole === role.id
                
                return (
                  <div key={role.id} className="card">
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setSelectedRole(isExpanded ? null : role.id)}
                    >
                      <span className="text-2xl">{role.emoji}</span>
                      <div className="flex-1">
                        <div className="font-semibold">{role.name}</div>
                        {role.description && (
                          <div className="text-xs text-white/50">{role.description}</div>
                        )}
                        <div className="text-xs text-white/40 mt-1">
                          {assignees.length === 0 
                            ? 'No one assigned' 
                            : assignees.map(a => a.users?.full_name || a.users?.display_name).join(', ')
                          }
                        </div>
                      </div>
                      <span className="text-white/40">{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {/* Expanded section */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        {/* Permissions display */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {role.can_pause_timer && <span className="text-xs bg-white/10 px-2 py-0.5 rounded">⏱️ Timer</span>}
                          {role.can_start_game && <span className="text-xs bg-white/10 px-2 py-0.5 rounded">▶️ Start</span>}
                          {role.can_manage_rebuys && <span className="text-xs bg-white/10 px-2 py-0.5 rounded">🔄 Rebuys</span>}
                          {role.can_eliminate_players && <span className="text-xs bg-white/10 px-2 py-0.5 rounded">💀 Eliminate</span>}
                          {role.can_manage_money && <span className="text-xs bg-white/10 px-2 py-0.5 rounded">💰 Money</span>}
                        </div>

                        {/* Assign members */}
                        <div className="text-xs text-white/50 mb-2">Assign to members:</div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {members.filter(m => m.status === 'active').map(member => {
                            const isAssigned = roleAssignments.some(a => a.role_id === role.id && a.user_id === member.user_id)
                            return (
                              <button
                                key={member.id}
                                onClick={() => toggleRoleAssignment(role.id, member.user_id)}
                                disabled={saving}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                  isAssigned ? 'bg-gold text-felt-dark' : 'bg-white/10 text-white/70 hover:bg-white/20'
                                }`}
                              >
                                <span>{member.users?.full_name || member.users?.display_name}</span>
                                {isAssigned && <span>✓</span>}
                              </button>
                            )
                          })}
                        </div>

                        {/* Delete role */}
                        <button
                          onClick={() => deleteRole(role.id)}
                          disabled={saving}
                          className="text-red-400 text-xs hover:text-red-300"
                        >
                          Delete this role
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ============================================
// POINTS STRUCTURE MODAL (DATABASE CONNECTED)
// ============================================
function PointsStructureModal({ league, structureId, onClose, onSave }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [structure, setStructure] = useState(null)
  const [positions, setPositions] = useState([])
  const [bonusPoints, setBonusPoints] = useState({ participation: 1, bounty: 2 })

  useEffect(() => {
    fetchStructure()
  }, [structureId])

  const fetchStructure = async () => {
    if (!structureId) {
      setLoading(false)
      return
    }

    const { data: structureData } = await supabase
      .from('points_structures')
      .select('*')
      .eq('id', structureId)
      .single()

    if (structureData) {
      setStructure(structureData)
      setBonusPoints({
        participation: structureData.participation_points || 1,
        bounty: structureData.bounty_points || 2
      })
    }

    const { data: positionsData } = await supabase
      .from('points_by_position')
      .select('*')
      .eq('structure_id', structureId)
      .order('finish_position', { ascending: true })

    if (positionsData && positionsData.length > 0) {
      setPositions(positionsData.map(p => ({ position: p.finish_position, points: p.points, id: p.id })))
    } else {
      // Default positions
      setPositions([
        { position: 1, points: 25 },
        { position: 2, points: 18 },
        { position: 3, points: 15 },
        { position: 4, points: 12 },
        { position: 5, points: 10 },
        { position: 6, points: 8 },
        { position: 7, points: 6 },
        { position: 8, points: 4 },
        { position: 9, points: 2 },
        { position: 10, points: 1 },
      ])
    }

    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)

    // Update structure bonus points
    if (structureId) {
      await supabase
        .from('points_structures')
        .update({
          participation_points: bonusPoints.participation,
          bounty_points: bonusPoints.bounty
        })
        .eq('id', structureId)

      // Delete existing positions and re-insert
      await supabase
        .from('points_by_position')
        .delete()
        .eq('structure_id', structureId)

      await supabase
        .from('points_by_position')
        .insert(positions.map(p => ({
          structure_id: structureId,
          finish_position: p.position,
          points: p.points
        })))
    }

    setSaving(false)
    onSave()
  }

  if (loading) {
    return <Modal title="📊 Points Structure" onClose={onClose}><div className="text-center py-8 text-white/50">Loading...</div></Modal>
  }

  return (
    <Modal title="📊 Points Structure" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {positions.map((p, idx) => (
            <div key={p.position} className="flex items-center gap-3">
              <span className="text-sm text-white/60 w-16">{getOrdinal(p.position)}</span>
              <input
                type="number"
                value={p.points}
                onChange={(e) => {
                  const updated = [...positions]
                  updated[idx].points = Number(e.target.value)
                  setPositions(updated)
                }}
                className="input flex-1 text-center"
              />
              <span className="text-xs text-white/40">pts</span>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-4">
          <h4 className="text-sm font-semibold mb-2">Bonus Points</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/60">Participation</label>
              <input
                type="number"
                value={bonusPoints.participation}
                onChange={(e) => setBonusPoints({ ...bonusPoints, participation: Number(e.target.value) })}
                className="input"
              />
            </div>
            <div>
              <label className="text-xs text-white/60">Per Bounty</label>
              <input
                type="number"
                value={bonusPoints.bounty}
                onChange={(e) => setBonusPoints({ ...bonusPoints, bounty: Number(e.target.value) })}
                className="input"
              />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full btn btn-primary py-3 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Points Structure'}
        </button>
      </div>
    </Modal>
  )
}

// ============================================
// PAYOUT STRUCTURE MODAL (DATABASE CONNECTED)
// ============================================
function PayoutStructureModal({ league, structureId, onClose, onSave }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tiers, setTiers] = useState([])

  useEffect(() => {
    fetchStructure()
  }, [structureId])

  const fetchStructure = async () => {
    if (!structureId) {
      setLoading(false)
      return
    }

    const { data: tiersData } = await supabase
      .from('payout_tiers')
      .select('*')
      .eq('structure_id', structureId)
      .order('min_players', { ascending: true })

    if (tiersData && tiersData.length > 0) {
      setTiers(tiersData.map(t => ({
        id: t.id,
        players: `${t.min_players}-${t.max_players === 99 ? '+' : t.max_players}`,
        min_players: t.min_players,
        max_players: t.max_players,
        first: t.first_place_pct,
        second: t.second_place_pct,
        third: t.third_place_pct
      })))
    } else {
      // Default tiers
      setTiers([
        { players: '2-3', min_players: 2, max_players: 3, first: 100, second: 0, third: 0 },
        { players: '4-5', min_players: 4, max_players: 5, first: 70, second: 30, third: 0 },
        { players: '6-7', min_players: 6, max_players: 7, first: 60, second: 30, third: 10 },
        { players: '8-9', min_players: 8, max_players: 9, first: 50, second: 30, third: 20 },
        { players: '10+', min_players: 10, max_players: 99, first: 50, second: 30, third: 20 },
      ])
    }

    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)

    if (structureId) {
      // Delete existing tiers and re-insert
      await supabase
        .from('payout_tiers')
        .delete()
        .eq('structure_id', structureId)

      await supabase
        .from('payout_tiers')
        .insert(tiers.map(t => ({
          structure_id: structureId,
          min_players: t.min_players,
          max_players: t.max_players,
          first_place_pct: t.first,
          second_place_pct: t.second,
          third_place_pct: t.third
        })))
    }

    setSaving(false)
    onSave()
  }

  if (loading) {
    return <Modal title="💰 Payout Structure" onClose={onClose}><div className="text-center py-8 text-white/50">Loading...</div></Modal>
  }

  return (
    <Modal title="💰 Payout Structure" onClose={onClose}>
      <div className="space-y-3">
        {tiers.map((tier, idx) => (
          <div key={tier.players} className="card">
            <div className="text-sm font-semibold mb-2">{tier.players} Players</div>
            <div className="grid grid-cols-3 gap-2">
              {['first', 'second', 'third'].map((place, i) => (
                <div key={place}>
                  <label className="text-xs text-white/50">{getOrdinal(i + 1)}</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={tier[place]}
                      onChange={(e) => {
                        const updated = [...tiers]
                        updated[idx][place] = Number(e.target.value)
                        setTiers(updated)
                      }}
                      className="input text-center"
                    />
                    <span className="text-xs">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button onClick={handleSave} disabled={saving} className="w-full btn btn-primary py-3 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Payout Structure'}
        </button>
      </div>
    </Modal>
  )
}

// ============================================
// BLIND STRUCTURE MODAL (DATABASE CONNECTED)
// ============================================
function BlindStructureModal({ league, structureId, onClose, onSave }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [levels, setLevels] = useState([])

  useEffect(() => {
    fetchStructure()
  }, [structureId])

  const fetchStructure = async () => {
    if (!structureId) {
      setLoading(false)
      return
    }

    const { data: levelsData } = await supabase
      .from('blind_levels')
      .select('*')
      .eq('structure_id', structureId)
      .order('level_number', { ascending: true })

    if (levelsData && levelsData.length > 0) {
      setLevels(levelsData.map(l => ({
        id: l.id,
        level: l.level_number,
        sb: l.small_blind,
        bb: l.big_blind,
        ante: l.ante,
        duration: l.duration_minutes
      })))
    } else {
      // Default levels
      setLevels([
        { level: 1, sb: 25, bb: 50, ante: 0, duration: 15 },
        { level: 2, sb: 50, bb: 100, ante: 0, duration: 15 },
        { level: 3, sb: 75, bb: 150, ante: 0, duration: 15 },
        { level: 4, sb: 100, bb: 200, ante: 25, duration: 15 },
        { level: 5, sb: 150, bb: 300, ante: 25, duration: 15 },
        { level: 6, sb: 200, bb: 400, ante: 50, duration: 15 },
        { level: 7, sb: 300, bb: 600, ante: 75, duration: 15 },
        { level: 8, sb: 400, bb: 800, ante: 100, duration: 15 },
      ])
    }

    setLoading(false)
  }

  const addLevel = () => {
    const lastLevel = levels[levels.length - 1]
    setLevels([...levels, {
      level: levels.length + 1,
      sb: Math.round(lastLevel.sb * 1.5),
      bb: Math.round(lastLevel.bb * 1.5),
      ante: lastLevel.ante,
      duration: 15
    }])
  }

  const removeLevel = (idx) => {
    if (levels.length <= 1) return
    const updated = levels.filter((_, i) => i !== idx).map((l, i) => ({ ...l, level: i + 1 }))
    setLevels(updated)
  }

  const handleSave = async () => {
    setSaving(true)

    if (structureId) {
      // Delete existing levels and re-insert
      await supabase
        .from('blind_levels')
        .delete()
        .eq('structure_id', structureId)

      await supabase
        .from('blind_levels')
        .insert(levels.map(l => ({
          structure_id: structureId,
          level_number: l.level,
          small_blind: l.sb,
          big_blind: l.bb,
          ante: l.ante,
          duration_minutes: l.duration
        })))
    }

    setSaving(false)
    onSave()
  }

  if (loading) {
    return <Modal title="⏱️ Blind Structure" onClose={onClose}><div className="text-center py-8 text-white/50">Loading...</div></Modal>
  }

  return (
    <Modal title="⏱️ Blind Structure" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-6 gap-2 text-xs text-white/50 font-medium">
          <div>Lvl</div>
          <div>SB</div>
          <div>BB</div>
          <div>Ante</div>
          <div>Min</div>
          <div></div>
        </div>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {levels.map((l, idx) => (
            <div key={idx} className="grid grid-cols-6 gap-2">
              <div className="flex items-center justify-center text-gold font-bold">{l.level}</div>
              {['sb', 'bb', 'ante', 'duration'].map(f => (
                <input
                  key={f}
                  type="number"
                  value={l[f]}
                  onChange={(e) => {
                    const updated = [...levels]
                    updated[idx][f] = Number(e.target.value)
                    setLevels(updated)
                  }}
                  className="input text-center text-sm py-1"
                />
              ))}
              <button
                onClick={() => removeLevel(idx)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addLevel}
          className="w-full py-2 border border-dashed border-white/20 rounded-lg text-white/50 text-sm hover:border-white/40"
        >
          + Add Level
        </button>

        <button onClick={handleSave} disabled={saving} className="w-full btn btn-primary py-3 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Blind Structure'}
        </button>
      </div>
    </Modal>
  )
}

// ============================================
// SEASON MANAGER MODAL
// ============================================
function SeasonManagerModal({ league, season, stats, pot, onClose, onUpdate }) {
  const [closing, setClosing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const closeSeason = async () => {
    setClosing(true)
    const currentYear = new Date().getFullYear()

    // Update current season to completed
    await supabase
      .from('seasons')
      .update({
        status: 'completed',
        end_date: new Date().toISOString().split('T')[0],
        closed_at: new Date().toISOString(),
        games_played: stats.games,
        total_prize_pool: stats.prizePools
      })
      .eq('id', season?.id)

    // Create new season for next year
    const nextYear = currentYear + 1
    await supabase
      .from('seasons')
      .insert({
        league_id: league.id,
        year: nextYear,
        name: nextYear.toString(),
        status: 'active',
        start_date: new Date().toISOString().split('T')[0]
      })

    // Create new season pot
    await supabase
      .from('season_pot')
      .insert({
        league_id: league.id,
        season_year: nextYear
      })

    setClosing(false)
    onUpdate()
    onClose()
  }

  return (
    <Modal title="🏆 Season Manager" onClose={onClose}>
      <div className="space-y-4">
        <div className="card card-gold text-center">
          <div className="text-xs text-gold uppercase">Current Season</div>
          <div className="font-display text-2xl text-white">{season?.name || new Date().getFullYear()}</div>
          <div className="text-sm text-white/60 mt-2">{stats.games} games • ${stats.prizePools.toLocaleString()} prizes</div>
        </div>

        <div className="card">
          <div className="text-center mb-4">
            <div className="text-xs text-white/50">Big Game Pot</div>
            <div className="font-display text-3xl text-gold">${pot?.total_pot || 0}</div>
          </div>

          <h4 className="font-semibold mb-2">Actions</h4>
          <div className="space-y-2">
            <button className="w-full btn btn-secondary py-2 text-left flex items-center gap-3">
              <span>📊</span> Export Stats
            </button>
            <button className="w-full btn btn-secondary py-2 text-left flex items-center gap-3">
              <span>🏆</span> Award Trophies
            </button>

            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full bg-red-600/20 border border-red-500/30 py-2 px-4 rounded-lg text-red-400 text-left flex items-center gap-3"
              >
                <span>🔒</span> Close Season
              </button>
            ) : (
              <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-sm text-white/70 mb-3">
                  This will archive the current season and start a new one. Are you sure?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2 rounded-lg bg-white/10 text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={closeSeason}
                    disabled={closing}
                    className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm disabled:opacity-50"
                  >
                    {closing ? 'Closing...' : 'Yes, Close Season'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ============================================
// DUES MODAL
// ============================================
function DuesModal({ league, members, pot, onClose, onUpdate }) {
  const [selectedMember, setSelectedMember] = useState(null)
  const [paymentType, setPaymentType] = useState('annual_dues')
  const [amount, setAmount] = useState(league?.annual_dues || 50)
  const [saving, setSaving] = useState(false)

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const recordPayment = async () => {
    if (!selectedMember) return
    setSaving(true)

    const currentYear = new Date().getFullYear()

    if (paymentType === 'annual_dues') {
      // Update member to paid status
      await supabase
        .from('league_members')
        .update({
          member_type: 'paid',
          dues_paid: amount,
          dues_paid_date: new Date().toISOString()
        })
        .eq('id', selectedMember.id)

      // Update season pot
      if (pot) {
        await supabase
          .from('season_pot')
          .update({
            dues_collected: (pot.dues_collected || 0) + amount,
            dues_remaining: (pot.dues_remaining || 0) + amount,
            total_pot: (pot.total_pot || 0) + amount
          })
          .eq('id', pot.id)
      }

      // Record transaction
      await supabase
        .from('transactions')
        .insert({
          league_id: league.id,
          user_id: selectedMember.user_id,
          type: 'dues_paid',
          amount: amount,
          description: `Annual dues for ${currentYear}`
        })
    } else {
      // Guest fee
      await supabase
        .from('league_members')
        .update({
          guest_fees_paid: (selectedMember.guest_fees_paid || 0) + amount
        })
        .eq('id', selectedMember.id)

      // Update season pot
      if (pot) {
        await supabase
          .from('season_pot')
          .update({
            guest_fees_collected: (pot.guest_fees_collected || 0) + amount,
            total_pot: (pot.total_pot || 0) + amount
          })
          .eq('id', pot.id)
      }

      // Record transaction
      await supabase
        .from('transactions')
        .insert({
          league_id: league.id,
          user_id: selectedMember.user_id,
          type: 'guest_fee',
          amount: amount,
          description: 'Guest fee'
        })
    }

    setSaving(false)
    setSelectedMember(null)
    onUpdate()
  }

  const unpaidMembers = members.filter(m => m.member_type !== 'paid' && m.status === 'active')
  const paidMembers = members.filter(m => m.member_type === 'paid' && m.status === 'active')

  return (
    <Modal title="💵 Dues & Fees" onClose={onClose}>
      <div className="space-y-4">
        <div className="card">
          <h4 className="font-semibold text-sm mb-3">Record Payment</h4>
          <div className="space-y-3">
            <select
              value={selectedMember?.id || ''}
              onChange={(e) => setSelectedMember(members.find(m => m.id === e.target.value))}
              className="input"
            >
              <option value="">Select member...</option>
              {members.filter(m => m.status === 'active').map(m => (
                <option key={m.id} value={m.id}>
                  {m.users?.display_name || m.users?.full_name} {m.member_type === 'paid' ? '(Paid)' : '(Guest)'}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <select
                value={paymentType}
                onChange={(e) => {
                  setPaymentType(e.target.value)
                  setAmount(e.target.value === 'annual_dues' ? (league?.annual_dues || 50) : (league?.guest_fee || 10))
                }}
                className="input"
              >
                <option value="annual_dues">Annual Dues</option>
                <option value="guest_fee">Guest Fee</option>
              </select>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="input"
              />
            </div>

            <button
              onClick={recordPayment}
              disabled={!selectedMember || saving}
              className="w-full btn btn-primary py-2 disabled:opacity-50"
            >
              {saving ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>

        {unpaidMembers.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Guests ({unpaidMembers.length})</h4>
            <div className="space-y-2 max-h-[30vh] overflow-y-auto">
              {unpaidMembers.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-xs font-semibold">
                    {getInitials(member.users?.display_name || member.users?.full_name)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{member.users?.display_name || member.users?.full_name}</div>
                    <div className="text-xs text-white/50">
                      {member.guest_buyins_count || 0}/{league?.guest_buyins_for_eligibility || 5} buy-ins
                    </div>
                  </div>
                  {(member.guest_buyins_count || 0) >= (league?.guest_buyins_for_eligibility || 5) && (
                    <span className="text-xs text-green-400">🎱</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ============================================
// SEASON POT MODAL
// ============================================
function SeasonPotModal({ league, pot, onClose, onUpdate }) {
  const [description, setDescription] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [incidentals, setIncidentals] = useState([])
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    fetchIncidentals()
  }, [])

  const fetchIncidentals = async () => {
    const { data } = await supabase
      .from('incidentals_log')
      .select('*')
      .eq('league_id', league.id)
      .eq('season_year', currentYear)
      .order('created_at', { ascending: false })
    setIncidentals(data || [])
  }

  const recordExpense = async () => {
    if (!description || !expenseAmount) return
    setSaving(true)

    await supabase
      .from('incidentals_log')
      .insert({
        league_id: league.id,
        season_year: currentYear,
        description,
        amount: parseFloat(expenseAmount)
      })

    if (pot) {
      const newRemaining = (pot.dues_remaining || 0) - parseFloat(expenseAmount)
      await supabase
        .from('season_pot')
        .update({
          dues_remaining: Math.max(0, newRemaining),
          incidentals_spent: (pot.incidentals_spent || 0) + parseFloat(expenseAmount),
          total_pot: Math.max(0, newRemaining) + (pot.guest_fees_collected || 0)
        })
        .eq('id', pot.id)
    }

    setDescription('')
    setExpenseAmount('')
    setSaving(false)
    fetchIncidentals()
    onUpdate()
  }

  return (
    <Modal title="🎱 Season Pot" onClose={onClose}>
      <div className="space-y-4">
        <div className="card card-gold text-center">
          <div className="text-xs text-gold uppercase">Big Game Pot</div>
          <div className="font-display text-4xl text-white">${pot?.total_pot || 0}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <div className="text-xs text-white/50">Dues Collected</div>
            <div className="font-display text-lg text-green-400">${pot?.dues_collected || 0}</div>
          </div>
          <div className="card">
            <div className="text-xs text-white/50">Incidentals</div>
            <div className="font-display text-lg text-red-400">-${pot?.incidentals_spent || 0}</div>
          </div>
          <div className="card">
            <div className="text-xs text-white/50">Dues Remaining</div>
            <div className="font-display text-lg text-white">${pot?.dues_remaining || 0}</div>
          </div>
          <div className="card">
            <div className="text-xs text-white/50">Guest Fees</div>
            <div className="font-display text-lg text-gold">${pot?.guest_fees_collected || 0}</div>
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold text-sm mb-3">Record Expense</h4>
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input mb-2"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              className="input flex-1"
            />
            <button
              onClick={recordExpense}
              disabled={!description || !expenseAmount || saving}
              className="btn btn-primary px-4 disabled:opacity-50"
            >
              {saving ? '...' : 'Add'}
            </button>
          </div>
        </div>

        {incidentals.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Expenses</h4>
            <div className="space-y-1 max-h-[20vh] overflow-y-auto">
              {incidentals.map(inc => (
                <div key={inc.id} className="flex justify-between text-sm p-2 rounded bg-white/5">
                  <span className="text-white/70">{inc.description}</span>
                  <span className="text-red-400">-${inc.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ============================================
// MODAL WRAPPER
// ============================================
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

// ============================================
// HELPER
// ============================================
function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
