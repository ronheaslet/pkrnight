export default function AccountingPlaceholder({ title }: { title: string }) {
  return (
    <div className="px-5">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">&#128679;</div>
        <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
        <p className="text-[#6b7280] text-sm">
          This section is coming in Phase 6C.
        </p>
      </div>
    </div>
  );
}
