import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../lib/api";

interface PublicClubData {
  id: string;
  name: string;
  slug: string;
  clubType: string;
  tagline: string | null;
  publicBio: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  socialLink: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  memberCount: number;
  venueProfile: {
    venueName: string;
    address: string;
    operatingNights: string[];
  } | null;
  upcomingEvents: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string | null;
    buyInAmount: number;
    maxPlayers: number | null;
    locationName: string | null;
    rsvpCount: number;
  }[];
}

export default function ClubPublicPage() {
  const { clubSlug } = useParams<{ clubSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [club, setClub] = useState<PublicClubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clubSlug) return;

    api
      .get(`/public/club/${clubSlug}`)
      .then((res) => setClub(res.data))
      .catch((err) => {
        setError(
          err.response?.data?.error || "Club not found"
        );
      })
      .finally(() => setLoading(false));
  }, [clubSlug]);

  useEffect(() => {
    if (!club) return;
    document.title = `${club.name} — PKR Night`;

    function setMeta(property: string, content: string) {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    }

    setMeta("og:title", `${club.name} — PKR Night`);
    setMeta("og:description", club.tagline || club.publicBio || `Join us at ${club.name}`);
    setMeta("og:url", `https://pkrnight.com/c/${club.slug}`);

    return () => { document.title = "PKR Night"; };
  }, [club]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <div className="animate-pulse text-[#9ca3af]">Loading...</div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center p-6">
        <div className="text-4xl mb-4">{"\u2663"}</div>
        <h1 className="text-xl font-bold mb-2">Not Found</h1>
        <p className="text-[#9ca3af] mb-6">{error || "Club not found"}</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
        >
          Go Home
        </button>
      </div>
    );
  }

  const ref = searchParams.get("ref");
  const clubTypeBadge =
    club.clubType === "PUB_POKER"
      ? { label: "Pub Poker", color: "bg-green-600" }
      : club.clubType === "CIRCUIT"
        ? { label: "Circuit", color: "bg-blue-600" }
        : { label: "Club", color: "bg-gray-600" };

  function handleJoin() {
    navigate(`/join?club=${club!.slug}${ref ? `&ref=${ref}` : ""}`);
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <div className="px-5 pt-8 pb-6 text-center">
        {club.logoUrl && (
          <img
            src={club.logoUrl}
            alt={club.name}
            className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-2 border-[#D4AF37]/30"
          />
        )}
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: "Georgia, serif", color: "#D4AF37" }}
        >
          {club.name}
        </h1>
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white ${clubTypeBadge.color}`}
        >
          {clubTypeBadge.label}
        </span>

        {(club.venueProfile?.venueName || club.venueCity) && (
          <p className="text-[#9ca3af] text-sm mt-3">
            {club.venueProfile?.venueName}
            {club.venueProfile?.venueName && club.venueCity && " \u2022 "}
            {club.venueCity}
          </p>
        )}

        {club.venueAddress && (
          <p className="text-[#6b7280] text-xs mt-1">{club.venueAddress}</p>
        )}

        {club.publicBio && (
          <p className="text-[#d1d5db] text-sm mt-4 max-w-md mx-auto leading-relaxed">
            {club.publicBio}
          </p>
        )}

        {club.socialLink && (
          <a
            href={club.socialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-xs text-[#d1d5db] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            Follow Us
          </a>
        )}

        <p className="text-[#6b7280] text-xs mt-3">
          {club.memberCount} member{club.memberCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Upcoming Events */}
      <div className="px-5 mb-8">
        <h2
          className="text-lg font-bold mb-4"
          style={{ fontFamily: "Georgia, serif", color: "#D4AF37" }}
        >
          Upcoming Games
        </h2>

        {club.upcomingEvents.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl p-6 text-center">
            <p className="text-[#6b7280] text-sm">
              No upcoming events scheduled. Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {club.upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="bg-[#1a1a1a] rounded-xl p-4 border border-[#374151]/50"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-semibold">{event.title}</h3>
                  {event.buyInAmount > 0 && (
                    <span className="text-xs font-medium text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded">
                      ${event.buyInAmount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[#9ca3af]">
                  <span>{formatDate(event.startsAt)}</span>
                  <span>{formatTime(event.startsAt)}</span>
                  {event.locationName && (
                    <>
                      <span className="text-[#374151]">|</span>
                      <span>{event.locationName}</span>
                    </>
                  )}
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-[#6b7280]">
                    {event.rsvpCount} going
                    {event.maxPlayers ? ` / ${event.maxPlayers} max` : ""}
                  </span>
                  <button
                    onClick={handleJoin}
                    className="text-xs font-medium text-[#D4AF37] hover:text-[#f5d77a] transition-colors"
                  >
                    Join to RSVP &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Join CTA */}
      <div className="px-5 mb-12">
        <div className="bg-gradient-to-br from-[#1a1a0a] to-[#1a1a1a] rounded-2xl p-6 text-center border border-[#D4AF37]/20">
          <h2
            className="text-xl font-bold mb-2"
            style={{ fontFamily: "Georgia, serif", color: "#D4AF37" }}
          >
            Join {club.name}
          </h2>
          <p className="text-[#9ca3af] text-sm mb-5 max-w-sm mx-auto">
            Create your free PKR Night account to track points, see standings,
            and get game alerts
          </p>
          <button
            onClick={handleJoin}
            className="w-full max-w-xs py-3.5 bg-[#D4AF37] hover:bg-[#c9a432] text-[#0f0f0f] rounded-xl font-bold text-base transition-colors"
          >
            Join Now
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-8 text-center">
        <p className="text-[#4b5563] text-xs">
          Powered by{" "}
          <a href="/" className="text-[#6b7280] hover:text-white transition-colors">
            PKR Night
          </a>
        </p>
      </div>
    </div>
  );
}
