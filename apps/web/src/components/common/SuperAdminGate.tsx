import { useGameStore } from "../../store/gameStore";

interface SuperAdminGateProps {
  children: React.ReactNode;
}

export default function SuperAdminGate({ children }: SuperAdminGateProps) {
  const currentUser = useGameStore((s) => s.currentUser);

  // Never reveal that the page exists — show generic 404
  if (!currentUser?.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-[#374151] mb-4">404</h1>
          <p className="text-[#6b7280] text-sm">Page not found</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
