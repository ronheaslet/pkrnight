import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'
import { supabase } from '../lib/supabase'

export default function SuperAdminPanel() {
  const { profile, signOut } = useAuth()
  const { leagues } = useLeague()
  const navigate = useNavigate()
  
  const [users, setUsers] = useState([])
  const [allLeagues, setAllLeagues] = useState([])
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedLeague, setSelectedLeague] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState(null)

  // Check if super admin
  useEffect(() => {
    if (profile && !profile.is_super_admin) {
      // If user has leagues, go to app, otherwise go to join
      if (leagues.length > 0) {
        navigate('/app')
      } else {
        navigate('/join')
      }
    }
  }, [profile, leagues, navigate])

  useEffect(() => {
    if (profile?.is_super_admin) {
      fetchData()
    }
  }, [profile])

  const fetchData = async () => {
    setLoading(true)
    
    // Fetch all users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
    } else {
      setUsers(usersData || [])
    }

    // Fetch all leagues
    const { data: leaguesData, error: leaguesError } = await supabase
      .from('leagues')
      .select('*')
      .order('name', { ascending: true })
    
    if (leaguesError) {
      console.error('Error fetching leagues:', leaguesError)
    } else {
      setAllLeagues(leaguesData || [])
    }

    // Fetch all memberships
    const { data: membershipsData, error: membershipsError } = await supabase
      .from('league_members')
      .select('*')
    
    if (membershipsError) {
      console.error('Error fetching memberships:', membershipsError)
    } else {
      setMemberships(membershipsData || [])
    }

    setLoading(false)
  }

  const getUserLeagues = (userId) => {
    const userMemberships = memberships.filter(m => m.user_id === userId)
    return userMemberships.map(m => {
      const league = allLeagues.find(l => l.id === m.league_id)
      return { ...m, league }
    }).filter(m => m.league)
  }

  const isUserInLeague = (userId, leagueId) => {
    return memberships.some(m => m.user_id === userId && m.league_id === leagueId)
  }

  const addUserToLeague = async () => {
    if (!selectedUser || !selectedLeague) return
    
    setAdding(true)
    setMessage(null)

    // Check if already a member
    if (isUserInLeague(selectedUser.id, selectedLeague.id)) {
      setMessage({ type: 'error', text: 'User is already a member of this league' })
      setAdding(false)
      return
    }

    const { data, error } = await supabase
      .from('league_members')
      .insert({
        league_id: selectedLeague.id,
        user_id: selectedUser.id,
        role: 'member',
        status: 'active',
        member_type: 'guest'
      })
      .select()

    if (error) {
      console.error('Error adding user to league:', error)
      setMessage({ type: 'error', text: `Error: ${error.message}` })
    } else {
      setMessage({ type: 'success', text: `${selectedUser.display_name || selectedUser.full_name} added to ${selectedLeague.name}!` })
      // Refresh memberships
      const { data: newMemberships } = await supabase
        .from('league_members')
        .select('*')
      setMemberships(newMemberships || [])
      
      // Reset selections
      setSelectedUser(null)
      setSelectedLeague(null)
      setShowAddModal(false)
    }
    
    setAdding(false)
  }

  const removeUserFromLeague = async (userId, leagueId) => {
    if (!confirm('Are you sure you want to remove this user from the league?')) return

    const { error } = await supabase
      .from('league_members')
      .delete()
      .eq('user_id', userId)
      .eq('league_id', leagueId)

    if (error) {
      console.error('Error removing user:', error)
      setMessage({ type: 'error', text: `Error: ${error.message}` })
    } else {
      setMessage({ type: 'success', text: 'User removed from league' })
      // Refresh memberships
      const { data: newMemberships } = await supabase
        .from('league_members')
        .select('*')
      setMemberships(newMemberships || [])
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const handleBack = () => {
    if (leagues.length > 0) {
      navigate('/app')
    } else {
      navigate('/join')
    }
  }

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase()
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.display_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    )
  })

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner': return { bg: 'bg-gold text-felt-dark', label: 'Owner' }
      case 'admin': return { bg: 'bg-chip-blue', label: 'Admin' }
      default: return { bg: 'bg-gray-600', label: 'Member' }
    }
  }

  // Access denied screen with logout option
  if (!profile?.is_super_admin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-felt-dark p-4">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🔒</div>
          <div className="text-white/60 mb-4">Access Denied</div>
          <p className="text-white/40 text-sm mb-6">You don't have super admin privileges.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="btn btn-secondary px-6 py-2"
          >
            ← Go Back
          </button>
          <button
            onClick={handleLogout}
            className="btn bg-red-600 hover:bg-red-500 text-white px-6 py-2"
          >
            Log Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-felt-dark">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-felt-dark/95 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack}
              className="text-white/60 hover:text-white"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛡️</span>
              <span className="font-display text-lg text-gold">Super Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary text-sm"
            >
              + Add User to League
            </button>
            <button
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 text-sm px-3 py-1"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-4 p-3 rounded-lg text-sm ${
          message.type === 'error' 
            ? 'bg-red-500/20 border border-red-500 text-red-400' 
            : 'bg-green-500/20 border border-green-500 text-green-400'
        }`}>
          {message.text}
          <button 
            onClick={() => setMessage(null)}
            className="float-right opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center">
            <div className="text-2xl font-display text-gold">{users.length}</div>
            <div className="text-xs text-white/50">Total Users</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-display text-gold">{allLeagues.length}</div>
            <div className="text-xs text-white/50">Leagues</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-display text-gold">{memberships.length}</div>
            <div className="text-xs text-white/50">Memberships</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full"
        />
      </div>

      {/* Users List */}
      <div className="px-4 pb-8">
        <h2 className="font-display text-lg text-gold mb-3">All Users</h2>
        
        {loading ? (
          <div className="text-center py-8 text-white/50">Loading...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-white/50">No users found</div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map(user => {
              const userLeagues = getUserLeagues(user.id)
              
              return (
                <div key={user.id} className="card">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center text-felt-dark font-bold shrink-0">
                      {getInitials(user.display_name || user.full_name)}
                    </div>
                    
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white">
                        {user.display_name || user.full_name || 'Unnamed'}
                        {user.is_super_admin && (
                          <span className="ml-2 text-xs bg-purple-600 px-2 py-0.5 rounded-full">Super Admin</span>
                        )}
                      </div>
                      <div className="text-sm text-white/50 truncate">{user.email}</div>
                      {user.full_name && user.display_name && user.full_name !== user.display_name && (
                        <div className="text-xs text-white/40">{user.full_name}</div>
                      )}
                      
                      {/* User's Leagues */}
                      {userLeagues.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {userLeagues.map(membership => (
                            <div 
                              key={membership.league_id}
                              className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1 text-xs"
                            >
                              <span className="text-white/70">{membership.league?.name}</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${getRoleBadge(membership.role).bg}`}>
                                {getRoleBadge(membership.role).label}
                              </span>
                              <button
                                onClick={() => removeUserFromLeague(user.id, membership.league_id)}
                                className="ml-1 text-red-400 hover:text-red-300"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-yellow-500/70 flex items-center gap-1">
                          <span>⚠️</span> Not in any league
                        </div>
                      )}
                    </div>

                    {/* Quick Add Button */}
                    <button
                      onClick={() => {
                        setSelectedUser(user)
                        setShowAddModal(true)
                      }}
                      className="text-gold hover:text-gold/80 text-xl"
                      title="Add to league"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add to League Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-felt-dark rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-display text-xl text-gold">Add User to League</h2>
              <button 
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedUser(null)
                  setSelectedLeague(null)
                }}
                className="text-white/60 text-2xl"
              >
                &times;
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {/* Select User */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Select User</label>
                {selectedUser ? (
                  <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-felt-dark font-bold">
                      {getInitials(selectedUser.display_name || selectedUser.full_name)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{selectedUser.display_name || selectedUser.full_name}</div>
                      <div className="text-xs text-white/50">{selectedUser.email}</div>
                    </div>
                    <button 
                      onClick={() => setSelectedUser(null)}
                      className="text-white/60 hover:text-white"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-white/10 rounded-xl p-2">
                    {users.map(user => (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gold/60 flex items-center justify-center text-felt-dark text-sm font-bold">
                          {getInitials(user.display_name || user.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{user.display_name || user.full_name}</div>
                          <div className="text-xs text-white/40 truncate">{user.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Select League */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Select League</label>
                {selectedLeague ? (
                  <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                    <div className="text-2xl">🃏</div>
                    <div className="flex-1">
                      <div className="font-medium">{selectedLeague.name}</div>
                      <div className="text-xs text-white/50">/{selectedLeague.slug}</div>
                    </div>
                    <button 
                      onClick={() => setSelectedLeague(null)}
                      className="text-white/60 hover:text-white"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allLeagues.map(league => {
                      const alreadyMember = selectedUser && isUserInLeague(selectedUser.id, league.id)
                      return (
                        <button
                          key={league.id}
                          onClick={() => !alreadyMember && setSelectedLeague(league)}
                          disabled={alreadyMember}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                            alreadyMember 
                              ? 'bg-white/5 opacity-50 cursor-not-allowed' 
                              : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          <div className="text-2xl">🃏</div>
                          <div className="flex-1">
                            <div className="font-medium">{league.name}</div>
                            <div className="text-xs text-white/50">/{league.slug}</div>
                          </div>
                          {alreadyMember && (
                            <span className="text-xs text-green-400">Already member</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Add Button */}
              <button
                onClick={addUserToLeague}
                disabled={!selectedUser || !selectedLeague || adding}
                className="w-full btn btn-primary py-3 disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add to League'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
