import { useEffect, useState } from "react";
import { fetchSystemStatus } from "../../lib/superAdminApi";

interface SystemStatus {
  totalClubs: number;
  activeClubsThisWeek: number;
  totalPersons: number;
  newPersonsThisWeek: number;
  newPersonsThisMonth: number;
  totalGamesAllTime: number;
  activeGamesRightNow: number;
  weekOverWeekGrowth: number;
}

export default function SuperDashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setError(null);
    fetchSystemStatus()
      .then(setStatus)
      .catch(() => setError("Failed to load system status."));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#c9a432] text-[#0f0f0f] rounded-lg text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-[#6b7280] animate-pulse">Loading...</div>
    );
  }

  const stats = [
    { label: "Total Clubs", value: status.totalClubs },
    { label: "Active This Week", value: status.activeClubsThisWeek },
    { label: "Total Users", value: status.totalPersons.toLocaleString() },
    { label: "New This Week", value: `+${status.newPersonsThisWeek}` },
    { label: "New This Month", value: `+${status.newPersonsThisMonth}` },
    { label: "Games All Time", value: status.totalGamesAllTime },
    { label: "Live Games Now", value: status.activeGamesRightNow, highlight: true },
    { label: "WoW Growth", value: `${status.weekOverWeekGrowth}%`, highlight: true },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">System Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white/5 border border-white/10 rounded-lg p-4"
          >
            <div className="text-xs text-[#6b7280] mb-1">{s.label}</div>
            <div
              className={`text-2xl font-bold ${
                s.highlight ? "text-green-400" : "text-white"
              }`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
