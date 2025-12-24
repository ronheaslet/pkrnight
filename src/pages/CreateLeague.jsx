import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLeague } from '../contexts/LeagueContext'

export default function CreateLeague() {
  const navigate = useNavigate()
  const { createLeague } = useLeague()
  
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [buyIn, setBuyIn] = useState(20)
  const [bounty, setBounty] = useState(5)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Auto-generate slug from name
  const handleNameChange = (value) => {
    setName(value)
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30)
    setSlug(autoSlug)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await createLeague(name, slug, {
        default_buy_in: buyIn,
        bounty_amount: bounty
      })
      navigate('/app')
    } catch (err) {
      setError(err.message || 'Failed to create league')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-12">
      {/* Back button */}
      <Link to="/join" className="text-white/60 mb-8">
        ← Back
      </Link>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🏆</div>
        <h1 className="font-display text-2xl text-gold">Create League</h1>
        <p className="text-white/60 text-sm mt-1">Start your poker empire</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-sm mx-auto w-full">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="label">League Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="input"
            placeholder="e.g., Tuesday Night Poker"
            required
          />
        </div>

        <div className="mb-4">
          <label className="label">Invite Code (URL slug)</label>
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-sm">pkrnight.com/join/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="input flex-1"
              placeholder="tuesday-poker"
              required
            />
          </div>
          <p className="text-white/40 text-xs mt-1">
            Share this code with friends to invite them
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="label">Default Buy-in ($)</label>
            <input
              type="number"
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
              className="input text-center"
              min={1}
              required
            />
          </div>
          <div>
            <label className="label">Bounty Amount ($)</label>
            <input
              type="number"
              value={bounty}
              onChange={(e) => setBounty(Number(e.target.value))}
              className="input text-center"
              min={0}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-3 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create League'}
        </button>

        <p className="text-center text-white/40 text-xs mt-4">
          You can customize more settings after creation
        </p>
      </form>
    </div>
  )
}
