import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Standalone axios instance — no auth token
const publicApi = axios.create({ baseURL });

export default function GuestRsvp() {
  const { guestToken } = useParams<{ guestToken: string }>();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [chosenStatus, setChosenStatus] = useState<string | null>(null);

  const dataQuery = useQuery({
    queryKey: ["guestRsvp", guestToken],
    queryFn: () =>
      publicApi.get(`/rsvp/guest/${guestToken}`).then((r) => r.data),
    enabled: !!guestToken,
    retry: false,
  });

  const rsvpMutation = useMutation({
    mutationFn: (status: string) =>
      publicApi
        .patch(`/rsvp/guest/${guestToken}`, { status })
        .then((r) => r.data),
    onSuccess: (_data, status) => {
      setChosenStatus(status);
      setSubmitted(true);
    },
  });

  if (dataQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <div className="animate-pulse text-[#9ca3af]">Loading...</div>
      </div>
    );
  }

  if (dataQuery.isError || !dataQuery.data) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center p-6">
        <p className="text-2xl font-bold mb-2">PKR Night</p>
        <p className="text-[#6b7280] text-center">
          This invite link is invalid or has expired.
        </p>
      </div>
    );
  }

  const { event, guestName, rsvpStatus } = dataQuery.data;

  const startsAt = new Date(event.startsAt);
  const dateStr = startsAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const currentStatus = chosenStatus ?? rsvpStatus;

  const confirmMessages: Record<string, string> = {
    GOING: "You're in! See you at the table.",
    MAYBE: "Got it — we'll keep a spot warm for you.",
    NOT_GOING: "No worries, maybe next time!",
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
      {/* Branding */}
      <div className="pt-10 pb-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-green-400">PKR</span> Night
        </h1>
      </div>

      {/* Event Card */}
      <div className="mx-5 bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a]">
        <h2 className="text-xl font-bold mb-3">{event.title}</h2>
        <div className="space-y-2 text-sm text-[#9ca3af]">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>
              {dateStr} at {timeStr}
            </span>
          </div>
          {event.locationName && (
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{event.locationName}</span>
            </div>
          )}
          {event.locationAddress && (
            <p className="pl-6 text-xs text-[#6b7280]">
              {event.locationAddress}
            </p>
          )}
          {event.buyInAmount > 0 && (
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>${event.buyInAmount} buy-in</span>
            </div>
          )}
        </div>
      </div>

      {/* Greeting */}
      <div className="px-5 mt-6 mb-4">
        <h3 className="text-lg font-semibold">
          Hi {guestName || "there"}!
        </h3>
        <p className="text-sm text-[#9ca3af] mt-1">
          You've been invited to play. Can you make it?
        </p>
      </div>

      {/* RSVP Buttons / Confirmation */}
      <div className="px-5 flex-1">
        {submitted ? (
          <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center border border-[#2a2a2a]">
            <span className="text-4xl block mb-3">
              {currentStatus === "GOING"
                ? "🎉"
                : currentStatus === "MAYBE"
                  ? "🤔"
                  : "👋"}
            </span>
            <p className="text-lg font-semibold mb-1">
              {confirmMessages[currentStatus ?? "GOING"]}
            </p>
            <p className="text-sm text-[#6b7280] mt-2">
              You can change your response anytime by revisiting this link.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {(
              [
                {
                  status: "GOING",
                  label: "Going",
                  icon: "✅",
                  color: "border-green-500 bg-green-600/20 hover:bg-green-600/30",
                },
                {
                  status: "MAYBE",
                  label: "Maybe",
                  icon: "❓",
                  color: "border-yellow-500 bg-yellow-600/20 hover:bg-yellow-600/30",
                },
                {
                  status: "NOT_GOING",
                  label: "Can't Make It",
                  icon: "❌",
                  color: "border-red-500 bg-red-600/20 hover:bg-red-600/30",
                },
              ] as const
            ).map(({ status, label, icon, color }) => (
              <button
                key={status}
                onClick={() => rsvpMutation.mutate(status)}
                disabled={rsvpMutation.isPending}
                className={`w-full py-4 rounded-xl text-center font-medium text-lg border-2 transition-all ${
                  currentStatus === status
                    ? color
                    : "border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#374151]"
                } disabled:opacity-50`}
              >
                <span className="mr-2">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Soft CTA */}
      <div className="px-5 py-8 text-center">
        <p className="text-xs text-[#4b5563]">
          Want to track your stats?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-green-500 hover:underline"
          >
            Create a free PKR Night account.
          </button>
        </p>
      </div>
    </div>
  );
}
