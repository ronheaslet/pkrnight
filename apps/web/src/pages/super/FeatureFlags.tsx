import { useEffect, useState } from "react";
import { fetchFeatureFlags, updateFeatureFlag } from "../../lib/superAdminApi";

interface Flag {
  featureKey: string;
  name: string;
  description: string | null;
  state: string;
  isContextLocked: boolean;
  contextNote: string | null;
  updatedBy: string | null;
  clubOverrideCount: number;
}

const stateColors: Record<string, string> = {
  GLOBALLY_ON: "text-green-400 bg-green-400/10",
  CLUB_CONFIGURABLE: "text-blue-400 bg-blue-400/10",
  GLOBALLY_OFF: "text-red-400 bg-red-400/10",
};

const states = ["GLOBALLY_ON", "CLUB_CONFIGURABLE", "GLOBALLY_OFF"];

export default function FeatureFlags() {
  const [flags, setFlags] = useState<Flag[]>([]);

  const load = () => fetchFeatureFlags().then(setFlags);

  useEffect(() => {
    load();
  }, []);

  const handleCycle = async (flag: Flag) => {
    if (flag.isContextLocked) return;
    const currentIdx = states.indexOf(flag.state);
    const nextState = states[(currentIdx + 1) % states.length];
    await updateFeatureFlag(flag.featureKey, nextState);
    // Optimistic update
    setFlags((prev) =>
      prev.map((f) =>
        f.featureKey === flag.featureKey ? { ...f, state: nextState } : f
      )
    );
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Feature Flags</h1>

      <div className="space-y-2">
        {flags.map((flag) => (
          <div
            key={flag.featureKey}
            className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{flag.name}</span>
                {flag.isContextLocked && (
                  <span className="text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                    Locked
                  </span>
                )}
                {flag.clubOverrideCount > 0 && (
                  <span className="text-xs text-[#6b7280]">
                    {flag.clubOverrideCount} club overrides
                  </span>
                )}
              </div>
              {flag.contextNote && (
                <p className="text-xs text-amber-400/80 mt-1">{flag.contextNote}</p>
              )}
            </div>
            <button
              onClick={() => handleCycle(flag)}
              disabled={flag.isContextLocked}
              className={`text-xs px-3 py-1 rounded ${
                stateColors[flag.state] ?? "text-[#6b7280] bg-white/5"
              } ${flag.isContextLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"} transition-opacity`}
            >
              {flag.state.replace(/_/g, " ")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
