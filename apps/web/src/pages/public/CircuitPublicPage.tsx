import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import CircuitStandings from "../../components/circuit/CircuitStandings";

interface PublicCircuitData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  memberCount: number;
  activeSeason: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  topStandings: Array<{
    rank: number;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    points: number;
    gamesPlayed: number;
  }>;
  venues: Array<{
    clubId: string;
    name: string;
    slug: string;
    city: string | null;
    logoUrl: string | null;
  }>;
}

export default function CircuitPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const circuitQuery = useQuery<PublicCircuitData>({
    queryKey: ["publicCircuit", slug],
    queryFn: () => api.get(`/public/circuits/${slug}`).then((r) => r.data),
    enabled: !!slug,
  });

  useEffect(() => {
    const circuit = circuitQuery.data;
    if (!circuit) return;
    document.title = `${circuit.name} — PKR Night`;

    function setMeta(property: string, content: string) {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    }

    setMeta("og:title", `${circuit.name} — PKR Night`);
    setMeta("og:description", circuit.description || `Join the ${circuit.name} poker circuit`);
    setMeta("og:url", `https://pkrnight.com/circuit/${circuit.slug}`);

    return () => { document.title = "PKR Night"; };
  }, [circuitQuery.data]);

  if (circuitQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <div className="animate-pulse text-[#9ca3af]">Loading...</div>
      </div>
    );
  }

  const circuit = circuitQuery.data;
  if (!circuit) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center p-6">
        <p className="text-[#6b7280] mb-4">Circuit not found.</p>
        <button
          onClick={() => navigate("/")}
          className="text-[#D4AF37] text-sm hover:underline"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-12">
      {/* Header */}
      <div className="px-5 pt-8 pb-6 text-center">
        {circuit.logoUrl ? (
          <img
            src={circuit.logoUrl}
            alt={circuit.name}
            className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-[#D4AF37]/20 flex items-center justify-center text-4xl mx-auto mb-4">
            {"\u26A1"}
          </div>
        )}
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "Georgia, serif", color: "#D4AF37" }}
        >
          {circuit.name}
        </h1>
        {(circuit.city || circuit.state) && (
          <p className="text-[#9ca3af] text-sm mt-1">
            {[circuit.city, circuit.state].filter(Boolean).join(", ")}
          </p>
        )}
        {circuit.description && (
          <p className="text-[#6b7280] text-sm mt-3 max-w-md mx-auto">
            {circuit.description}
          </p>
        )}
        <p className="text-[#4b5563] text-xs mt-2">
          {circuit.venues.length} venue{circuit.venues.length !== 1 ? "s" : ""} &middot;{" "}
          {circuit.memberCount} player{circuit.memberCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Join CTA */}
      <div className="px-5 mb-6">
        <button
          onClick={() => navigate(`/join?circuit=${circuit.slug}`)}
          className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#c9a432] text-[#0f0f0f] rounded-xl font-bold transition-colors"
        >
          Join the Circuit
        </button>
      </div>

      {/* Active Season Standings */}
      {circuit.activeSeason && circuit.topStandings.length > 0 && (
        <div className="px-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">
              {circuit.activeSeason.name} Standings
            </h2>
            <span className="text-[10px] text-[#4b5563]">Top 10</span>
          </div>
          <CircuitStandings standings={circuit.topStandings} />
        </div>
      )}

      {/* Venues */}
      <div className="px-5 mb-8">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
          Member Venues
        </h2>
        <div className="space-y-3">
          {circuit.venues.map((venue) => (
            <button
              key={venue.clubId}
              onClick={() => navigate(`/c/${venue.slug}`)}
              className="w-full bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] text-left hover:border-[#3a3a3a] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#374151] flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {venue.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{venue.name}</h3>
                  {venue.city && (
                    <p className="text-[10px] text-[#6b7280]">{venue.city}</p>
                  )}
                </div>
                <span className="text-xs text-[#D4AF37]">View</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 border-t border-[#1a1a1a]">
        <p className="text-[10px] text-[#4b5563]">
          Powered by{" "}
          <span style={{ color: "#D4AF37", fontFamily: "Georgia, serif" }}>
            PKR Night
          </span>
        </p>
      </div>
    </div>
  );
}
