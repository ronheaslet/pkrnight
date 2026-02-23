import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  status: string;
  buyInAmount: number;
  rsvpCounts?: { going: number; maybe: number; notGoing: number; pending: number };
  myRsvpStatus?: string;
}

export default function Calendar() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const currentUser = useGameStore((s) => s.currentUser);

  const isOwnerOrAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.roles.includes("OWNER") ||
    currentUser?.roles.includes("ADMIN");

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Load events for the club
  const eventsQuery = useQuery({
    queryKey: ["clubEvents", clubId],
    queryFn: () =>
      api
        .get(`/clubs/${clubId}/events`, { params: { upcoming: false, limit: 100 } })
        .then((r) => r.data),
    enabled: !!clubId,
  });

  const events: CalendarEvent[] = eventsQuery.data ?? [];

  // Group events by day-of-month for current month view
  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    events.forEach((ev) => {
      const d = new Date(ev.startsAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(ev);
      }
    });
    return map;
  }, [events, year, month]);

  // Calendar math
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    setSelectedDay(null);
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    setSelectedDay(null);
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function isToday(day: number) {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  }

  const selectedEvents = selectedDay ? eventsByDay[selectedDay] ?? [] : [];

  const rsvpBadgeColor: Record<string, string> = {
    GOING: "bg-green-500",
    MAYBE: "bg-yellow-500",
    NOT_GOING: "bg-red-500",
    PENDING: "bg-[#6b7280]",
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold">Calendar</h1>
        {isOwnerOrAdmin && (
          <button
            onClick={() => navigate("/events/create")}
            className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center hover:bg-green-700 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Month Nav */}
      <div className="px-5 py-3 flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 text-[#9ca3af] hover:text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-lg font-semibold">{monthLabel}</span>
        <button onClick={nextMonth} className="p-2 text-[#9ca3af] hover:text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Names */}
      <div className="px-5">
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs text-[#6b7280] py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`blank-${i}`} className="aspect-square" />;
            }
            const hasEvents = !!eventsByDay[day];
            const selected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() =>
                  setSelectedDay(selected ? null : hasEvents ? day : null)
                }
                className={`aspect-square flex flex-col items-center justify-center rounded-lg transition-colors relative ${
                  selected
                    ? "bg-green-600/30 border border-green-500"
                    : isToday(day)
                      ? "bg-[#1a1a1a] border border-[#374151]"
                      : "hover:bg-[#1a1a1a]"
                }`}
              >
                <span
                  className={`text-sm ${
                    isToday(day) ? "font-bold text-green-400" : ""
                  }`}
                >
                  {day}
                </span>
                {hasEvents && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Event Cards (bottom sheet style) */}
      {selectedDay !== null && (
        <div className="px-5 mt-4">
          <h3 className="text-sm text-[#9ca3af] mb-2">
            {new Date(year, month, selectedDay).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h3>
          {selectedEvents.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-xl p-4 text-center">
              <p className="text-sm text-[#6b7280]">No events this day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev) => {
                const t = new Date(ev.startsAt);
                const tStr = t.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });
                return (
                  <button
                    key={ev.id}
                    onClick={() => navigate(`/events/${ev.id}`)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-left hover:bg-[#222] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{ev.title}</h4>
                      {ev.myRsvpStatus && (
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            rsvpBadgeColor[ev.myRsvpStatus] ?? "bg-[#6b7280]"
                          }`}
                        />
                      )}
                    </div>
                    <p className="text-sm text-[#9ca3af] mt-1">
                      {tStr} · ${ev.buyInAmount} buy-in
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
