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
        <Link to={`/leagues/${leagueId}`} className="text-white/40 hover:text-white text-sm">&larr; Back to Dashboard</Link>
        <h1 className="font-display text-xl text-gold mt-1">Create Event</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="bg-red-500/20 border border-red-500 text-red-400 px-3 py-2 rounded-xl text-sm">{error}</div>}

        <div>
          <label className="label">Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" required />
        </div>

        <div>
          <label className="label">Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
        </div>

        <div>
          <label className="label">Date & Time *</label>
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="input" required />
        </div>

        <div>
          <label className="label">Location</label>
          {savedLocations.length > 0 ? (
            <div className="space-y-2">
              <select value={locationId || (saveNewLocation ? '__new__' : '')} onChange={handleLocationSelect} className="input">
                <option value="">No location</option>
                {savedLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}{loc.address ? ` - ${loc.address}` : ''}</option>
                ))}
                <option value="__new__">+ New location...</option>
              </select>
              {saveNewLocation && (
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="input" placeholder="New location name" />
              )}
            </div>
          ) : (
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="input" placeholder="e.g. Joe's house" />
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="label">Buy-in ($)</label>
            <input type="number" min="0" step="1" value={buyInAmount} onChange={(e) => setBuyInAmount(e.target.value)} className="input" placeholder="0" />
          </div>
          <div>
            <label className="label">Max Rebuys</label>
            <input type="number" min="0" value={maxRebuys} onChange={(e) => setMaxRebuys(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Rebuy ($)</label>
            <input type="number" min="0" step="1" value={rebuyAmount} onChange={(e) => setRebuyAmount(e.target.value)} className="input" placeholder="0" />
          </div>
          <div>
            <label className="label">Cutoff Lvl</label>
            <input type="number" min="0" value={rebuyCutoffLevel} onChange={(e) => setRebuyCutoffLevel(e.target.value)} className="input" placeholder="0" />
          </div>
        </div>

        {/* Structure Dropdowns */}
        <div className="space-y-3 pt-4 border-t border-white/10">
          <p className="text-sm text-white/50 font-medium">Tournament Structures</p>

          <div>
            <label className="label">Blind Structure</label>
            <select value={blindStructureId} onChange={(e) => setBlindStructureId(e.target.value)} className="input">
              <option value="">None</option>
              {blindStructures.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.is_default ? ' (default)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Payout Structure</label>
            <select value={payoutStructureId} onChange={(e) => setPayoutStructureId(e.target.value)} className="input">
              <option value="">None</option>
              {payoutStructures.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.is_default ? ' (default)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Points Structure</label>
            <select value={pointsStructureId} onChange={(e) => setPointsStructureId(e.target.value)} className="input">
              <option value="">None</option>
              {pointsStructures.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.is_default ? ' (default)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Event'}
          </button>
          <Link to={`/leagues/${leagueId}`} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
