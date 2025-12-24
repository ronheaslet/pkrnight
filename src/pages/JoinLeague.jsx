import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'

export default function JoinLeague() {
  const navigate = useNavigate()
  const { signOut, profile } = useAuth()
  const { joinLeague } = useLeague()
  
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await joinLeague(inviteCode.trim())
      navigate('/app')
    } catch (err) {
      setError(err.message || 'Failed to join league')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="text-sm text-white/60">Logged in as</div>
          <div className="text-white font-medium">{profile?.full_name || 'Player'}</div>
        </div>
        <button onClick={handleSignOut} className="text-white/60 text-sm">
          Sign Out
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">🎰</div>
        <h1 className="font-display text-2xl text-gold mb-2">Join a League</h1>
        <p className="text-white/60 text-sm text-center mb-8 max-w-xs">
          Enter an invite code to join an existing league, or create your own.
        </p>

        {/* Join form */}
        <form onSubmit={handleJoin} className="w-full max-w-xs mb-8">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="label">Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="input text-center uppercase tracking-wider"
              placeholder="e.g., tuesday-poker"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3 disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join League'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full max-w-xs mb-8">
          <div className="flex-1 h-px bg-white/20"></div>
          <span className="text-white/40 text-sm">or</span>
          <div className="flex-1 h-px bg-white/20"></div>
        </div>

        {/* Create league option */}
        <Link
          to="/create"
          className="btn btn-secondary w-full max-w-xs py-3 text-center"
        >
          Create Your Own League
        </Link>
      </div>
    </div>
  )
}
