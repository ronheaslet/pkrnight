import { useEffect, useState, useRef } from "react";
import { fetchErrorFeed, resolveError } from "../../lib/superAdminApi";

interface ErrorEntry {
  id: string;
  severity: string;
  errorType: string;
  message: string;
  route: string;
  clubId: string | null;
  clubName: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

const severityColors: Record<string, string> = {
  P0_CRITICAL: "bg-red-500",
  P1_HIGH: "bg-orange-500",
  P2_MEDIUM: "bg-yellow-500",
};

const severityTextColors: Record<string, string> = {
  P0_CRITICAL: "text-red-400",
  P1_HIGH: "text-orange-400",
  P2_MEDIUM: "text-yellow-400",
};

export default function ErrorFeed() {
  const [data, setData] = useState<{ entries: ErrorEntry[] } | null>(null);
  const [filter, setFilter] = useState<"all" | "unresolved">("unresolved");
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const load = () =>
    fetchErrorFeed({
      resolved: filter === "all" ? undefined : false,
    }).then(setData);

  useEffect(() => {
    load();
    // Auto-refresh every 15 seconds
    intervalRef.current = setInterval(load, 15_000);
    return () => clearInterval(intervalRef.current);
  }, [filter]);

  const handleResolve = async (id: string) => {
    await resolveError(id);
    load();
  };

  if (!data) return <div className="text-[#6b7280]">Loading...</div>;

  const displayed =
    filter === "unresolved"
      ? data.entries.filter((e) => !e.resolvedAt)
      : data.entries;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Error Feed</h1>
          <span className="text-xs text-[#6b7280]">Auto-refreshes every 15s</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("unresolved")}
            className={`text-xs px-3 py-1 rounded border transition-colors ${
              filter === "unresolved"
                ? "border-white/30 text-white bg-white/10"
                : "border-white/10 text-[#6b7280] hover:text-white"
            }`}
          >
            Unresolved
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`text-xs px-3 py-1 rounded border transition-colors ${
              filter === "all"
                ? "border-white/30 text-white bg-white/10"
                : "border-white/10 text-[#6b7280] hover:text-white"
            }`}
          >
            All
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {displayed.map((err) => (
          <div
            key={err.id}
            className="bg-white/5 border border-white/10 rounded-lg p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      severityColors[err.severity] ?? "bg-gray-500"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      severityTextColors[err.severity] ?? "text-[#6b7280]"
                    }`}
                  >
                    {err.severity.replace("_", " ")}
                  </span>
                  <span className="text-xs text-[#6b7280]">{err.errorType}</span>
                  {err.resolvedAt && (
                    <span className="text-xs text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                      Resolved
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/90 mb-1">{err.message}</p>
                <div className="text-xs text-[#6b7280] flex gap-3">
                  <span>{err.route}</span>
                  {err.clubName && <span>{err.clubName}</span>}
                  <span>{new Date(err.createdAt).toLocaleString()}</span>
                </div>
              </div>
              {!err.resolvedAt && (
                <button
                  onClick={() => handleResolve(err.id)}
                  className="text-xs px-3 py-1 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors shrink-0"
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="text-center text-[#6b7280] py-8">No errors found</div>
        )}
      </div>
    </div>
  );
}
