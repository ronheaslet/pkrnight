import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import { useGameStore } from "../../store/gameStore";

// ---------- Types ----------

interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  transactionId: string | null;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  note: string | null;
  createdAt: string;
}

interface AuditLogData {
  entries: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

// ---------- Constants ----------

const actionBadgeColors: Record<string, string> = {
  CREATE: "bg-blue-500/20 text-blue-400",
  UPDATE: "bg-yellow-500/20 text-yellow-400",
  DELETE: "bg-red-500/20 text-red-400",
  VOID: "bg-orange-500/20 text-orange-400",
  TRANSFER: "bg-purple-500/20 text-purple-400",
  APPROVE: "bg-green-500/20 text-green-400",
};

const entityTypes = ["All", "Transaction", "DuesRecord", "ChipDenomination", "Membership", "Treasury", "Game"];

// ---------- Component ----------

export default function AuditLog() {
  const { clubId } = useParams<{ clubId: string }>();
  const currentUser = useGameStore((s) => s.currentUser);

  const isOwner = currentUser?.isSuperAdmin || currentUser?.roles.includes("OWNER");
  const hasAuditPermission = currentUser?.permissions.includes("view_audit_log");
  const canView = isOwner || hasAuditPermission;

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actorSearch, setActorSearch] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    entityType: "All",
    startDate: "",
    endDate: "",
  });

  // Pagination
  const [allEntries, setAllEntries] = useState<AuditEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch audit log
  const auditQuery = useQuery({
    queryKey: ["auditLog", clubId, appliedFilters.entityType, appliedFilters.startDate, appliedFilters.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("offset", "0");
      if (appliedFilters.entityType !== "All") params.set("entityType", appliedFilters.entityType);
      if (appliedFilters.startDate) params.set("startDate", appliedFilters.startDate);
      if (appliedFilters.endDate) params.set("endDate", appliedFilters.endDate);

      const res = await api.get(`/accounting/${clubId}/audit?${params.toString()}`);
      const data = res.data as AuditLogData;
      setAllEntries(data.entries);
      setOffset(data.entries.length);
      setHasMore(data.entries.length < data.total);
      return data;
    },
    enabled: !!clubId && canView,
    staleTime: 30_000,
  });

  // ---------- Handlers ----------

  function handleApplyFilters() {
    setAppliedFilters({
      entityType: entityTypeFilter,
      startDate,
      endDate,
    });
    setOffset(0);
    setAllEntries([]);
  }

  async function handleLoadMore() {
    const params = new URLSearchParams();
    params.set("limit", "50");
    params.set("offset", String(offset));
    if (appliedFilters.entityType !== "All") params.set("entityType", appliedFilters.entityType);
    if (appliedFilters.startDate) params.set("startDate", appliedFilters.startDate);
    if (appliedFilters.endDate) params.set("endDate", appliedFilters.endDate);

    try {
      const res = await api.get(`/accounting/${clubId}/audit?${params.toString()}`);
      const data = res.data as AuditLogData;
      setAllEntries((prev) => [...prev, ...data.entries]);
      setOffset((prev) => prev + data.entries.length);
      setHasMore(offset + data.entries.length < data.total);
    } catch {
      // silent
    }
  }

  function getChangeSummary(entry: AuditEntry): string {
    const prev = entry.previousValue;
    const next = entry.newValue;

    if (!prev && !next) return "—";

    // Financial change
    if (prev && next && typeof prev.amount === "number" && typeof next.amount === "number") {
      return `[$${prev.amount} → $${next.amount}]`;
    }

    // Status change
    if (prev && next) {
      const prevStatus = prev.isPaid !== undefined ? (prev.isPaid ? "paid" : "pending") : null;
      const nextStatus = next.isPaid !== undefined ? (next.isPaid ? "paid" : "pending") : null;
      if (prevStatus && nextStatus && prevStatus !== nextStatus) {
        return `[${prevStatus} → ${nextStatus}]`;
      }

      if (prev.isVoided !== undefined && next.isVoided !== undefined) {
        return `[active → voided]`;
      }

      if (prev.amountPaid !== undefined && next.amountPaid !== undefined) {
        return `[$${prev.amountPaid} → $${next.amountPaid}]`;
      }
    }

    // New value summary
    if (next && !prev) {
      const type = next.type as string | undefined;
      const amount = next.amount as number | undefined;
      if (type && amount !== undefined) {
        return `${type.replace(/_/g, " ")} · $${amount}`;
      }
      if (next.financialLockedAt) {
        return "Financials locked";
      }
    }

    // Void summary
    if (next && next.isVoided === true && next.voidReason) {
      return `Voided: ${next.voidReason}`;
    }

    return "—";
  }

  // ---------- Permission gate ----------

  if (!canView) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-[#6b7280] text-lg">
          &#x1F512; Audit log access is restricted to club owners and accountants.
        </p>
      </div>
    );
  }

  // ---------- Loading / Error ----------

  if (auditQuery.isLoading) {
    return (
      <div className="px-5 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-[#1a1a1a] rounded-xl" />
          <div className="h-64 bg-[#1a1a1a] rounded-xl" />
        </div>
      </div>
    );
  }

  if (auditQuery.isError) {
    return (
      <div className="px-5 py-8 text-center text-[#9ca3af]">
        Failed to load audit log. Please try again.
      </div>
    );
  }

  // Client-side actor filter
  const filtered = actorSearch.trim()
    ? allEntries.filter((e) => e.actorName.toLowerCase().includes(actorSearch.toLowerCase()))
    : allEntries;

  return (
    <div className="px-5 space-y-4">
      {/* Filters bar */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-[#6b7280] text-xs block mb-1">Entity Type</label>
          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
          >
            {entityTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[#6b7280] text-xs block mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <div>
          <label className="text-[#6b7280] text-xs block mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <div>
          <label className="text-[#6b7280] text-xs block mb-1">Actor</label>
          <input
            type="text"
            value={actorSearch}
            onChange={(e) => setActorSearch(e.target.value)}
            placeholder="Search by name"
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm w-32"
          />
        </div>
        <button
          onClick={handleApplyFilters}
          className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg text-sm hover:bg-[#333] transition-colors"
        >
          Apply Filters
        </button>
      </div>

      {/* Audit log table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[auto_auto_auto_auto_1fr_auto] gap-3 px-4 py-2.5 border-b border-[#2a2a2a] text-[#6b7280] text-xs uppercase tracking-wide">
          <span>Timestamp</span>
          <span>Actor</span>
          <span>Action</span>
          <span>Entity</span>
          <span>Change Summary</span>
          <span>Note</span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-[#6b7280] text-sm">
            No audit entries found.
          </div>
        ) : (
          filtered.map((entry) => {
            const d = new Date(entry.createdAt);
            const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            const badgeClass = actionBadgeColors[entry.action] || "bg-gray-500/20 text-gray-400";
            const isExpanded = expandedId === entry.id;

            return (
              <div key={entry.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full grid grid-cols-[auto_auto_auto_auto_1fr_auto] gap-3 px-4 py-2.5 border-b border-[#2a2a2a]/50 items-center text-sm text-left hover:bg-[#222] transition-colors"
                >
                  <span className="text-[#6b7280] text-xs whitespace-nowrap">
                    {dateStr}
                    <br />
                    <span className="text-[10px]">{timeStr}</span>
                  </span>
                  <span className="text-white text-xs">{entry.actorName}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${badgeClass}`}>
                    {entry.action}
                  </span>
                  <span className="text-[#9ca3af] text-xs">
                    {entry.entityType}
                    <br />
                    <span className="text-[10px] text-[#6b7280]">{entry.entityId.substring(0, 8)}...</span>
                  </span>
                  <span className="text-[#9ca3af] text-xs truncate">
                    {getChangeSummary(entry)}
                  </span>
                  <span className="text-[#6b7280] text-xs italic truncate max-w-[80px]">
                    {entry.note ?? ""}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-[#0f0f0f] border-b border-[#2a2a2a]">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[#6b7280] text-xs uppercase tracking-wide mb-1">Previous Value</p>
                        <pre className="bg-[#1a1a1a] rounded-lg p-3 text-xs text-[#9ca3af] font-mono overflow-x-auto max-h-40 overflow-y-auto">
                          {entry.previousValue ? JSON.stringify(entry.previousValue, null, 2) : "null"}
                        </pre>
                      </div>
                      <div>
                        <p className="text-[#6b7280] text-xs uppercase tracking-wide mb-1">New Value</p>
                        <pre className="bg-[#1a1a1a] rounded-lg p-3 text-xs text-[#9ca3af] font-mono overflow-x-auto max-h-40 overflow-y-auto">
                          {entry.newValue ? JSON.stringify(entry.newValue, null, 2) : "null"}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Load More */}
        {hasMore && filtered.length > 0 && (
          <div className="px-4 py-3 text-center">
            <button
              onClick={handleLoadMore}
              className="text-sm text-green-400 hover:text-green-300 transition-colors font-medium"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
