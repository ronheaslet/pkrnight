import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";

interface ClubListItem {
  club: {
    id: string;
    name: string;
    slug: string;
    clubType: string;
    planTier: string;
    primaryColor: string | null;
    logoUrl: string | null;
    tagline: string | null;
  };
  systemRole: string;
  memberCount: number;
}

export default function ClubSelect() {
  const navigate = useNavigate();
  const setAuthToken = useGameStore((s) => s.setAuthToken);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);
  const [showCreate, setShowCreate] = useState(false);

  const clubsQuery = useQuery({
    queryKey: ["myClubs"],
    queryFn: () => api.get("/auth/me/clubs").then((r) => r.data),
  });

  const switchMutation = useMutation({
    mutationFn: (clubId: string) =>
      api.post("/auth/switch-club", { clubId }).then((r) => r.data),
    onSuccess: (data, clubId) => {
      setAuthToken(data.token);
      // Decode JWT to update currentUser
      try {
        const payload = JSON.parse(atob(data.token.split(".")[1]));
        setCurrentUser(payload);
      } catch {
        // Token will be decoded on next API call
      }
      navigate(`/clubs/${clubId}`);
    },
  });

  const clubs: ClubListItem[] = clubsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-10 pb-6">
        <div className="text-3xl mb-2">{"\u2663"}</div>
        <h1 className="text-2xl font-bold">Your Clubs</h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Select a club or create a new one
        </p>
      </div>

      {/* Club List */}
      <div className="flex-1 px-6 space-y-3">
        {clubsQuery.isLoading ? (
          <div className="text-center py-8 text-[#6b7280]">
            Loading your clubs...
          </div>
        ) : clubs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#6b7280] mb-4">
              You're not a member of any clubs yet.
            </p>
            <p className="text-[#4b5563] text-sm">
              Create one to get started!
            </p>
          </div>
        ) : (
          clubs.map((item) => (
            <button
              key={item.club.id}
              onClick={() => switchMutation.mutate(item.club.id)}
              disabled={switchMutation.isPending}
              className="w-full bg-[#1a1a1a] rounded-xl p-4 flex items-center gap-4 hover:bg-[#252525] transition-colors text-left"
            >
              {/* Club Avatar */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                style={{
                  backgroundColor: item.club.primaryColor || "#374151",
                }}
              >
                {item.club.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">
                    {item.club.name}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      item.systemRole === "OWNER"
                        ? "bg-amber-900/40 text-amber-400"
                        : item.systemRole === "ADMIN"
                          ? "bg-blue-900/40 text-blue-400"
                          : "bg-[#374151] text-[#9ca3af]"
                    }`}
                  >
                    {item.systemRole}
                  </span>
                </div>
                {item.club.tagline && (
                  <p className="text-xs text-[#6b7280] truncate mt-0.5">
                    {item.club.tagline}
                  </p>
                )}
                <p className="text-[10px] text-[#4b5563] mt-0.5">
                  {item.memberCount} member
                  {item.memberCount !== 1 ? "s" : ""}
                </p>
              </div>

              <svg
                className="w-5 h-5 text-[#4b5563] flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ))
        )}
      </div>

      {/* Create Club Button */}
      <div className="px-6 py-6">
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-3.5 bg-green-600 hover:bg-green-700 rounded-xl font-medium transition-colors text-center"
        >
          Create a Club
        </button>
      </div>

      {/* Create Club Modal */}
      {showCreate && (
        <CreateClubModal
          onClose={() => setShowCreate(false)}
          onCreated={(clubId) => {
            switchMutation.mutate(clubId);
          }}
        />
      )}
    </div>
  );
}

function CreateClubModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (clubId: string) => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [clubType, setClubType] = useState<"HOME_GAME" | "PUB_POKER" | "CIRCUIT">(
    "HOME_GAME"
  );
  const [city, setCity] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [error, setError] = useState("");

  // Phase 12: inline venue add step after circuit creation
  const [createdCircuitId, setCreatedCircuitId] = useState<string | null>(null);
  const [venueSearch, setVenueSearch] = useState("");
  const [venueResults, setVenueResults] = useState<{ club: { id: string; name: string; slug: string } }[]>([]);
  const [addingVenue, setAddingVenue] = useState(false);

  // Auto-generate slug from name
  function handleNameChange(value: string) {
    setName(value);
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
    setSlug(autoSlug);
  }

  const isCircuit = clubType === "CIRCUIT";

  const createClubMutation = useMutation({
    mutationFn: () =>
      api
        .post("/clubs", { name, slug, clubType, timezone })
        .then((r) => r.data),
    onSuccess: (data) => {
      const clubId = data.club?.id || data.id;
      onCreated(clubId);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setError(err.response?.data?.error || "Failed to create club");
    },
  });

  const createCircuitMutation = useMutation({
    mutationFn: () =>
      api
        .post("/circuits", { name, slug, city: city || undefined })
        .then((r) => r.data),
    onSuccess: (data) => {
      setCreatedCircuitId(data.id);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setError(err.response?.data?.error || "Failed to create circuit");
    },
  });

  // Search user's clubs to add as venue
  function handleVenueSearch(q: string) {
    setVenueSearch(q);
    if (!q.trim()) {
      setVenueResults([]);
      return;
    }
    api.get("/auth/me/clubs").then((r) => {
      const clubs = (r.data ?? []) as { club: { id: string; name: string; slug: string; clubType: string } }[];
      setVenueResults(
        clubs.filter(
          (c) =>
            c.club.clubType === "PUB_POKER" &&
            c.club.name.toLowerCase().includes(q.toLowerCase())
        )
      );
    }).catch(() => {});
  }

  async function handleAddVenue(clubId: string) {
    if (!createdCircuitId) return;
    setAddingVenue(true);
    try {
      await api.post(`/circuits/${createdCircuitId}/venues`, { clubId });
      navigate(`/circuits/${createdCircuitId}`, { replace: true });
    } catch {
      setError("Failed to add venue");
    } finally {
      setAddingVenue(false);
    }
  }

  function handleCreate() {
    if (!name || !slug) return;
    if (isCircuit) {
      createCircuitMutation.mutate();
    } else {
      createClubMutation.mutate();
    }
  }

  const isPending = createClubMutation.isPending || createCircuitMutation.isPending;

  // Show inline venue add step after circuit creation
  if (createdCircuitId) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
        <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-1">Circuit Created!</h3>
          <p className="text-[#6b7280] text-sm mb-4">
            Add your first venue to get started, or skip for now.
          </p>

          <input
            type="text"
            value={venueSearch}
            onChange={(e) => handleVenueSearch(e.target.value)}
            placeholder="Search your pub poker clubs..."
            className="w-full px-4 py-2.5 bg-[#0f0f0f] rounded-lg text-sm border border-[#374151] focus:border-[#D4AF37] focus:outline-none placeholder-[#4b5563]"
          />

          {venueResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {venueResults.map((v) => (
                <button
                  key={v.club.id}
                  onClick={() => handleAddVenue(v.club.id)}
                  disabled={addingVenue}
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#0f0f0f] rounded-lg hover:bg-[#252525] transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#374151] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {v.club.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm truncate">{v.club.name}</span>
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

          <button
            onClick={() => navigate(`/circuits/${createdCircuitId}`, { replace: true })}
            className="w-full mt-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-[#9ca3af] transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">
            {isCircuit ? "Create a Circuit" : "Create a Club"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#9ca3af] mb-1">
              {isCircuit ? "Circuit Name" : "Club Name"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={isCircuit ? "Metro Poker League" : "Ron's Home Game"}
              className="w-full px-4 py-2.5 bg-[#0f0f0f] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#4b5563]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#9ca3af] mb-1">
              Slug (URL-friendly)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder={isCircuit ? "metro-poker-league" : "rons-home-game"}
              className="w-full px-4 py-2.5 bg-[#0f0f0f] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#4b5563] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-[#9ca3af] mb-1">
              Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setClubType("HOME_GAME")}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  clubType === "HOME_GAME"
                    ? "bg-green-600 text-white"
                    : "bg-[#0f0f0f] text-[#9ca3af] border border-[#374151]"
                }`}
              >
                Home Game
              </button>
              <button
                onClick={() => setClubType("PUB_POKER")}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  clubType === "PUB_POKER"
                    ? "bg-green-600 text-white"
                    : "bg-[#0f0f0f] text-[#9ca3af] border border-[#374151]"
                }`}
              >
                Pub Poker
              </button>
              <button
                onClick={() => setClubType("CIRCUIT")}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  clubType === "CIRCUIT"
                    ? "bg-[#D4AF37] text-[#0f0f0f]"
                    : "bg-[#0f0f0f] text-[#9ca3af] border border-[#374151]"
                }`}
              >
                Circuit
              </button>
            </div>
            {isCircuit && (
              <p className="text-[10px] text-[#6b7280] mt-1.5">
                A circuit connects multiple pub poker venues into a regional league with shared standings.
              </p>
            )}
          </div>

          {isCircuit && (
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1">
                City / Region
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Tampa, FL"
                className="w-full px-4 py-2.5 bg-[#0f0f0f] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#4b5563]"
              />
            </div>
          )}

          {!isCircuit && (
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0f0f0f] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none"
              >
                <option value="America/New_York">Eastern (ET)</option>
                <option value="America/Chicago">Central (CT)</option>
                <option value="America/Denver">Mountain (MT)</option>
                <option value="America/Los_Angeles">Pacific (PT)</option>
                <option value="America/Anchorage">Alaska (AKT)</option>
                <option value="Pacific/Honolulu">Hawaii (HST)</option>
              </select>
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={!name || !slug || isPending}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              isCircuit
                ? "bg-[#D4AF37] hover:bg-[#c9a432] disabled:bg-[#D4AF37]/40 text-[#0f0f0f]"
                : "bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:text-green-300"
            }`}
          >
            {isPending
              ? "Creating..."
              : isCircuit
                ? "Create Circuit"
                : "Create Club"}
          </button>
        </div>
      </div>
    </div>
  );
}
