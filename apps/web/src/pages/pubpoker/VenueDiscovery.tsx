import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { mockVenues } from "../../lib/pubPokerMocks";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const publicApi = axios.create({ baseURL });

interface VenueInfo {
  clubId: string;
  clubName: string;
  venueName: string;
  address: string;
  operatingNights: string[];
}

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const DAYS_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function getTodayDay(): string {
  const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  return days[new Date().getDay()];
}

export default function VenueDiscovery() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const today = getTodayDay();

  const venuesQuery = useQuery<VenueInfo[]>({
    queryKey: ["publicVenues"],
    queryFn: async () => {
      try {
        const res = await publicApi.get("/pub/venues");
        return res.data ?? [];
      } catch {
        return mockVenues;
      }
    },
  });

  const venues = venuesQuery.data ?? mockVenues;

  const filtered = search.trim()
    ? venues.filter(
        (v) =>
          v.venueName.toLowerCase().includes(search.toLowerCase()) ||
          v.address.toLowerCase().includes(search.toLowerCase()) ||
          v.clubName.toLowerCase().includes(search.toLowerCase())
      )
    : venues;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
      {/* Header */}
      <div className="pt-10 pb-4 text-center">
        <h1 className="text-2xl font-bold">
          <span className="text-green-400">PKR</span> Night
        </h1>
      </div>

      <div className="px-5">
        <h2 className="text-xl font-bold mb-1">
          Find a Game Near You {"🃏"}
        </h2>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by city or venue name..."
          className="w-full mt-3 px-4 py-3 bg-[#1a1a1a] rounded-xl text-sm border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#4b5563]"
        />
      </div>

      {/* Venue list */}
      <div className="px-5 mt-4 flex-1 pb-8">
        {venuesQuery.isLoading ? (
          <div className="text-center py-8 text-[#6b7280] animate-pulse">
            Loading venues...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl p-6 text-center border border-[#2a2a2a]">
            <p className="text-[#6b7280] text-sm mb-3">
              No public venues found.
            </p>
            <p className="text-[#4b5563] text-xs mb-4">
              Are you running a pub poker league?
            </p>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Start your free club
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((venue) => (
              <div
                key={venue.clubId}
                className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]"
              >
                <h3 className="font-bold text-lg">{venue.venueName}</h3>
                <p className="text-xs text-[#6b7280] mt-1">{venue.address}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {DAYS_ORDER.map((day) => {
                    const isActive = venue.operatingNights.includes(day);
                    const isToday = day === today;
                    return (
                      <span
                        key={day}
                        className={`px-2 py-0.5 text-[10px] rounded-full ${
                          isActive && isToday
                            ? "bg-green-600 text-white font-bold"
                            : isActive
                              ? "bg-green-900/30 text-green-400"
                              : "bg-[#0f0f0f] text-[#374151]"
                        }`}
                      >
                        {DAY_LABELS[day]}
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-[#9ca3af] mt-2">
                  {venue.clubName}
                </p>
                <button
                  onClick={() => navigate(`/clubs/${venue.clubId}`)}
                  className="mt-2 text-xs text-green-500 hover:text-green-400"
                >
                  View Club
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-6 text-center">
        <p className="text-xs text-[#4b5563]">
          Powered by PKR Night — Poker Club Management
        </p>
      </div>
    </div>
  );
}
