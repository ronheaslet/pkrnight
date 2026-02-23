import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { mockWalkInClaim } from "../../lib/pubPokerMocks";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const publicApi = axios.create({ baseURL });

export default function WalkInClaim() {
  const { claimToken } = useParams<{ claimToken: string }>();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [claimed, setClaimed] = useState(false);
  const [claimData, setClaimData] = useState<{
    playerName: string;
    finishPosition: number;
    pointsEarned: number;
    clubId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMock = claimToken === "mock-claim-001";

  // Load claim info
  const infoQuery = useQuery({
    queryKey: ["walkInClaim", claimToken],
    queryFn: () => {
      if (isMock) {
        return Promise.resolve(mockWalkInClaim);
      }
      return publicApi.get(`/pub/walkin/claim/${claimToken}`).then((r) => r.data);
    },
    enabled: !!claimToken,
    retry: false,
  });

  const claimMutation = useMutation({
    mutationFn: (phoneNumber: string) => {
      if (isMock) {
        return Promise.resolve({
          data: {
            playerName: mockWalkInClaim.tempName,
            finishPosition: mockWalkInClaim.finishPosition,
            pointsEarned: mockWalkInClaim.pointsEarned,
            clubId: mockWalkInClaim.clubId,
          },
        } as any);
      }
      return publicApi.post("/pub/walkin/claim", {
        claimToken,
        phone: phoneNumber,
      });
    },
    onSuccess: (res) => {
      const data = isMock
        ? {
            playerName: mockWalkInClaim.tempName,
            finishPosition: mockWalkInClaim.finishPosition,
            pointsEarned: mockWalkInClaim.pointsEarned,
            clubId: mockWalkInClaim.clubId,
          }
        : res.data;
      setClaimed(true);
      setClaimData(data);
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const message = axiosErr.response?.data?.error;
      if (message?.includes("already claimed")) {
        setError(
          "This result has already been claimed. Did you already create an account?"
        );
      } else if (message?.includes("existing account")) {
        setClaimed(true);
        setClaimData(null);
        setError(
          "Welcome back! Your results have been added to your existing account."
        );
      } else {
        setError("This link has expired or is invalid.");
      }
    },
  });

  if (infoQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <div className="animate-pulse text-[#9ca3af]">Loading...</div>
      </div>
    );
  }

  if (infoQuery.isError && !isMock) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-2">
          <span className="text-green-400">PKR</span> Night
        </h1>
        <p className="text-[#6b7280] text-center mt-4">
          This link has expired or is invalid.
        </p>
      </div>
    );
  }

  const info = infoQuery.data;

  if (claimed && claimData) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
        <div className="pt-10 pb-4 text-center">
          <h1 className="text-2xl font-bold">
            <span className="text-green-400">PKR</span> Night
          </h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] w-full max-w-sm text-center">
            <span className="text-4xl block mb-3">{"🎉"}</span>
            <h2 className="text-xl font-bold mb-4">You're in!</h2>
            <p className="text-sm text-[#9ca3af] mb-4">
              {claimData.playerName} — you finished{" "}
              <strong className="text-white">
                #{claimData.finishPosition}
              </strong>{" "}
              and earned{" "}
              <strong className="text-green-400">
                {claimData.pointsEarned} points
              </strong>
            </p>
            <div className="space-y-3">
              <button
                onClick={() =>
                  navigate(`/clubs/${claimData.clubId}`)
                }
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
              >
                Download PKR Night
              </button>
              <button
                onClick={() =>
                  navigate(`/clubs/${claimData.clubId}/standings`)
                }
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
              >
                View My Stats
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (claimed && error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-4">
          <span className="text-green-400">PKR</span> Night
        </h1>
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] w-full max-w-sm text-center">
          <p className="text-green-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
      {/* Branding */}
      <div className="pt-10 pb-4 text-center">
        <h1 className="text-2xl font-bold">
          <span className="text-green-400">PKR</span> Night
        </h1>
      </div>

      <div className="flex-1 flex flex-col px-6">
        {/* Welcome */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold">Welcome to PKR Night! {"🃏"}</h2>
          {info?.venueName && (
            <p className="text-[#9ca3af] text-sm mt-2">
              You played at {info.venueName} tonight. Enter your phone number
              to save your results and join the community.
            </p>
          )}
        </div>

        {/* Phone input */}
        <div className="w-full max-w-sm mx-auto space-y-4">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-4 bg-[#1a1a1a] rounded-xl text-lg text-center border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#4b5563]"
          />

          <button
            onClick={() => phone.trim() && claimMutation.mutate(phone.trim())}
            disabled={!phone.trim() || claimMutation.isPending}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-40"
          >
            {claimMutation.isPending ? "Claiming..." : "Claim My Results"}
          </button>

          {error && !claimed && (
            <div className="p-3 bg-red-900/20 border border-red-600/40 rounded-xl">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-8 text-center">
        <p className="text-xs text-[#4b5563]">
          Powered by PKR Night — Poker Club Management
        </p>
      </div>
    </div>
  );
}
