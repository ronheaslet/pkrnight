import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const currentUser = useGameStore((s) => s.currentUser);
  const authToken = useGameStore((s) => s.authToken);
  const navigate = useNavigate();

  // Auto-redirect authenticated users
  useEffect(() => {
    if (authToken && currentUser) {
      if (currentUser.clubId) {
        navigate(`/clubs/${currentUser.clubId}`, { replace: true });
      } else {
        navigate("/select-club", { replace: true });
      }
    }
  }, [authToken, currentUser, navigate]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center p-6">
      <div className="text-4xl mb-4">{"\u2663"}</div>
      <h1 className="text-3xl font-bold mb-2">PKR Night</h1>
      <p className="text-[#9ca3af] mb-8">Poker Club Management</p>

      {authToken ? (
        <div className="space-y-4 text-center">
          <p className="text-[#9ca3af]">
            Logged in as{" "}
            <span className="text-white font-medium">
              {currentUser?.userId ?? "Player"}
            </span>
          </p>

          <button
            onClick={() => navigate("/select-club")}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Your Clubs
          </button>

          <button
            onClick={() => navigate("/clubs/mock-club-001")}
            className="block mx-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
          >
            Demo Club Hub
          </button>

          <button
            onClick={() => navigate("/game/mock-game-001")}
            className="block mx-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
          >
            Demo Game
          </button>

          <button
            onClick={() => navigate("/game/mock-game-001/dealer")}
            className="block mx-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
          >
            Dealer Display (Demo)
          </button>

          <button
            onClick={() => navigate("/clubs/mock-club-pub-001")}
            className="block mx-auto px-6 py-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/40 rounded-lg font-medium transition-colors"
          >
            Demo Pub Poker Club
          </button>
        </div>
      ) : (
        <button
          onClick={() => navigate("/login")}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-lg transition-colors"
        >
          Sign In
        </button>
      )}

      {/* Secret super admin entrance */}
      <button
        onClick={() => navigate("/super/dashboard")}
        className="fixed bottom-3 right-3 text-[10px] text-white/20 hover:text-white/60 transition-opacity cursor-default"
        aria-hidden="true"
      >
        ⚙
      </button>
    </div>
  );
}
