interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaColor?: "green" | "red";
  alert?: boolean;
}

export default function StatCard({ label, value, delta, deltaColor = "green", alert }: StatCardProps) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex-1 min-w-[140px]">
      <div className="flex items-start justify-between">
        <p className="text-[#6b7280] text-xs uppercase tracking-wide">{label}</p>
        {alert && (
          <span className="text-yellow-500 text-sm" title="Warning">&#9888;</span>
        )}
      </div>
      <p className="text-white text-xl font-bold mt-1">{value}</p>
      {delta && (
        <p className={`text-xs mt-1 ${deltaColor === "green" ? "text-green-400" : "text-red-400"}`}>
          {delta}
        </p>
      )}
    </div>
  );
}
