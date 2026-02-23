import { useEffect, useState } from "react";
import { fetchGrowthStats } from "../../lib/superAdminApi";

interface GrowthData {
  totalUsers: number;
  weeklyGrowthRate: number;
  monthlyGrowthRate: number;
  topReferrers: { displayName: string; totalReferrals: number; code: string }[];
  referralSourceBreakdown: Record<string, number>;
  geographicSpread: { state: string; count: number }[];
  conversionFunnel: {
    linkTaps: number;
    rsvps: number;
    accountsCreated: number;
    firstGames: number;
    active30d: number;
  };
  clubFormationRate: number;
}

export default function GrowthStats() {
  const [data, setData] = useState<GrowthData | null>(null);

  useEffect(() => {
    fetchGrowthStats().then(setData);
  }, []);

  if (!data) return <div className="text-[#6b7280]">Loading...</div>;

  const funnelSteps = [
    { label: "Link Taps", value: data.conversionFunnel.linkTaps },
    { label: "RSVPs", value: data.conversionFunnel.rsvps },
    { label: "Accounts Created", value: data.conversionFunnel.accountsCreated },
    { label: "First Games", value: data.conversionFunnel.firstGames },
    { label: "Active 30d", value: data.conversionFunnel.active30d },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Growth</h1>

      {/* Top-line metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-xs text-[#6b7280] mb-1">Total Users</div>
          <div className="text-2xl font-bold">{data.totalUsers.toLocaleString()}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-xs text-[#6b7280] mb-1">Weekly Growth</div>
          <div className="text-2xl font-bold text-green-400">+{data.weeklyGrowthRate}%</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-xs text-[#6b7280] mb-1">Monthly Growth</div>
          <div className="text-2xl font-bold text-green-400">+{data.monthlyGrowthRate}%</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-xs text-[#6b7280] mb-1">New Clubs / Week</div>
          <div className="text-2xl font-bold">{data.clubFormationRate}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div>
          <h2 className="text-sm font-medium text-[#9ca3af] mb-3">Conversion Funnel</h2>
          <div className="space-y-1">
            {funnelSteps.map((step, i) => {
              const pct =
                i === 0
                  ? 100
                  : Math.round((step.value / funnelSteps[0].value) * 100);
              return (
                <div key={step.label} className="bg-white/5 border border-white/10 rounded px-3 py-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{step.label}</span>
                    <span>
                      {step.value.toLocaleString()}{" "}
                      <span className="text-[#6b7280]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Referrers */}
        <div>
          <h2 className="text-sm font-medium text-[#9ca3af] mb-3">Top Referrers</h2>
          <div className="space-y-2">
            {data.topReferrers.map((r, i) => (
              <div
                key={r.code}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6b7280] w-4">{i + 1}.</span>
                  <span className="text-sm font-medium">{r.displayName}</span>
                  <span className="text-xs text-[#6b7280]">{r.code}</span>
                </div>
                <span className="text-sm">{r.totalReferrals} referrals</span>
              </div>
            ))}
          </div>
        </div>

        {/* Referral Sources */}
        <div>
          <h2 className="text-sm font-medium text-[#9ca3af] mb-3">Referral Sources</h2>
          <div className="space-y-2">
            {Object.entries(data.referralSourceBreakdown).map(([source, count]) => (
              <div
                key={source}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded px-3 py-2"
              >
                <span className="text-sm">{source.replace(/_/g, " ")}</span>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Spread */}
        <div>
          <h2 className="text-sm font-medium text-[#9ca3af] mb-3">Geographic Spread</h2>
          <div className="space-y-2">
            {data.geographicSpread.map((g) => (
              <div
                key={g.state}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded px-3 py-2"
              >
                <span className="text-sm">{g.state}</span>
                <span className="text-sm font-medium">{g.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
