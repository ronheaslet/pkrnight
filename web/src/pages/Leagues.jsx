import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { PageSpinner } from '../components/Spinner'

export function Leagues() {
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  useEffect(() => {
    fetchLeagues()
  }, [])

  async function fetchLeagues() {
    try {
      const data = await api.get('/api/leagues')
      setLeagues(data.leagues)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <PageSpinner />

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={() => { setError(null); setLoading(true); fetchLeagues() }} className="text-green-400 hover:underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Your Leagues</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false) }}
            className="px-4 py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Join League
          </button>
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false) }}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Create League
          </button>
        </div>
      </div>

      {showJoin && <JoinLeagueForm onDone={() => { setShowJoin(false); fetchLeagues() }} onCancel={() => setShowJoin(false)} />}
      {showCreate && <CreateLeagueForm onDone={() => { setShowCreate(false); fetchLeagues() }} onCancel={() => setShowCreate(false)} />}

      {leagues.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-4">You haven't joined any leagues yet.</p>
          <p className="text-gray-500 text-sm">Create a new league or join one with an invite code.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {leagues.map((league) => (
            <Link
              key={league.id}
              to={`/leagues/${league.id}`}
              className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-green-600 transition-colors block"
            >
              <h3 className="text-lg font-semibold text-white mb-1">{league.name}</h3>
              {league.description && (
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{league.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="capitalize">{league.role}</span>
                {league.member_count && <span>{league.member_count} members</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function CreateLeagueForm({ onDone, onCancel }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/leagues', { name, description: description || undefined })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-5 space-y-3">
      <h3 className="text-white font-semibold">Create New League</h3>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input
        type="text"
        placeholder="League Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
          Cancel
        </button>
      </div>
    </form>
  )
}

function JoinLeagueForm({ onDone, onCancel }) {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/leagues/join', { inviteCode })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-5 space-y-3">
      <h3 className="text-white font-semibold">Join a League</h3>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input
        type="text"
        placeholder="Invite Code"
        value={inviteCode}
        onChange={(e) => setInviteCode(e.target.value)}
        className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
        required
      />
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          {loading ? 'Joining...' : 'Join'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
          Cancel
        </button>
      </div>
    </form>
  )
}
