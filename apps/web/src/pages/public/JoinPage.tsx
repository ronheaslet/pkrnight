import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import api from "../../lib/api";

type Step = "phone" | "otp" | "profile" | "club-join" | "circuit-join";

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const authToken = useGameStore((s) => s.authToken);
  const setAuthToken = useGameStore((s) => s.setAuthToken);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);

  const ref = searchParams.get("ref") || null;
  const clubSlug = searchParams.get("club") || null;
  const circuitSlug = searchParams.get("circuit") || null;

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [clubData, setClubData] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);
  const [circuitData, setCircuitData] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // If already authenticated and club slug provided, go to club-join step
  useEffect(() => {
    if (authToken && clubSlug) {
      loadClubData(clubSlug);
      setStep("club-join");
    }
  }, [authToken, clubSlug]);

  // Load club data if slug provided
  useEffect(() => {
    if (clubSlug) {
      loadClubData(clubSlug);
    }
  }, [clubSlug]);

  // Load circuit data if slug provided
  useEffect(() => {
    if (circuitSlug) {
      loadCircuitData(circuitSlug);
    }
  }, [circuitSlug]);

  async function loadClubData(slug: string) {
    try {
      const res = await api.get(`/public/club/${slug}`);
      setClubData({ id: res.data.id, name: res.data.name, slug: res.data.slug });
    } catch {
      // Club not found — continue without pre-select
    }
  }

  async function loadCircuitData(slug: string) {
    try {
      const res = await api.get(`/public/circuits/${slug}`);
      setCircuitData({ id: res.data.id, name: res.data.name, slug: res.data.slug });
    } catch {
      // Circuit not found — continue without pre-select
    }
  }

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;
    if (raw.startsWith("+")) return raw;
    return `+1${digits}`;
  }

  async function handleSendOtp() {
    setError(null);
    setLoading(true);
    const formatted = formatPhone(phone);

    try {
      // Check if phone already exists
      const checkRes = await api.post("/auth/check-phone", { phone: formatted });
      if (checkRes.data.exists) {
        setError("Welcome back! This phone is already registered. Please log in instead.");
        setLoading(false);
        return;
      }

      await api.post("/auth/otp/send", { phone: formatted });
      setPhone(formatted);
      setStep("otp");
      setResendTimer(30);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : "Failed to send code";
      setError(msg || "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit on 6th digit
    if (value && index === 5 && next.every((d) => d !== "")) {
      verifyOtp(next.join(""));
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  async function verifyOtp(code: string) {
    setError(null);
    setLoading(true);

    try {
      await api.post("/auth/otp/verify", { phone, otp: code });
      // OTP verified — proceed to profile setup for registration with attribution
      setStep("profile");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : "Invalid code";
      setError(msg || "Invalid code");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setError(null);
    setLoading(true);

    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!displayName) {
      setError("Please enter your name");
      setLoading(false);
      return;
    }

    try {
      const res = await api.post("/auth/register", {
        phone,
        displayName,
        ref,
        clubSlug,
      });

      setAuthToken(res.data.token);
      setCurrentUser({
        userId: res.data.person.id,
        clubId: null,
        planTier: "FREE",
        brandingKey: null,
        roles: [],
        permissions: [],
        isSuperAdmin: res.data.person.isSuperAdmin,
      });

      if (clubData) {
        setStep("club-join");
      } else if (circuitData) {
        setStep("circuit-join");
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : "Registration failed";
      setError(msg || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinClub() {
    if (!clubData) return;
    setLoading(true);
    setError(null);

    try {
      await api.post(`/clubs/${clubData.id}/join`);
      navigate(`/clubs/${clubData.id}`, { replace: true });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : "Failed to join club";
      setError(msg || "Failed to join club");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">{"\u2663"}</div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "Georgia, serif", color: "#D4AF37" }}
          >
            PKR Night
          </h1>
          {clubData && step !== "club-join" && (
            <p className="text-[#9ca3af] text-sm mt-1">
              Joining {clubData.name}
            </p>
          )}
          {circuitData && !clubData && step !== "circuit-join" && (
            <p className="text-[#9ca3af] text-sm mt-1">
              Joining {circuitData.name}
            </p>
          )}
        </div>

        {/* Step 1: Phone */}
        {step === "phone" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3.5 bg-[#1a1a1a] rounded-xl text-base border border-[#374151] focus:border-[#D4AF37] focus:outline-none text-center tracking-wider"
                autoFocus
              />
              <p className="text-[#6b7280] text-xs mt-2 text-center">
                We'll send you a one-time code
              </p>
            </div>
            <button
              onClick={handleSendOtp}
              disabled={loading || phone.replace(/\D/g, "").length < 10}
              className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#c9a432] disabled:bg-[#D4AF37]/40 text-[#0f0f0f] rounded-xl font-bold transition-colors"
            >
              {loading ? "Sending..." : "Continue"}
            </button>
            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}
            <div className="text-center">
              <button
                onClick={() => navigate("/login")}
                className="text-[#9ca3af] text-xs hover:text-white transition-colors"
              >
                Already have an account? Log in
              </button>
            </div>
          </div>
        )}

        {/* Step 2: OTP */}
        {step === "otp" && (
          <div className="space-y-4">
            <p className="text-[#9ca3af] text-sm text-center">
              Enter the 6-digit code sent to{" "}
              <span className="text-white">{phone}</span>
            </p>
            <div className="flex justify-center gap-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 bg-[#1a1a1a] border border-[#374151] focus:border-[#D4AF37] rounded-xl text-center text-xl font-bold focus:outline-none"
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {loading && (
              <p className="text-[#9ca3af] text-xs text-center">
                Verifying...
              </p>
            )}
            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setStep("phone");
                  setOtp(["", "", "", "", "", ""]);
                  setError(null);
                }}
                className="text-[#9ca3af] text-xs hover:text-white transition-colors"
              >
                &larr; Back
              </button>
              <button
                onClick={() => {
                  if (resendTimer <= 0) {
                    api.post("/auth/otp/send", { phone });
                    setResendTimer(30);
                  }
                }}
                disabled={resendTimer > 0}
                className="text-[#9ca3af] text-xs hover:text-white transition-colors disabled:text-[#4b5563]"
              >
                {resendTimer > 0
                  ? `Resend in ${resendTimer}s`
                  : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Profile */}
        {step === "profile" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-center mb-1">
              Set Up Your Profile
            </h2>
            <p className="text-[#9ca3af] text-xs text-center mb-4">
              This is how other players will see you
            </p>
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1.5">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1a] rounded-xl text-sm border border-[#374151] focus:border-[#D4AF37] focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a1a] rounded-xl text-sm border border-[#374151] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <button
              onClick={handleRegister}
              disabled={loading || !firstName.trim()}
              className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#c9a432] disabled:bg-[#D4AF37]/40 text-[#0f0f0f] rounded-xl font-bold transition-colors"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}
          </div>
        )}

        {/* Step 4: Club Join */}
        {step === "club-join" && clubData && (
          <div className="space-y-4 text-center">
            <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#D4AF37]/20">
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: "Georgia, serif", color: "#D4AF37" }}
              >
                {clubData.name}
              </h2>
              <p className="text-[#9ca3af] text-sm mb-5">
                Would you like to join this club?
              </p>
              <button
                onClick={handleJoinClub}
                disabled={loading}
                className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#c9a432] disabled:bg-[#D4AF37]/40 text-[#0f0f0f] rounded-xl font-bold transition-colors mb-3"
              >
                {loading ? "Joining..." : `Join ${clubData.name}`}
              </button>
              <button
                onClick={() => navigate("/", { replace: true })}
                className="text-[#9ca3af] text-xs hover:text-white transition-colors"
              >
                Browse other clubs
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}
          </div>
        )}

        {/* Step 5: Circuit Join */}
        {step === "circuit-join" && circuitData && (
          <div className="space-y-4 text-center">
            <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#D4AF37]/20">
              <div className="text-3xl mb-2">{"\u26A1"}</div>
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: "Georgia, serif", color: "#D4AF37" }}
              >
                {circuitData.name}
              </h2>
              <p className="text-[#9ca3af] text-sm mb-5">
                Join this circuit to compete across all member venues!
              </p>
              <button
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    await api.post(`/circuits/${circuitData.id}/members`);
                    navigate(`/circuits/${circuitData.id}`, { replace: true });
                  } catch (err: unknown) {
                    const msg =
                      err && typeof err === "object" && "response" in err
                        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
                        : "Failed to join circuit";
                    setError(msg || "Failed to join circuit");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#c9a432] disabled:bg-[#D4AF37]/40 text-[#0f0f0f] rounded-xl font-bold transition-colors mb-3"
              >
                {loading ? "Joining..." : `Join ${circuitData.name}`}
              </button>
              <button
                onClick={() => navigate("/", { replace: true })}
                className="text-[#9ca3af] text-xs hover:text-white transition-colors"
              >
                Skip for now
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}
          </div>
        )}

        {/* No club context after registration */}
        {step === "club-join" && !clubData && (
          <div className="text-center space-y-4">
            <div className="text-4xl mb-2">{"\u2705"}</div>
            <h2 className="text-lg font-bold">Account Created!</h2>
            <p className="text-[#9ca3af] text-sm">
              You're all set. Find a club to join.
            </p>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#c9a432] text-[#0f0f0f] rounded-xl font-bold transition-colors"
            >
              Go to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
