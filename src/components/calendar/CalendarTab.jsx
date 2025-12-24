import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useLeague } from '../../contexts/LeagueContext'
import { useAuth } from '../../contexts/AuthContext'

export default function CalendarTab() {
  const { currentLeague, isAdmin } = useLeague()
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (currentLeague) {
      fetchEvents()
    }
  }, [currentLeague])

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_rsvps (
          id,
          user_id,
          status,
          note,
          users (
            id,
            full_name,
            display_name
          )
        )
      `)
      .eq('league_id', currentLeague.id)
      .order('event_date', { ascending: true })

    if (!error && data) {
      setEvents(data)
    }
    setLoading(false)
  }

  const handleEventCreated = (newEvent) => {
    setEvents(prev => [...prev, { ...newEvent, event_rsvps: [] }].sort((a, b) => 
      new Date(a.event_date) - new Date(b.event_date)
    ))
    setShowCreateModal(false)
  }

  const handleRsvpUpdate = (eventId, newRsvp) => {
    setEvents(prev => prev.map(event => {
      if (event.id !== eventId) return event
      
      const existingIdx = event.event_rsvps.findIndex(r => r.user_id === user.id)
      let newRsvps = [...event.event_rsvps]
      
      if (existingIdx >= 0) {
        newRsvps[existingIdx] = { ...newRsvps[existingIdx], status: newRsvp }
      } else {
        newRsvps.push({ user_id: user.id, status: newRsvp, users: { full_name: 'You' } })
      }
      
      return { ...event, event_rsvps: newRsvps }
    }))
  }

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-white">{currentMonth}</h2>
        {isAdmin && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary text-sm py-2 px-4"
          >
            + New Game
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-white/50">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📅</div>
          <div className="text-white/60 mb-4">No games scheduled yet</div>
          {isAdmin && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              Schedule First Game
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event, idx) => (
            <EventCard 
              key={event.id} 
              event={event} 
              isFirst={idx === 0}
              userId={user?.id}
              onRsvpUpdate={(status) => handleRsvpUpdate(event.id, status)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateEventModal
          leagueId={currentLeague.id}
          userId={user.id}
          defaultBuyIn={currentLeague.default_buy_in}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleEventCreated}
        />
      )}
    </div>
  )
}

function EventCard({ event, isFirst, userId, onRsvpUpdate }) {
  const [myRsvp, setMyRsvp] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const userRsvp = event.event_rsvps?.find(r => r.user_id === userId)
    setMyRsvp(userRsvp?.status || null)
  }, [event, userId])

  const handleRsvp = async (status) => {
    if (saving) return
    setSaving(true)
    
    const existingRsvp = event.event_rsvps?.find(r => r.user_id === userId)
    
    try {
      if (existingRsvp) {
        await supabase
          .from('event_rsvps')
          .update({ status })
          .eq('id', existingRsvp.id)
      } else {
        await supabase
          .from('event_rsvps')
          .insert({
            event_id: event.id,
            user_id: userId,
            status
          })
      }
      
      setMyRsvp(status)
      onRsvpUpdate(status)
    } catch (err) {
      console.error('RSVP error:', err)
    } finally {
      setSaving(false)
    }
  }

  const rsvpGroups = {
    going: event.event_rsvps?.filter(r => r.status === 'going') || [],
    maybe: event.event_rsvps?.filter(r => r.status === 'maybe') || [],
    not_going: event.event_rsvps?.filter(r => r.status === 'not_going') || []
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  return (
    <div className={`card ${isFirst ? 'border-gold/50 border' : ''}`}>
      <div className="flex gap-4 mb-4">
        <div className="w-14 h-14 bg-gold/20 rounded-xl flex flex-col items-center justify-center">
          <div className="font-display text-xl text-gold">
            {new Date(event.event_date + 'T00:00').getDate()}
          </div>
          <div className="text-xs text-gold/70 uppercase">
            {new Date(event.event_date + 'T00:00').toLocaleDateString('en', { month: 'short' })}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{event.title}</h3>
          <p className="text-sm text-white/60">
            {event.start_time && formatTime(event.start_time)}
            {event.location_name && ` • ${event.location_name}`}
          </p>
          <p className="text-sm text-white/60">
            ${event.buy_in || 20} Buy-in • Max {event.max_players || 10} players
          </p>
        </div>
      </div>

      <div className="border-t border-white/10 pt-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-white/50">
            RSVPs ({rsvpGroups.going.length} of {event.max_players || 10} spots)
          </span>
          <span className="text-xs text-green-400">
            {(event.max_players || 10) - rsvpGroups.going.length} spots left
          </span>
        </div>

        {rsvpGroups.going.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-green-400 mb-2">✓ Going ({rsvpGroups.going.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {rsvpGroups.going.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-green-600/20 px-2 py-1 rounded-full">
                  <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-[10px]">
                    {getInitials(r.users?.display_name || r.users?.full_name)}
                  </div>
                  <span className="text-xs">{r.users?.display_name || r.users?.full_name || 'Unknown'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {rsvpGroups.maybe.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-yellow-400 mb-2">? Maybe ({rsvpGroups.maybe.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {rsvpGroups.maybe.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-yellow-600/20 px-2 py-1 rounded-full">
                  <div className="w-5 h-5 rounded-full bg-yellow-600 flex items-center justify-center text-[10px]">
                    {getInitials(r.users?.display_name || r.users?.full_name)}
                  </div>
                  <span className="text-xs">{r.users?.display_name || r.users?.full_name || 'Unknown'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {rsvpGroups.not_going.length > 0 && (
          <div>
            <div className="text-xs text-red-400 mb-2">✗ Can't Go ({rsvpGroups.not_going.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {rsvpGroups.not_going.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-red-600/20 px-2 py-1 rounded-full">
                  <div className="w-5 h-5 rounded-full bg-red-600/50 flex items-center justify-center text-[10px]">
                    {getInitials(r.users?.display_name || r.users?.full_name)}
                  </div>
                  <span className="text-xs">{r.users?.display_name || r.users?.full_name || 'Unknown'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="text-xs text-white/50 mb-2">Your Response</div>
        <div className="flex gap-2">
          <button
            onClick={() => handleRsvp('going')}
            disabled={saving}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              myRsvp === 'going' ? 'bg-green-600 text-white' : 'bg-green-600/20 text-green-400 hover:bg-green-600/40'
            }`}
          >
            ✓ Going
          </button>
          <button
            onClick={() => handleRsvp('maybe')}
            disabled={saving}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              myRsvp === 'maybe' ? 'bg-yellow-600 text-white' : 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/40'
            }`}
          >
            ? Maybe
          </button>
          <button
            onClick={() => handleRsvp('not_going')}
            disabled={saving}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              myRsvp === 'not_going' ? 'bg-red-600 text-white' : 'bg-red-600/20 text-red-400 hover:bg-red-600/40'
            }`}
          >
            ✗ Can't
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateEventModal({ leagueId, userId, defaultBuyIn, onClose, onCreated }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    event_date: '',
    start_time: '19:00',
    location_name: '',
    location_address: '',
    buy_in: defaultBuyIn || 20,
    max_players: 10,
    host_notes: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: insertError } = await supabase
        .from('events')
        .insert({
          league_id: leagueId,
          created_by: userId,
          title: form.title,
          event_date: form.event_date,
          start_time: form.start_time || null,
          location_name: form.location_name || null,
          location_address: form.location_address || null,
          buy_in: form.buy_in,
          max_players: form.max_players,
          host_notes: form.host_notes || null,
          status: 'scheduled'
        })
        .select()
        .single()

      if (insertError) throw insertError
      onCreated(data)
    } catch (err) {
      setError(err.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-felt-dark rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-xl text-gold">New Game Night</h2>
          <button onClick={onClose} className="text-white/60 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-white/60 mb-1">Event Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              className="input"
              placeholder="e.g., Saturday Night Showdown"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Date</label>
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => setForm(f => ({ ...f, event_date: e.target.value }))}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Location Name</label>
            <input
              type="text"
              value={form.location_name}
              onChange={(e) => setForm(f => ({ ...f, location_name: e.target.value }))}
              className="input"
              placeholder="e.g., Ron's House"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Address (optional)</label>
            <input
              type="text"
              value={form.location_address}
              onChange={(e) => setForm(f => ({ ...f, location_address: e.target.value }))}
              className="input"
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Buy-in ($)</label>
              <input
                type="number"
                value={form.buy_in}
                onChange={(e) => setForm(f => ({ ...f, buy_in: Number(e.target.value) }))}
                className="input text-center"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Max Players</label>
              <input
                type="number"
                value={form.max_players}
                onChange={(e) => setForm(f => ({ ...f, max_players: Number(e.target.value) }))}
                className="input text-center"
                min={2}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Notes (optional)</label>
            <textarea
              value={form.host_notes}
              onChange={(e) => setForm(f => ({ ...f, host_notes: e.target.value }))}
              className="input min-h-[80px] resize-none"
              placeholder="BYOB, food provided, etc."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-gold text-felt-dark font-semibold disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
