import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useLeague } from '../../contexts/LeagueContext'
import { useAuth } from '../../contexts/AuthContext'

export default function CalendarTab() {
  const { currentLeague, isAdmin } = useLeague()
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

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
          user_id,
          status,
          note,
          users (
            id,
            full_name,
            display_name,
            avatar_url
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

  // Demo data for preview
  const demoEvents = [
    {
      id: 1,
      title: 'Saturday Night Showdown',
      event_date: '2025-12-28',
      start_time: '19:00',
      location_name: "Ron's House",
      location_address: '123 Main St, Waxhaw NC 28173',
      buy_in: 20,
      max_players: 10,
      rsvps: {
        going: [
          { name: 'Ron H.', initials: 'RH', color: 'bg-gold text-felt-dark', isHost: true },
          { name: 'Mike D.', initials: 'MD', color: 'bg-chip-blue' },
          { name: 'Jake T.', initials: 'JT', color: 'bg-chip-red' },
          { name: 'Tommy C.', initials: 'TC', color: 'bg-green-600' },
          { name: 'Steve W.', initials: 'SW', color: 'bg-gray-500' },
          { name: 'Brian K.', initials: 'BK', color: 'bg-gray-600' },
          { name: 'Alex J.', initials: 'AJ', color: 'bg-chip-blue' },
        ],
        maybe: [
          { name: 'Chris M.', initials: 'CM', note: 'Depends on work' },
          { name: 'Dan W.', initials: 'DW', note: 'Wife might have plans' },
        ],
        no: [
          { name: 'Pete L.', initials: 'PL', note: 'Family in town' },
        ],
        pending: [
          { name: 'Nick R.', initials: 'NR' },
          { name: 'Eric H.', initials: 'EH' },
        ]
      },
      myRsvp: 'going'
    }
  ]

  const displayEvents = events.length > 0 ? events : demoEvents

  return (
    <div className="px-4 py-4">
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-white">December 2025</h2>
        {isAdmin && (
          <button className="btn btn-primary text-sm py-2 px-4">
            + New Game
          </button>
        )}
      </div>

      {/* Events list */}
      <div className="space-y-4">
        {displayEvents.map((event, idx) => (
          <EventCard key={event.id || idx} event={event} isFirst={idx === 0} />
        ))}
      </div>
    </div>
  )
}

function EventCard({ event, isFirst }) {
  const [myRsvp, setMyRsvp] = useState(event.myRsvp || null)

  const handleRsvp = (status) => {
    setMyRsvp(status)
    // TODO: Save to database
  }

  return (
    <div className={`card ${isFirst ? 'card-gold' : ''}`}>
      {/* Event header */}
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
            {event.start_time?.substring(0, 5)} • {event.location_name}
          </p>
          <p className="text-sm text-white/60">
            ${event.buy_in} Buy-in • Max {event.max_players} players
          </p>
        </div>
      </div>

      {/* RSVP summary */}
      {event.rsvps && (
        <div className="border-t border-white/10 pt-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-white/50">
              RSVPs ({event.rsvps.going?.length || 0} of {event.max_players} spots)
            </span>
            <span className="text-xs text-green-400">
              {event.max_players - (event.rsvps.going?.length || 0)} spots left
            </span>
          </div>

          {/* Going */}
          {event.rsvps.going?.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-green-400 mb-2">
                ✓ Going ({event.rsvps.going.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {event.rsvps.going.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-green-600/20 px-2 py-1 rounded-full"
                  >
                    <div className={`w-5 h-5 rounded-full ${p.color || 'bg-gray-500'} flex items-center justify-center text-[10px]`}>
                      {p.initials}
                    </div>
                    <span className="text-xs">{p.name}</span>
                    {p.isHost && <span className="text-gold text-[10px]">★</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maybe */}
          {event.rsvps.maybe?.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-yellow-400 mb-2">
                ? Maybe ({event.rsvps.maybe.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {event.rsvps.maybe.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-yellow-600/20 px-2 py-1 rounded-full"
                  >
                    <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-[10px]">
                      {p.initials}
                    </div>
                    <span className="text-xs">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No response */}
          {event.rsvps.pending?.length > 0 && (
            <div>
              <div className="text-xs text-white/40 mb-2">
                ⏳ No Response ({event.rsvps.pending.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {event.rsvps.pending.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-full opacity-60"
                  >
                    <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px]">
                      {p.initials}
                    </div>
                    <span className="text-xs">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RSVP buttons */}
      <div className="border-t border-white/10 pt-4">
        <div className="text-xs text-white/50 mb-2">Your Response</div>
        <div className="flex gap-2">
          <button
            onClick={() => handleRsvp('going')}
            className={`rsvp-btn ${myRsvp === 'going' ? 'rsvp-yes active' : 'rsvp-yes'}`}
          >
            ✓ Going
          </button>
          <button
            onClick={() => handleRsvp('maybe')}
            className={`rsvp-btn ${myRsvp === 'maybe' ? 'rsvp-maybe active' : 'rsvp-maybe'}`}
          >
            ? Maybe
          </button>
          <button
            onClick={() => handleRsvp('no')}
            className={`rsvp-btn ${myRsvp === 'no' ? 'rsvp-no active' : 'rsvp-no'}`}
          >
            ✗ Can't
          </button>
        </div>
      </div>
    </div>
  )
}
