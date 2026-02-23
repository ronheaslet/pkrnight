interface MethodSelectorProps {
  value: string;
  onChange: (method: string) => void;
}

const methods = ["Cash", "Venmo", "Zelle", "Other"];

export default function MethodSelector({ value, onChange }: MethodSelectorProps) {
  return (
    <div className="flex gap-2">
      {methods.map((m) => {
        const isActive = value.toLowerCase() === m.toLowerCase();
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m.toLowerCase())}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isActive
                ? "bg-green-600 text-white"
                : "bg-[#2a2a2a] text-[#9ca3af] hover:bg-[#333]"
            }`}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}
