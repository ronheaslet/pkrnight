import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { PageSpinner } from '../components/Spinner'

export function CreateEvent() {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('')
  const [buyInAmount, setBuyInAmount] = useState('')
  const [maxRebuys, setMaxRebuys] = useState('0')
  const [rebuyAmount, setRebuyAmount] = useState('')
  const [rebuyCutoffLevel, setRebuyCutoffLevel] = useState('0')
  const [blindStructureId, setBlindStructureId] = useState('')
  const [payoutStructureId, setPayoutStructureId] = useState('')
  const [pointsStructureId, setPointsStructureId] = useState('')
  const [blindStructures, setBlindStructures] = useState([])
  const [payoutStructures, setPayoutStructures] = useState([])
  const [pointsStructures, setPointsStructures] = useState([])
  const [savedLocations, setSavedLocations] = useState([])
  const [locationId, setLocationId] = useState('')
  const [saveNewLocation, setSaveNewLocation] = useState(false)
  const [structuresLoading, setStructuresLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStructures()
  }, [leagueId])

  async function fetchStructures() {
    try {
      const [blinds, payouts, points, locs] = await Promise.all([
        api.get(`/api/structures/blinds/league/${leagueId}`),
        api.get(`/api/structures/payouts/league/${leagueId}`),
        api.get(`/api/structures/points/league/${leagueId}`),
        api.get(`/api/locations/league/${leagueId}`).catch(() => ({ locations: [] }))
      ])
      setBlindStructures(blinds.structures)
      setPayoutStructures(payouts.structures)
      setPointsStructures(points.structures)
      setSavedLocations(locs.locations || [])

      // Pre-select defaults
      const defaultBlind = blinds.structures.find(s => s.is_default)
      if (defaultBlind) setBlindStructureId(defaultBlind.id)

      const defaultPayout = payouts.structures.find(s => s.is_default)
      if (defaultPayout) setPayoutStructureId(defaultPayout.id)

      const defaultPoints = points.structures.find(s => s.is_default)
      if (defaultPoints) setPointsStructureId(defaultPoints.id)
    } catch {} finally {
      setStructuresLoading(false)
    }
  }

  function handleLocationSelect(e) {
    const val = e.target.value
    if (val === '__new__') {
      setLocationId('')
      setLocation('')
      setSaveNewLocation(true)
    } else if (val) {
      setLocationId(val)
      const loc = savedLocations.find(l => l.id === val)
      setLocation(loc?.name || '')
      setSaveNewLocation(false)
    } else {
      setLocationId('')
      setLocation('')
      setSaveNewLocation(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // If saving a new location, create it first
      if (saveNewLocation && location.trim()) {
        await api.post(`/api/locations/league/${leagueId}`, { name: location.trim() })
      }

      await api.post('/api/events', {
        leagueId,
        title,
        description: description || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        location: location || undefined,
        locationId: locationId || undefined,
        buyInAmount: parseFloat(buyInAmount) || 0,
        maxRebuys: parseInt(maxRebuys) || 0,
        rebuyAmount: parseFloat(rebuyAmount) || 0,
        rebuyCutoffLevel: parseInt(rebuyCutoffLevel) || 0,
        blindStructureId: blindStructureId || undefined,
        payoutStructureId: payoutStructureId || undefined,
        pointsStructureId: pointsStructureId || undefined
      })
      navigate(`/leagues/${leagueId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (structuresLoading) return <PageSpinner />

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <Link to={`/leagues/${leagueId}`} className="text-gray-400 hover:text-white text-sm">&larr; Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-white mt-1">Create Event</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div>
          <label className="block text-sm text-gray-400 mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Date & Time *</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Location</label>
          {savedLocations.length > 0 ? (
            <div className="space-y-2">
              <select
                value={locationId || (saveNewLocation ? '__new__' : '')}
                onChange={handleLocationSelect}
                className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
              >
                <option value="">No location</option>
                {savedLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}{loc.address ? ` - ${loc.address}` : ''}</option>
                ))}
                <option value="__new__">+ New location...</option>
              </select>
              {saveNewLocation && (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
                    placeholder="New location name"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                    <input type="checkbox" checked={saveNewLocation} onChange={e => setSaveNewLocation(e.target.checked)} className="rounded border-gray-600 bg-gray-900 text-green-500" />
                    Save
                  </label>
                </div>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
              placeholder="e.g. Joe's house"
            />
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Buy-in ($)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={buyInAmount}
              onChange={(e) => setBuyInAmount(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Rebuys</label>
            <input
              type="number"
              min="0"
              value={maxRebuys}
              onChange={(e) => setMaxRebuys(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Rebuy ($)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={rebuyAmount}
              onChange={(e) => setRebuyAmount(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Cutoff Level</label>
            <input
              type="number"
              min="0"
              value={rebuyCutoffLevel}
              onChange={(e) => setRebuyCutoffLevel(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
              placeholder="0 = no limit"
            />
          </div>
        </div>

        {/* Structure Dropdowns */}
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <p className="text-sm text-gray-400 font-medium">Tournament Structures</p>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Blind Structure</label>
            <select
              value={blindStructureId}
              onChange={(e) => setBlindStructureId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
            >
              <option value="">None</option>
              {blindStructures.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.is_default ? ' (default)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Payout Structure</label>
            <select
              value={payoutStructureId}
              onChange={(e) => setPayoutStructureId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
            >
              <option value="">None</option>
              {payoutStructures.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.is_default ? ' (default)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Points Structure</label>
            <select
              value={pointsStructureId}
              onChange={(e) => setPointsStructureId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none"
            >
              <option value="">None</option>
              {pointsStructures.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.is_default ? ' (default)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
          <Link
            to={`/leagues/${leagueId}`}
            className="px-5 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
