import { Outlet, useParams, useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { id: "settlement", label: "Settlement" },
  { id: "dues", label: "Dues" },
  { id: "treasury", label: "Treasury" },
  { id: "balances", label: "Balances" },
  { id: "reports", label: "Reports" },
  { id: "audit", label: "Audit Log" },
];

export default function AccountingLayout() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = tabs.find((t) => location.pathname.includes(`/accounting/${t.id}`))?.id ?? "settlement";

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate(`/clubs/${clubId}`)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Back to club"
        >
          <svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Accounting</h1>
      </div>

      {/* Sub-navigation tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide -mx-5 px-5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(`/clubs/${clubId}/accounting/${tab.id}`)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-green-600 text-white"
                    : "bg-[#1a1a1a] text-[#9ca3af] hover:bg-[#222] hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <Outlet />
    </div>
  );
}
