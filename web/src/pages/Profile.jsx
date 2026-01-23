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
      <h1 className="text-2xl font-bold text-white">Profile</h1>

      <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">{success}</p>}

        <div>
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <p className="px-3 py-2 bg-gray-900 text-gray-400 rounded border border-gray-700">{user?.email}</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Display Name *</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !displayName.trim()}
          className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 className="text-white font-medium mb-3">Account</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors"
        >
          Log Out
        </button>
      </div>
    </div>
  )
}
