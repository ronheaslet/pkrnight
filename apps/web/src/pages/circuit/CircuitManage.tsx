import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "../../lib/api";

type Tab = "venues" | "seasons" | "settings";

interface CircuitData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  isPublic: boolean;
  isActive: boolean;
}

interface VenueItem {
  id: string;
  clubId: string;
  joinedAt: string;
  club: {
    id: string;
    name: string;
    slug: string;
    venueCity?: string;
    venueProfile?: { venueName: string; address: string } | null;
    _count: { games: number };
  };
}

interface SeasonItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  _count: { standings: number };
}

export default function CircuitManage() {
  const { circuitId } = useParams<{ circuitId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("venues");

  const circuitQuery = useQuery<CircuitData>({
    queryKey: ["circuit", circuitId],
    queryFn: () => api.get(`/circuits/${circuitId}`).then((r) => r.data),
    enabled: !!circuitId,
  });

  if (circuitQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <div className="animate-pulse text-[#9ca3af]">Loading...</div>
      </div>
    );
  }

  const circuit = circuitQuery.data;
  if (!circuit) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <p className="text-[#6b7280]">Circuit not found.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "venues", label: "Venues" },
    { id: "seasons", label: "Seasons" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate(`/circuits/${circuitId}`)}
          className="p-1 hover:bg-white/10 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">Manage {circuit.name}</h1>
      </div>

      {/* Tabs */}
      <div className="px-5 pb-4">
        <div className="flex gap-1 bg-[#1a1a1a] rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[#D4AF37] text-[#0f0f0f]"
                  : "text-[#9ca3af] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "venues" && <VenuesTab circuitId={circuitId!} />}
      {activeTab === "seasons" && <SeasonsTab circuitId={circuitId!} />}
      {activeTab === "settings" && <SettingsTab circuitId={circuitId!} circuit={circuit} />}
    </div>
  );
}

// ============================================================
// Venues Tab
// ============================================================

