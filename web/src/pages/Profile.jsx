import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import { Avatar } from '../components/Avatar'

export function Profile() {
  const { user, logout } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await api.patch('/api/auth/profile', { displayName: displayName.trim(), fullName: fullName.trim() || null })
      setSuccess('Profile updated')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await logout()
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="font-display text-xl text-gold">Profile</h1>

      {/* Avatar section */}
      <div className="card flex items-center gap-4">
        <Avatar name={user?.displayName} size="lg" />
        <div>
          <div className="font-display text-lg text-white">{user?.displayName}</div>
          <div className="text-sm text-white/50">{user?.email}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="bg-red-500/20 border border-red-500 text-red-400 px-3 py-2 rounded-xl text-sm">{error}</div>}
        {success && <div className="bg-green-500/20 border border-green-500 text-green-400 px-3 py-2 rounded-xl text-sm">{success}</div>}

        <div>
          <label className="label">Display Name</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" required />
        </div>

        <div>
          <label className="label">Full Name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
        </div>

        <button type="submit" disabled={saving || !displayName.trim()} className="btn btn-primary disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <div className="card">
        <h2 className="text-white font-medium mb-3">Account</h2>
        <button onClick={handleLogout} className="btn btn-danger">
          Log Out
        </button>
      </div>
    </div>
  )
}
