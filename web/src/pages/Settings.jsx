import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { PageSpinner } from '../components/Spinner'

export function Settings() {
  const { leagueId } = useParams()
  const [league, setLeague] = useState(null)
  const [tab, setTab] = useState('blinds')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get(`/api/leagues/${leagueId}`)
      .then(data => setLeague(data.league))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [leagueId])

  if (loading) return <PageSpinner />
  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-400 mb-4">{error}</p>
      <Link to={`/leagues/${leagueId}`} className="text-green-400 hover:underline">Back to Dashboard</Link>
    </div>
  )

  const isAdmin = league?.role === 'owner' || league?.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/leagues/${leagueId}`} className="text-gray-400 hover:text-white text-sm">&larr; {league?.name || 'Dashboard'}</Link>
        <h1 className="text-2xl font-bold text-white mt-1">League Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        {[['blinds', 'Blinds'], ['payouts', 'Payouts'], ['points', 'Points'], ['roles', 'Roles']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors ${tab === key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'blinds' && <BlindStructures leagueId={leagueId} isAdmin={isAdmin} />}
      {tab === 'payouts' && <PayoutStructures leagueId={leagueId} isAdmin={isAdmin} />}
      {tab === 'points' && <PointsStructures leagueId={leagueId} isAdmin={isAdmin} />}
      {tab === 'roles' && <RolesManager leagueId={leagueId} isAdmin={isAdmin} />}
    </div>
  )
}

// =====================
// BLIND STRUCTURES
// =====================

function BlindStructures({ leagueId, isAdmin }) {
  const [structures, setStructures] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { fetchStructures() }, [leagueId])

  async function fetchStructures() {
    try {
      const data = await api.get(`/api/structures/blinds/league/${leagueId}`)
      setStructures(data.structures)
    } catch {} finally { setLoading(false) }
  }

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Blind Structures</h2>
        {isAdmin && (
          <button onClick={() => { setShowCreate(true); setEditing(null) }} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">
            New Structure
          </button>
        )}
      </div>

      {showCreate && (
        <BlindEditor leagueId={leagueId} onDone={() => { setShowCreate(false); fetchStructures() }} onCancel={() => setShowCreate(false)} />
      )}

      {editing && (
        <BlindEditor leagueId={leagueId} structureId={editing} onDone={() => { setEditing(null); fetchStructures() }} onCancel={() => setEditing(null)} />
      )}

      {structures.length === 0 && !showCreate ? (
        <p className="text-gray-400 text-sm">No blind structures configured.</p>
      ) : (
        <div className="space-y-2">
          {structures.map(s => (
            <div key={s.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
              <div>
                <span className="text-white font-medium">{s.name}</span>
                {s.is_default && <span className="ml-2 px-2 py-0.5 text-xs bg-green-900 text-green-300 rounded-full">default</span>}
                <span className="text-gray-500 text-sm ml-3">{s.level_count} levels</span>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  {!s.is_default && (
                    <button onClick={async () => { await api.post(`/api/structures/blinds/${s.id}/set-default`); fetchStructures() }} className="text-xs text-gray-400 hover:text-white">Set Default</button>
                  )}
                  <button onClick={() => { setEditing(s.id); setShowCreate(false) }} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                  <button onClick={async () => { if (confirm('Delete this structure?')) { try { await api.delete(`/api/structures/blinds/${s.id}`); fetchStructures() } catch (e) { alert(e.message) } } }} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BlindEditor({ leagueId, structureId, onDone, onCancel }) {
  const [name, setName] = useState('')
  const [levels, setLevels] = useState([{ levelNumber: 1, smallBlind: 25, bigBlind: 50, ante: 0, durationMinutes: 15 }])
  const [loading, setLoading] = useState(!!structureId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (structureId) {
      api.get(`/api/structures/blinds/${structureId}`)
        .then(data => {
          setName(data.structure.name)
          setLevels(data.levels.map(l => ({
            levelNumber: l.level_number, smallBlind: l.small_blind, bigBlind: l.big_blind,
            ante: l.ante, durationMinutes: l.duration_minutes
          })))
        })
        .finally(() => setLoading(false))
    }
  }, [structureId])

  function addLevel() {
    const last = levels[levels.length - 1]
    setLevels([...levels, {
      levelNumber: levels.length + 1,
      smallBlind: last.smallBlind * 2,
      bigBlind: last.bigBlind * 2,
      ante: last.ante > 0 ? last.ante * 2 : 0,
      durationMinutes: last.durationMinutes
    }])
  }

  function removeLevel(idx) {
    if (levels.length <= 1) return
    setLevels(levels.filter((_, i) => i !== idx).map((l, i) => ({ ...l, levelNumber: i + 1 })))
  }

  function updateLevel(idx, field, value) {
    setLevels(levels.map((l, i) => i === idx ? { ...l, [field]: parseInt(value) || 0 } : l))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (structureId) {
        await api.patch(`/api/structures/blinds/${structureId}`, { name, levels })
      } else {
        await api.post('/api/structures/blinds', { leagueId, name, levels })
      }
      onDone()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  if (loading) return <PageSpinner />

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
      <h3 className="text-white font-semibold">{structureId ? 'Edit' : 'New'} Blind Structure</h3>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <input type="text" placeholder="Structure Name" value={name} onChange={e => setName(e.target.value)}
        className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none" required />

      <div className="space-y-2">
        <div className="grid grid-cols-6 gap-2 text-xs text-gray-400 px-1">
          <span>Lvl</span><span>SB</span><span>BB</span><span>Ante</span><span>Min</span><span></span>
        </div>
        {levels.map((level, idx) => (
          <div key={idx} className="grid grid-cols-6 gap-2">
            <input type="number" value={level.levelNumber} readOnly className="px-2 py-1 bg-gray-900 text-gray-500 rounded border border-gray-700 text-sm" />
            <input type="number" min="1" value={level.smallBlind} onChange={e => updateLevel(idx, 'smallBlind', e.target.value)} className="px-2 py-1 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none" />
            <input type="number" min="1" value={level.bigBlind} onChange={e => updateLevel(idx, 'bigBlind', e.target.value)} className="px-2 py-1 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none" />
            <input type="number" min="0" value={level.ante} onChange={e => updateLevel(idx, 'ante', e.target.value)} className="px-2 py-1 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none" />
            <input type="number" min="1" value={level.durationMinutes} onChange={e => updateLevel(idx, 'durationMinutes', e.target.value)} className="px-2 py-1 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none" />
            <button type="button" onClick={() => removeLevel(idx)} className="text-red-400 hover:text-red-300 text-sm">x</button>
          </div>
        ))}
        <button type="button" onClick={addLevel} className="text-sm text-green-400 hover:text-green-300">+ Add Level</button>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
      </div>
    </form>
  )
}

// =====================
// PAYOUT STRUCTURES
// =====================

function PayoutStructures({ leagueId, isAdmin }) {
  const [structures, setStructures] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { fetchStructures() }, [leagueId])

  async function fetchStructures() {
    try {
      const data = await api.get(`/api/structures/payouts/league/${leagueId}`)
      setStructures(data.structures)
    } catch {} finally { setLoading(false) }
  }

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Payout Structures</h2>
        {isAdmin && (
          <button onClick={() => { setShowCreate(true); setEditing(null) }} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">
            New Structure
          </button>
        )}
      </div>

      {showCreate && (
        <PayoutEditor leagueId={leagueId} onDone={() => { setShowCreate(false); fetchStructures() }} onCancel={() => setShowCreate(false)} />
      )}

      {editing && (
        <PayoutEditor leagueId={leagueId} structureId={editing} onDone={() => { setEditing(null); fetchStructures() }} onCancel={() => setEditing(null)} />
      )}

      {structures.length === 0 && !showCreate ? (
        <p className="text-gray-400 text-sm">No payout structures configured.</p>
      ) : (
        <div className="space-y-2">
          {structures.map(s => (
            <div key={s.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
              <div>
                <span className="text-white font-medium">{s.name}</span>
                {s.is_default && <span className="ml-2 px-2 py-0.5 text-xs bg-green-900 text-green-300 rounded-full">default</span>}
                <span className="text-gray-500 text-sm ml-3">{s.tier_count} tiers</span>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  {!s.is_default && (
                    <button onClick={async () => { await api.post(`/api/structures/payouts/${s.id}/set-default`); fetchStructures() }} className="text-xs text-gray-400 hover:text-white">Set Default</button>
                  )}
                  <button onClick={() => { setEditing(s.id); setShowCreate(false) }} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                  <button onClick={async () => { if (confirm('Delete this structure?')) { try { await api.delete(`/api/structures/payouts/${s.id}`); fetchStructures() } catch (e) { alert(e.message) } } }} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PayoutEditor({ leagueId, structureId, onDone, onCancel }) {
  const [name, setName] = useState('')
  const [tiers, setTiers] = useState([{ minPlayers: 2, maxPlayers: 5, firstPlacePct: 70, secondPlacePct: 30, thirdPlacePct: 0, fourthPlacePct: 0, fifthPlacePct: 0 }])
  const [loading, setLoading] = useState(!!structureId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (structureId) {
      api.get(`/api/structures/payouts/${structureId}`)
        .then(data => {
          setName(data.structure.name)
          setTiers(data.tiers.map(t => ({
            minPlayers: t.min_players, maxPlayers: t.max_players,
            firstPlacePct: parseFloat(t.first_place_pct), secondPlacePct: parseFloat(t.second_place_pct),
            thirdPlacePct: parseFloat(t.third_place_pct), fourthPlacePct: parseFloat(t.fourth_place_pct),
            fifthPlacePct: parseFloat(t.fifth_place_pct)
          })))
        })
        .finally(() => setLoading(false))
    }
  }, [structureId])

  function addTier() {
    const last = tiers[tiers.length - 1]
    setTiers([...tiers, { minPlayers: last.maxPlayers + 1, maxPlayers: last.maxPlayers + 5, firstPlacePct: 50, secondPlacePct: 30, thirdPlacePct: 20, fourthPlacePct: 0, fifthPlacePct: 0 }])
  }

  function removeTier(idx) {
    if (tiers.length <= 1) return
    setTiers(tiers.filter((_, i) => i !== idx))
  }

  function updateTier(idx, field, value) {
    setTiers(tiers.map((t, i) => i === idx ? { ...t, [field]: parseFloat(value) || 0 } : t))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (structureId) {
        await api.patch(`/api/structures/payouts/${structureId}`, { name, tiers })
      } else {
        await api.post('/api/structures/payouts', { leagueId, name, tiers })
      }
      onDone()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  if (loading) return <PageSpinner />

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
      <h3 className="text-white font-semibold">{structureId ? 'Edit' : 'New'} Payout Structure</h3>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <input type="text" placeholder="Structure Name" value={name} onChange={e => setName(e.target.value)}
        className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none" required />

      <div className="space-y-2">
        <div className="grid grid-cols-8 gap-1 text-xs text-gray-400 px-1">
          <span>Min</span><span>Max</span><span>1st%</span><span>2nd%</span><span>3rd%</span><span>4th%</span><span>5th%</span><span></span>
        </div>
        {tiers.map((tier, idx) => (
          <div key={idx} className="grid grid-cols-8 gap-1">
            <input type="number" min="2" value={tier.minPlayers} onChange={e => updateTier(idx, 'minPlayers', e.target.value)} className="px-2 py-1 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none" />
            <input type="number" min="2" value={tier.maxPlayers} onChange={e => updateTier(idx, 'maxPlayers', e.target.value)} className="px-2 py-1 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none" />
            <input type="number" min="0" max="100" value={tier.firstPlacePct} onChange={e => updateTier(idx, 'firstPlacePct', e.target.value)} className="px-2 py-1 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none" />
            <input type="number" min="0" max="100" value={tier.secondPlacePct} onChange={e => updateTier(idx, 'secondPlacePct', e.target.value)} className="px-2 py-1 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none" />
            <input type="number" min="0" max="100" value={tier.thirdPlacePct} onChange={e => updateTier(idx, 'thirdPlacePct', e.target.value)} className="px-2 py-1 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none" />
            <input type="number" min="0" max="100" value={tier.fourthPlacePct} onChange={e => updateTier(idx, 'fourthPlacePct', e.target.value)} className="px-2 py-1 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none" />
            <input type="number" min="0" max="100" value={tier.fifthPlacePct} onChange={e => updateTier(idx, 'fifthPlacePct', e.target.value)} className="px-2 py-1 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none" />
            <button type="button" onClick={() => removeTier(idx)} className="text-red-400 hover:text-red-300 text-sm">x</button>
          </div>
        ))}
        <button type="button" onClick={addTier} className="text-sm text-green-400 hover:text-green-300">+ Add Tier</button>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
      </div>
    </form>
  )
}

// =====================
// POINTS STRUCTURES
// =====================

function PointsStructures({ leagueId, isAdmin }) {
  const [structures, setStructures] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { fetchStructures() }, [leagueId])

  async function fetchStructures() {
    try {
      const data = await api.get(`/api/structures/points/league/${leagueId}`)
      setStructures(data.structures)
    } catch {} finally { setLoading(false) }
  }

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Points Structures</h2>
        {isAdmin && (
          <button onClick={() => { setShowCreate(true); setEditing(null) }} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">
            New Structure
          </button>
        )}
      </div>

      {showCreate && (
        <PointsEditor leagueId={leagueId} onDone={() => { setShowCreate(false); fetchStructures() }} onCancel={() => setShowCreate(false)} />
      )}

      {editing && (
        <PointsEditor leagueId={leagueId} structureId={editing} onDone={() => { setEditing(null); fetchStructures() }} onCancel={() => setEditing(null)} />
      )}

      {structures.length === 0 && !showCreate ? (
        <p className="text-gray-400 text-sm">No points structures configured.</p>
      ) : (
        <div className="space-y-2">
          {structures.map(s => (
            <div key={s.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
              <div>
                <span className="text-white font-medium">{s.name}</span>
                {s.is_default && <span className="ml-2 px-2 py-0.5 text-xs bg-green-900 text-green-300 rounded-full">default</span>}
                <span className="text-gray-500 text-sm ml-3">
                  {s.participation_points}pp / {s.bounty_points}bp
                </span>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  {!s.is_default && (
                    <button onClick={async () => { await api.post(`/api/structures/points/${s.id}/set-default`); fetchStructures() }} className="text-xs text-gray-400 hover:text-white">Set Default</button>
                  )}
                  <button onClick={() => { setEditing(s.id); setShowCreate(false) }} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                  <button onClick={async () => { if (confirm('Delete this structure?')) { try { await api.delete(`/api/structures/points/${s.id}`); fetchStructures() } catch (e) { alert(e.message) } } }} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// =====================
// ROLES MANAGER
// =====================

function RolesManager({ leagueId, isAdmin }) {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [assigning, setAssigning] = useState(null)

  useEffect(() => { fetchRoles() }, [leagueId])

  async function fetchRoles() {
    try {
      const data = await api.get(`/api/roles/league/${leagueId}`)
      setRoles(data.roles)
    } catch {} finally { setLoading(false) }
  }

  async function deleteRole(roleId) {
    if (!confirm('Delete this role? All member assignments will be removed.')) return
    try {
      await api.delete(`/api/roles/${roleId}`)
      fetchRoles()
    } catch (e) { alert(e.message) }
  }

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Custom Roles</h2>
        {isAdmin && (
          <button onClick={() => { setShowCreate(true); setEditing(null); setAssigning(null) }} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">
            New Role
          </button>
        )}
      </div>

      <p className="text-sm text-gray-400">
        Create custom roles with specific game permissions. Assign them to members to delegate responsibilities.
      </p>

      {showCreate && (
        <RoleEditor leagueId={leagueId} onDone={() => { setShowCreate(false); fetchRoles() }} onCancel={() => setShowCreate(false)} />
      )}

      {editing && (
        <RoleEditor leagueId={leagueId} roleId={editing} onDone={() => { setEditing(null); fetchRoles() }} onCancel={() => setEditing(null)} />
      )}

      {assigning && (
        <RoleAssigner leagueId={leagueId} roleId={assigning} onDone={() => { setAssigning(null); fetchRoles() }} onCancel={() => setAssigning(null)} />
      )}

      {roles.length === 0 && !showCreate ? (
        <p className="text-gray-500 text-sm">No custom roles yet.</p>
      ) : (
        <div className="space-y-2">
          {roles.map(r => (
            <div key={r.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-medium">
                    {r.emoji && <span className="mr-1">{r.emoji}</span>}
                    {r.name}
                  </span>
                  <span className="text-gray-500 text-sm ml-3">{r.member_count} member{r.member_count !== 1 ? 's' : ''}</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => { setAssigning(r.id); setEditing(null); setShowCreate(false) }} className="text-xs text-green-400 hover:text-green-300">Members</button>
                    <button onClick={() => { setEditing(r.id); setShowCreate(false); setAssigning(null) }} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                    <button onClick={() => deleteRole(r.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </div>
                )}
              </div>
              {r.description && <p className="text-gray-500 text-sm mt-1">{r.description}</p>}
              {r.permissions && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions).map(p => (
                    <span key={p} className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                      {p.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ALL_PERMISSIONS = [
  { key: 'pause_timer', label: 'Pause/Resume Timer' },
  { key: 'eliminate_player', label: 'Eliminate Players' },
  { key: 'register_player', label: 'Register Players' },
  { key: 'rebuy_player', label: 'Process Rebuys' },
  { key: 'create_event', label: 'Create Events' },
  { key: 'manage_members', label: 'Manage Members' },
  { key: 'manage_structures', label: 'Manage Structures' },
  { key: 'start_game', label: 'Start Games' },
  { key: 'end_game', label: 'End Games' }
]

function RoleEditor({ leagueId, roleId, onDone, onCancel }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(!!roleId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (roleId) {
      api.get(`/api/roles/${roleId}`)
        .then(data => {
          setName(data.role.name)
          setEmoji(data.role.emoji || '')
          setDescription(data.role.description || '')
          const perms = typeof data.role.permissions === 'string' ? JSON.parse(data.role.permissions) : (data.role.permissions || [])
          setPermissions(perms)
        })
        .finally(() => setLoading(false))
    }
  }, [roleId])

  function togglePermission(key) {
    setPermissions(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (roleId) {
        await api.patch(`/api/roles/${roleId}`, { name, emoji, description, permissions })
      } else {
        await api.post('/api/roles', { leagueId, name, emoji, description, permissions })
      }
      onDone()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  if (loading) return <PageSpinner />

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
      <h3 className="text-white font-semibold">{roleId ? 'Edit' : 'New'} Role</h3>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-3">
          <input type="text" placeholder="Role Name" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none" required />
        </div>
        <div>
          <input type="text" placeholder="Emoji" value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2}
            className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none text-center" />
        </div>
      </div>

      <input type="text" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)}
        className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none" />

      <div>
        <label className="block text-sm text-gray-400 mb-2">Permissions</label>
        <div className="grid grid-cols-2 gap-2">
          {ALL_PERMISSIONS.map(p => (
            <label key={p.key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={permissions.includes(p.key)} onChange={() => togglePermission(p.key)}
                className="rounded border-gray-600 bg-gray-900 text-green-500 focus:ring-green-500" />
              <span className="text-sm text-gray-300">{p.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
      </div>
    </form>
  )
}

function RoleAssigner({ leagueId, roleId, onDone, onCancel }) {
  const [role, setRole] = useState(null)
  const [assignedMembers, setAssignedMembers] = useState([])
  const [allMembers, setAllMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [roleId])

  async function fetchData() {
    try {
      const [roleData, membersData] = await Promise.all([
        api.get(`/api/roles/${roleId}`),
        api.get(`/api/members/league/${leagueId}`)
      ])
      setRole(roleData.role)
      setAssignedMembers(roleData.members)
      setAllMembers(membersData.members)
    } catch {} finally { setLoading(false) }
  }

  async function assignMember(userId) {
    try {
      await api.post(`/api/roles/${roleId}/assign`, { userId })
      fetchData()
    } catch (e) { alert(e.message) }
  }

  async function unassignMember(userId) {
    try {
      await api.delete(`/api/roles/${roleId}/unassign/${userId}`)
      fetchData()
    } catch (e) { alert(e.message) }
  }

  if (loading) return <PageSpinner />

  const assignedIds = new Set(assignedMembers.map(m => m.user_id))
  const unassigned = allMembers.filter(m => !assignedIds.has(m.user_id))

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">
          {role?.emoji && <span className="mr-1">{role.emoji}</span>}
          {role?.name} - Members
        </h3>
        <button onClick={onCancel} className="text-sm text-gray-400 hover:text-white">Close</button>
      </div>

      {assignedMembers.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Assigned</p>
          <div className="space-y-1">
            {assignedMembers.map(m => (
              <div key={m.user_id} className="flex items-center justify-between py-1.5 px-2 bg-gray-900 rounded">
                <span className="text-sm text-white">{m.display_name}</span>
                <button onClick={() => unassignMember(m.user_id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {unassigned.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Available Members</p>
          <div className="space-y-1">
            {unassigned.map(m => (
              <div key={m.id} className="flex items-center justify-between py-1.5 px-2 bg-gray-900 rounded">
                <span className="text-sm text-gray-300">{m.display_name}</span>
                <button onClick={() => assignMember(m.user_id)} className="text-xs text-green-400 hover:text-green-300">Assign</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onDone} className="px-4 py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-600">Done</button>
    </div>
  )
}

function PointsEditor({ leagueId, structureId, onDone, onCancel }) {
  const [name, setName] = useState('')
  const [participationPoints, setParticipationPoints] = useState(1)
  const [bountyPoints, setBountyPoints] = useState(1)
  const [positionPoints, setPositionPoints] = useState([
    { position: 1, points: 10 }, { position: 2, points: 7 }, { position: 3, points: 5 },
    { position: 4, points: 3 }, { position: 5, points: 2 }
  ])
  const [loading, setLoading] = useState(!!structureId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (structureId) {
      api.get(`/api/structures/points/${structureId}`)
        .then(data => {
          setName(data.structure.name)
          setParticipationPoints(data.structure.participation_points)
          setBountyPoints(data.structure.bounty_points)
          if (data.structure.position_points) {
            setPositionPoints(typeof data.structure.position_points === 'string'
              ? JSON.parse(data.structure.position_points)
              : data.structure.position_points)
          }
        })
        .finally(() => setLoading(false))
    }
  }, [structureId])

  function updatePosition(idx, value) {
    setPositionPoints(positionPoints.map((p, i) => i === idx ? { ...p, points: parseInt(value) || 0 } : p))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = { name, participationPoints, bountyPoints, positionPoints }
      if (structureId) {
        await api.patch(`/api/structures/points/${structureId}`, body)
      } else {
        await api.post('/api/structures/points', { leagueId, ...body })
      }
      onDone()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  if (loading) return <PageSpinner />

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
      <h3 className="text-white font-semibold">{structureId ? 'Edit' : 'New'} Points Structure</h3>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <input type="text" placeholder="Structure Name" value={name} onChange={e => setName(e.target.value)}
        className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none" required />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Participation Points</label>
          <input type="number" min="0" value={participationPoints} onChange={e => setParticipationPoints(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Bounty Points</label>
          <input type="number" min="0" value={bountyPoints} onChange={e => setBountyPoints(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-green-500 focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">Position Points</label>
        <div className="grid grid-cols-5 gap-2">
          {positionPoints.map((pp, idx) => (
            <div key={idx}>
              <label className="text-xs text-gray-500">#{pp.position}</label>
              <input type="number" min="0" value={pp.points} onChange={e => updatePosition(idx, e.target.value)}
                className="w-full px-2 py-1 bg-gray-900 text-white rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
      </div>
    </form>
  )
}