function VenuesTab({ circuitId }: { circuitId: string }) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; slug: string; venueCity: string | null }>>([]);
  const [searching, setSearching] = useState(false);

  const venuesQuery = useQuery<VenueItem[]>({
    queryKey: ["circuitVenues", circuitId],
    queryFn: () => api.get(`/circuits/${circuitId}/venues`).then((r) => r.data),
  });

  const addVenueMutation = useMutation({
    mutationFn: (clubId: string) =>
      api.post(`/circuits/${circuitId}/venues`, { clubId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuitVenues", circuitId] });
      setShowAddModal(false);
      setSearchQuery("");
      setSearchResults([]);
    },
  });

  const removeVenueMutation = useMutation({
    mutationFn: (clubId: string) =>
      api.delete(`/circuits/${circuitId}/venues/${clubId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuitVenues", circuitId] });
    },
  });

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      // Search for pub poker clubs the user has access to
      const res = await api.get("/auth/me/clubs");
      const clubs = (res.data as Array<{ club: { id: string; name: string; slug: string; venueCity?: string | null; clubType: string } }>)
        .filter((c) => c.club.clubType === "PUB_POKER")
        .filter((c) => c.club.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((c) => ({
          id: c.club.id,
          name: c.club.name,
          slug: c.club.slug,
          venueCity: c.club.venueCity ?? null,
        }));
      setSearchResults(clubs);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  const venues = venuesQuery.data ?? [];

  return (
    <div className="px-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">
          Member Venues ({venues.length})
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 bg-[#D4AF37] text-[#0f0f0f] rounded-lg text-xs font-medium"
        >
          + Add Venue
        </button>
      </div>

      <div className="space-y-3">
        {venues.map((v) => (
          <div
            key={v.clubId}
            className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm">{v.club.name}</h3>
                <p className="text-[10px] text-[#6b7280] mt-0.5">
                  {v.club._count.games} games &middot; Joined {new Date(v.joinedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Remove ${v.club.name} from this circuit?`)) {
                    removeVenueMutation.mutate(v.clubId);
                  }
                }}
                className="text-red-400 text-xs hover:text-red-300"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Venue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Venue</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-[#6b7280] mb-3">
              Search for a Pub Poker club you own or admin to add as a venue.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search club name..."
                className="flex-1 px-4 py-2.5 bg-[#0f0f0f] rounded-lg text-sm border border-[#374151] focus:border-[#D4AF37] focus:outline-none placeholder-[#4b5563]"
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-4 py-2.5 bg-[#D4AF37] text-[#0f0f0f] rounded-lg text-sm font-medium"
              >
                {searching ? "..." : "Search"}
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((club) => (
                <button
                  key={club.id}
                  onClick={() => addVenueMutation.mutate(club.id)}
                  disabled={addVenueMutation.isPending}
                  className="w-full flex items-center justify-between p-3 bg-[#0f0f0f] rounded-lg hover:bg-[#1a1a1a] transition-colors text-left"
                >
                  <div>
                    <span className="text-sm font-medium">{club.name}</span>
                    {club.venueCity && (
                      <span className="text-xs text-[#6b7280] ml-2">{club.venueCity}</span>
                    )}
                  </div>
                  <span className="text-xs text-[#D4AF37]">Add</span>
                </button>
              ))}
              {searchResults.length === 0 && searchQuery && !searching && (
                <p className="text-center text-[#6b7280] text-sm py-4">
                  No matching Pub Poker clubs found.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Seasons Tab
// ============================================================

function SeasonsTab({ circuitId }: { circuitId: string }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [seasonName, setSeasonName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const seasonsQuery = useQuery<SeasonItem[]>({
    queryKey: ["circuitSeasons", circuitId],
    queryFn: () => api.get(`/circuits/${circuitId}/seasons`).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post(`/circuits/${circuitId}/seasons`, {
        name: seasonName,
        startDate,
        endDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuitSeasons", circuitId] });
      setShowCreate(false);
      setSeasonName("");
      setStartDate("");
      setEndDate("");
    },
  });

  const activateMutation = useMutation({
    mutationFn: (seasonId: string) =>
      api.patch(`/circuits/${circuitId}/seasons/${seasonId}`, { isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuitSeasons", circuitId] });
    },
  });

  const recalcMutation = useMutation({
    mutationFn: () => api.post(`/circuits/${circuitId}/recalculate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuitSeasons", circuitId] });
    },
  });

  const seasons = seasonsQuery.data ?? [];

  function getSeasonStatus(s: SeasonItem): string {
    if (s.isActive) return "Active";
    const now = new Date();
    if (new Date(s.startDate) > now) return "Upcoming";
    return "Past";
  }

  return (
    <div className="px-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">
          Seasons ({seasons.length})
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 bg-[#D4AF37] text-[#0f0f0f] rounded-lg text-xs font-medium"
        >
          + New Season
        </button>
      </div>

      <div className="space-y-3">
        {seasons.map((s) => {
          const status = getSeasonStatus(s);
          return (
            <div
              key={s.id}
              className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">{s.name}</h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    status === "Active"
                      ? "bg-green-900/30 text-green-400"
                      : status === "Upcoming"
                        ? "bg-blue-900/30 text-blue-400"
                        : "bg-[#2a2a2a] text-[#6b7280]"
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-[10px] text-[#6b7280]">
                {new Date(s.startDate).toLocaleDateString()} &ndash;{" "}
                {new Date(s.endDate).toLocaleDateString()}
                {s._count.standings > 0 && ` \u00B7 ${s._count.standings} players ranked`}
              </p>
              <div className="flex gap-2 mt-3">
                {status === "Upcoming" && (
                  <button
                    onClick={() => activateMutation.mutate(s.id)}
                    disabled={activateMutation.isPending}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium"
                  >
                    Activate
                  </button>
                )}
                {status === "Active" && (
                  <button
                    onClick={() => recalcMutation.mutate()}
                    disabled={recalcMutation.isPending}
                    className="px-3 py-1.5 bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg text-xs font-medium"
                  >
                    {recalcMutation.isPending ? "..." : "Recalculate"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Season Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">New Season</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 hover:bg-white/10 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1">Season Name</label>
                <input
                  type="text"
                  value={seasonName}
                  onChange={(e) => setSeasonName(e.target.value)}
                  placeholder="Spring 2026"
                  className="w-full px-4 py-2.5 bg-[#0f0f0f] rounded-lg text-sm border border-[#374151] focus:border-[#D4AF37] focus:outline-none placeholder-[#4b5563]"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-[#9ca3af] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0f0f0f] rounded-lg text-sm border border-[#374151] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[#9ca3af] mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0f0f0f] rounded-lg text-sm border border-[#374151] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!seasonName || !startDate || !endDate || createMutation.isPending}
                className="w-full py-3 bg-[#D4AF37] hover:bg-[#c9a432] disabled:bg-[#D4AF37]/40 text-[#0f0f0f] rounded-lg font-medium transition-colors"
              >
                {createMutation.isPending ? "Creating..." : "Create Season"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Settings Tab
// ============================================================

function SettingsTab({
  circuitId,
  circuit,
}: {
  circuitId: string;
  circuit: CircuitData;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState(circuit.name);
  const [description, setDescription] = useState(circuit.description ?? "");
  const [city, setCity] = useState(circuit.city ?? "");
  const [state, setState] = useState(circuit.state ?? "");
  const [isPublic, setIsPublic] = useState(circuit.isPublic);
  const [saving, setSaving] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch(`/circuits/${circuitId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuit", circuitId] });
      setSaving(false);
    },
    onError: () => setSaving(false),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.delete(`/circuits/${circuitId}`),
    onSuccess: () => {
      navigate("/select-club", { replace: true });
    },
  });

  function handleSave() {
    setSaving(true);
    updateMutation.mutate({ name, description, city, state, isPublic });
  }

  return (
    <div className="px-5 space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-[#9ca3af] mb-1">Circuit Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-[#D4AF37] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-[#9ca3af] mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-[#D4AF37] focus:outline-none resize-none"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-[#9ca3af] mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-[#9ca3af] mb-1">State</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
        </div>

        {/* Public toggle */}
        <div className="flex items-center justify-between bg-[#1a1a1a] rounded-lg p-4 border border-[#374151]">
          <div>
            <span className="text-sm font-medium">Public Circuit</span>
            <p className="text-[10px] text-[#6b7280] mt-0.5">
              Make this circuit discoverable on the public circuits page
            </p>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              isPublic ? "bg-[#D4AF37]" : "bg-[#374151]"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                isPublic ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Slug (read-only) */}
        <div>
          <label className="block text-xs text-[#9ca3af] mb-1">Slug</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={circuit.slug}
              readOnly
              className="flex-1 px-4 py-2.5 bg-[#0f0f0f] rounded-lg text-sm border border-[#374151] text-[#6b7280] font-mono"
            />
            <button
              onClick={() => navigator.clipboard.writeText(`pkrnight.com/circuit/${circuit.slug}`)}
              className="px-3 py-2.5 bg-[#1a1a1a] border border-[#374151] rounded-lg text-xs text-[#9ca3af] hover:text-white"
            >
              Copy
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-[#D4AF37] hover:bg-[#c9a432] disabled:bg-[#D4AF37]/40 text-[#0f0f0f] rounded-lg font-medium transition-colors"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="border border-red-900/30 rounded-xl p-4">
        <h3 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h3>
        <p className="text-[10px] text-[#6b7280] mb-3">
          Deactivating this circuit will hide it from all members and public pages.
        </p>
        <button
          onClick={() => {
            if (confirm("Are you sure you want to deactivate this circuit? This action cannot be easily undone.")) {
              deactivateMutation.mutate();
            }
          }}
          disabled={deactivateMutation.isPending}
          className="px-4 py-2 bg-red-900/30 text-red-400 rounded-lg text-xs font-medium hover:bg-red-900/50 transition-colors"
        >
          {deactivateMutation.isPending ? "Deactivating..." : "Deactivate Circuit"}
        </button>
      </div>
    </div>
  );
}
