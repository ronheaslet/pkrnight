import { useEffect, useState } from "react";
import { fetchAiUsage } from "../../lib/superAdminApi";

interface AiData {
  period: string;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  byFeature: { feature: string; tokens: number; costUsd: number }[];
  byClub: { clubId: string; clubName: string; costUsd: number }[];
  dailyBurnRate: number;
  projectedMonthly: number;
  budgetAlert: boolean;
}

const BUDGET_LIMIT = 500;

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function AiUsage() {
  const [data, setData] = useState<AiData | null>(null);

  useEffect(() => {
    fetchAiUsage().then(setData);
  }, []);

  if (!data) return <div className="text-[#6b7280]">Loading...</div>;

  const projectedPct = (data.projectedMonthly / BUDGET_LIMIT) * 100;
  const isOverBudget = data.projectedMonthly > BUDGET_LIMIT;

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">AI Usage</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-xs text-[#6b7280] mb-1">Total Cost (Month)</div>
          <div className="text-2xl font-bold">${data.totalCostUsd.toFixed(2)}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-xs text-[#6b7280] mb-1">Daily Burn Rate</div>
          <div className="text-2xl font-bold">${data.dailyBurnRate.toFixed(2)}/day</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-xs text-[#6b7280] mb-1">Tokens In</div>
          <div className="text-2xl font-bold">{formatTokens(data.totalTokensIn)}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-xs text-[#6b7280] mb-1">Tokens Out</div>
          <div className="text-2xl font-bold">{formatTokens(data.totalTokensOut)}</div>
        </div>
      </div>

      {/* Budget progress bar */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#9ca3af]">
            Projected Monthly: ${data.projectedMonthly.toFixed(2)} / ${BUDGET_LIMIT}
          </span>
          {isOverBudget && (
            <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
              Over Budget
            </span>
          )}
        </div>
        <div className="w-full bg-white/10 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              isOverBudget ? "bg-red-500" : "bg-green-500"
            }`}
            style={{ width: `${Math.min(projectedPct, 100)}%` }}
          />
        </div>
      </div>

      {/* By Feature */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-medium text-[#9ca3af] mb-3">By Feature</h2>
          <div className="space-y-2">
            {data.byFeature.map((f) => (
              <div
                key={f.feature}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded px-3 py-2"
              >
                <span className="text-sm">{f.feature.replace(/_/g, " ")}</span>
                <div className="text-right">
                  <span className="text-sm font-medium">${f.costUsd.toFixed(2)}</span>
                  <span className="text-xs text-[#6b7280] ml-2">
                    {formatTokens(f.tokens)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Club */}
        <div>
          <h2 className="text-sm font-medium text-[#9ca3af] mb-3">By Club</h2>
          <div className="space-y-2">
            {data.byClub.map((c) => (
              <div
                key={c.clubId}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded px-3 py-2"
              >
                <span className="text-sm">{c.clubName}</span>
                <span className="text-sm font-medium">${c.costUsd.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
