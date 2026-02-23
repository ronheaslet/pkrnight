import { useEffect, useState } from "react";
import { fetchClubsOverview, deactivateClub, reactivateClub } from "../../lib/superAdminApi";

interface Club {
  id: string;
  name: string;
  slug: string;
  clubType: string;
  planTier: string;
  isActive: boolean;
  memberCount: number;
  lastActiveAt: string;
  thisMonthAiSpend: number;
  gamesAllTime: number;
}

interface ClubsData {
  items: Club[];
  total: number;
}

const tierColors: Record<string, string> = {
  FREE: "text-[#6b7280]",
  STARTER: "text-blue-400",
  PRO: "text-purple-400",
  ENTERPRISE: "text-amber-400",
};

export default function ClubsOverview() {
  const [data, setData] = useState<ClubsData | null>(null);
  const [search, setSearch] = useState("");

  const load = () => fetchClubsOverview({ search }).then(setData);

  useEffect(() => {
    load();
  }, [search]);

  if (!data) return <div className="text-[#6b7280]">Loading...</div>;

  const handleToggleActive = async (club: Club) => {
    if (club.isActive) {
      await deactivateClub(club.id, "Deactivated from clubs overview");
    } else {
      await reactivateClub(club.id);
    }
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Clubs ({data.total})</h1>
        <input
          type="text"
          placeholder="Search clubs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-white/30 w-64"
        />
      </div>

      <div className="space-y-2">
        {data.items.map((club) => (
          <div
            key={club.id}
            className={`bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4 ${
              !club.isActive ? "opacity-50" : ""
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{club.name}</span>
                <span className={`text-xs ${tierColors[club.planTier] ?? "text-[#6b7280]"}`}>
                  {club.planTier}
                </span>
                <span className="text-xs text-[#6b7280]">
                  {club.clubType === "PUB_POKER" ? "Pub" : "Home"}
                </span>
                {!club.isActive && (
                  <span className="text-xs text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
                    Inactive
                  </span>
                )}
              </div>
              <div className="text-xs text-[#6b7280] mt-1 flex gap-4">
                <span>{club.memberCount} members</span>
                <span>{club.gamesAllTime} games</span>
                <span>${club.thisMonthAiSpend.toFixed(2)} AI</span>
                <span>Last active {new Date(club.lastActiveAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button
              onClick={() => handleToggleActive(club)}
              className={`text-xs px-3 py-1 rounded border transition-colors ${
                club.isActive
                  ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                  : "border-green-500/30 text-green-400 hover:bg-green-500/10"
              }`}
            >
              {club.isActive ? "Deactivate" : "Reactivate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
