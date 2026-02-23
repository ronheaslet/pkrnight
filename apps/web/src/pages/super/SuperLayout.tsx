import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/super/dashboard", label: "Dashboard" },
  { to: "/super/clubs", label: "Clubs" },
  { to: "/super/errors", label: "Errors" },
  { to: "/super/ai-usage", label: "AI Usage" },
  { to: "/super/growth", label: "Growth" },
  { to: "/super/features", label: "Feature Flags" },
  { to: "/super/kill-switch", label: "Kill Switch" },
];

export default function SuperLayout() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex">
      {/* Sidebar */}
      <nav className="w-52 border-r border-white/10 p-4 flex flex-col gap-1 shrink-0">
        <div className="text-xs text-[#6b7280] uppercase tracking-wider mb-3 px-2">
          Super Admin
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm transition-colors ${
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-[#9ca3af] hover:text-white hover:bg-white/5"
              }${item.label === "Kill Switch" ? " text-red-400 hover:text-red-300" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
