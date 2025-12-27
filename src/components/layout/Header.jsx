import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLeague } from '../../contexts/LeagueContext'
import { supabase } from '../../lib/supabase'

export default function Header({ leagueName, onLeagueClick, hasMultipleLeagues, viewMode = 'admin', onViewModeChange, userRoles = [] }) {
  const { profile, signOut } = useAuth()
  const { isAdmin } = useLeague()
  const navigate = useNavigate()
  const [showModeMenu, setShowModeMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  
  const initials = profile?.display_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'U'

  // Avatar options mapping
  const avatarOptions = {
    'spade': { emoji: '♠️', bg: 'bg-gray-800' },
    'heart': { emoji: '♥️', bg: 'bg-red-900' },
    'diamond': { emoji: '♦️', bg: 'bg-blue-900' },
    'club': { emoji: '♣️', bg: 'bg-green-900' },
    'ace': { emoji: '🂡', bg: 'bg-purple-900' },
    'king': { emoji: '👑', bg: 'bg-gold/80' },
    'joker': { emoji: '🃏', bg: 'bg-pink-900' },
    'chip-red': { emoji: '🔴', bg: 'bg-chip-red' },
    'chip-blue': { emoji: '🔵', bg: 'bg-chip-blue' },
    'chip-green': { emoji: '🟢', bg: 'bg-green-600' },
    'dice': { emoji: '🎲', bg: 'bg-gray-700' },
    'money': { emoji: '💰', bg: 'bg-yellow-700' },
    'fire': { emoji: '🔥', bg: 'bg-orange-700' },
    'star': { emoji: '⭐', bg: 'bg-yellow-600' },
    'skull': { emoji: '💀', bg: 'bg-gray-900' },
    'rocket': { emoji: '🚀', bg: 'bg-indigo-700' },
  }

  const userAvatar = profile?.avatar_url ? avatarOptions[profile.avatar_url] : null

  // Determine available modes - use isAdmin from context as fallback
  const hasAdminAccess = isAdmin || userRoles.some(r => ['owner', 'admin'].includes(r.slug))
  const isDealer = userRoles.some(r => r.slug === 'dealer' || r.can_pause_timer)
  const hasSpecialRole = userRoles.some(r => !r.is_system_role)

  // Build available view modes
  const viewModes = [
    { id: 'player', label: 'Player', icon: '🎮', desc: 'Standard player view' },
  ]
  
  if (isDealer || hasAdminAccess) {
    viewModes.push({ id: 'dealer', label: 'Dealer', icon: '🃏', desc: 'Timer & blinds only' })
  }
  
  if (hasAdminAccess) {
    viewModes.push({ id: 'admin', label: 'Admin', icon: '⚙️', desc: 'Full admin controls' })
  }

  const currentMode = viewModes.find(m => m.id === viewMode) || viewModes[viewModes.length - 1]

  const getModeColor = (mode) => {
    switch (mode) {
      case 'admin': return 'bg-gold text-felt-dark'
      case 'dealer': return 'bg-chip-blue text-white'
      default: return 'bg-green-600 text-white'
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

  return (
    <>
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
            {/* View Mode Toggle - show if more than 1 mode available */}
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
                            if (onViewModeChange) onViewModeChange(mode.id)
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

            {/* User avatar - clickable for settings menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="relative focus:outline-none focus:ring-2 focus:ring-gold/50 rounded-full"
              >
                <div className={`w-9 h-9 rounded-full ${userAvatar?.bg || 'bg-gold'} flex items-center justify-center ${userAvatar ? 'text-xl' : 'text-felt-dark font-semibold text-sm'} hover:opacity-80 transition-opacity`}>
                  {userAvatar?.emoji || initials}
                </div>
                {hasSpecialRole && (
                  <div className="absolute -bottom-1 -right-1 text-xs">
                    {userRoles.find(r => !r.is_system_role)?.emoji || '⭐'}
                  </div>
                )}
              </button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-felt-dark border border-white/20 rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="font-medium text-white">{profile?.display_name || profile?.full_name || 'User'}</div>
                      <div className="text-xs text-white/50">{profile?.email}</div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          setShowProfileModal(true)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors"
                      >
                        <span className="text-lg">👤</span>
                        <div>
                          <div className="font-medium text-sm">Edit Profile</div>
                          <div className="text-xs text-white/50">Name, display name</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          // Could add notification settings modal here
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors"
                      >
                        <span className="text-lg">🔔</span>
                        <div>
                          <div className="font-medium text-sm">Notifications</div>
                          <div className="text-xs text-white/50">Manage alerts</div>
                        </div>
                      </button>

                      <div className="border-t border-white/10 my-1"></div>

                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          handleLogout()
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-500/20 transition-colors text-red-400"
                      >
                        <span className="text-lg">🚪</span>
                        <div>
                          <div className="font-medium text-sm">Log Out</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <ProfileModal 
          profile={profile} 
          onClose={() => setShowProfileModal(false)} 
        />
      )}
    </>
  )
}

// Profile Edit Modal Component
function ProfileModal({ profile, onClose }) {
  const { updateProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    display_name: profile?.display_name || '',
    avatar_url: profile?.avatar_url || '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Avatar options - poker/card themed
  const avatarOptions = [
    { id: 'spade', emoji: '♠️', bg: 'bg-gray-800' },
    { id: 'heart', emoji: '♥️', bg: 'bg-red-900' },
    { id: 'diamond', emoji: '♦️', bg: 'bg-blue-900' },
    { id: 'club', emoji: '♣️', bg: 'bg-green-900' },
    { id: 'ace', emoji: '🂡', bg: 'bg-purple-900' },
    { id: 'king', emoji: '👑', bg: 'bg-gold/80' },
    { id: 'joker', emoji: '🃏', bg: 'bg-pink-900' },
    { id: 'chip-red', emoji: '🔴', bg: 'bg-chip-red' },
    { id: 'chip-blue', emoji: '🔵', bg: 'bg-chip-blue' },
    { id: 'chip-green', emoji: '🟢', bg: 'bg-green-600' },
    { id: 'dice', emoji: '🎲', bg: 'bg-gray-700' },
    { id: 'money', emoji: '💰', bg: 'bg-yellow-700' },
    { id: 'fire', emoji: '🔥', bg: 'bg-orange-700' },
    { id: 'star', emoji: '⭐', bg: 'bg-yellow-600' },
    { id: 'skull', emoji: '💀', bg: 'bg-gray-900' },
    { id: 'rocket', emoji: '🚀', bg: 'bg-indigo-700' },
  ]

  const handleSaveProfile = async () => {
    if (!form.full_name.trim()) {
      setError('Full name is required')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await updateProfile({
        full_name: form.full_name.trim(),
        display_name: form.display_name.trim() || form.full_name.split(' ')[0],
        avatar_url: form.avatar_url,
      })
      setSuccess('Profile updated!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setError('')
    setSuccess('')

    if (!passwordForm.newPassword) {
      setError('New password is required')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) throw error

      setSuccess('Password updated successfully!')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const getSelectedAvatar = () => {
    return avatarOptions.find(a => a.id === form.avatar_url) || null
  }

  const getInitials = () => {
    const name = form.display_name || form.full_name || 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-felt-dark rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-xl text-gold">⚙️ Settings</h2>
          <button onClick={onClose} className="text-white/60 text-2xl">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'profile' 
                ? 'text-gold border-b-2 border-gold' 
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            👤 Profile
          </button>
          <button
            onClick={() => setActiveTab('avatar')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'avatar' 
                ? 'text-gold border-b-2 border-gold' 
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            🎨 Avatar
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'password' 
                ? 'text-gold border-b-2 border-gold' 
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            🔐 Password
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded-lg text-sm mb-4">
              {success}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Current avatar preview */}
              <div className="flex justify-center mb-4">
                <div className={`w-20 h-20 rounded-full ${getSelectedAvatar()?.bg || 'bg-gold'} flex items-center justify-center text-3xl`}>
                  {getSelectedAvatar()?.emoji || getInitials()}
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="input"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">Display Name</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className="input"
                  placeholder="Johnny"
                />
                <p className="text-xs text-white/40 mt-1">This is how your name appears to others</p>
              </div>

              <div className="pt-2">
                <div className="text-xs text-white/40 mb-1">Email</div>
                <div className="text-sm text-white/60">{profile?.email}</div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full btn btn-primary py-3 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}

          {/* Avatar Tab */}
          {activeTab === 'avatar' && (
            <div className="space-y-4">
              <p className="text-sm text-white/60 text-center">Choose your avatar</p>
              
              {/* Current selection */}
              <div className="flex justify-center mb-4">
                <div className={`w-24 h-24 rounded-full ${getSelectedAvatar()?.bg || 'bg-gold'} flex items-center justify-center text-4xl border-4 border-gold`}>
                  {getSelectedAvatar()?.emoji || getInitials()}
                </div>
              </div>

              {/* Use initials option */}
              <button
                onClick={() => setForm({ ...form, avatar_url: '' })}
                className={`w-full p-3 rounded-xl border-2 transition-colors ${
                  !form.avatar_url 
                    ? 'border-gold bg-gold/20' 
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-felt-dark font-bold">
                    {getInitials()}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm">Use Initials</div>
                    <div className="text-xs text-white/50">Default style</div>
                  </div>
                  {!form.avatar_url && <span className="ml-auto text-gold">✓</span>}
                </div>
              </button>

              {/* Avatar grid */}
              <div className="grid grid-cols-4 gap-3">
                {avatarOptions.map(avatar => (
                  <button
                    key={avatar.id}
                    onClick={() => setForm({ ...form, avatar_url: avatar.id })}
                    className={`aspect-square rounded-xl ${avatar.bg} flex items-center justify-center text-2xl border-2 transition-all hover:scale-105 ${
                      form.avatar_url === avatar.id 
                        ? 'border-gold ring-2 ring-gold/50' 
                        : 'border-transparent'
                    }`}
                  >
                    {avatar.emoji}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full btn btn-primary py-3 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Avatar'}
              </button>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-4">
              <p className="text-sm text-white/60">Change your password</p>

              <div>
                <label className="block text-sm text-white/60 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                />
              </div>

              <p className="text-xs text-white/40">Password must be at least 6 characters</p>

              <button
                onClick={handleChangePassword}
                disabled={saving || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="w-full btn btn-primary py-3 disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
