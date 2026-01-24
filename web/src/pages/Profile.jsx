import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'

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
      <h1 className="text-2xl font-display font-bold text-pkr-gold-400">Profile</h1>

      <form onSubmit={handleSubmit} className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-6 space-y-4">
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-pkr-gold-400 text-sm">{success}</p>}

        <div>
          <label className="block text-sm text-pkr-gold-300/50 mb-1">Email</label>
          <p className="px-3 py-2 bg-pkr-green-900 text-pkr-gold-300/50 rounded-lg border border-pkr-green-700/50">{user?.email}</p>
        </div>

        <div>
          <label className="block text-sm text-pkr-gold-300/50 mb-1">Display Name *</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 bg-pkr-green-900 text-white rounded-lg border border-pkr-green-700/50 focus:border-pkr-gold-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-pkr-gold-300/50 mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 bg-pkr-green-900 text-white rounded-lg border border-pkr-green-700/50 focus:border-pkr-gold-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !displayName.trim()}
          className="px-5 py-2 bg-pkr-gold-500 text-pkr-green-900 rounded-lg hover:bg-pkr-gold-400 disabled:opacity-50 transition-colors font-medium"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <div className="bg-pkr-green-800 border border-pkr-green-700/50 rounded-lg p-6">
        <h2 className="text-white font-medium mb-3">Account</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
        >
          Log Out
        </button>
      </div>
    </div>
  )
}
