import { useParams, useNavigate } from "react-router-dom";

export default function Placeholder({ title }: { title: string }) {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center p-6 pb-24">
      <div className="text-4xl mb-4">{"\uD83D\uDEA7"}</div>
      <h1 className="text-xl font-bold mb-2">{title}</h1>
      <p className="text-[#6b7280] text-sm text-center mb-6">
        This feature is coming in a future phase.
      </p>
      <button
        onClick={() => navigate(`/clubs/${clubId}`)}
        className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
      >
        Back to Club Hub
      </button>
    </div>
  );
}
