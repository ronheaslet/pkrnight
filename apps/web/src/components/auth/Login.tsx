import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import { useGameStore } from "../../store/gameStore";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuthToken = useGameStore((s) => s.setAuthToken);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);

  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const googleError = searchParams.get("error");
    if (googleError) return "Google sign-in failed. Please try again.";
    return null;
  });
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendOtp = async () => {
    setError(null);
    setLoading(true);

    try {
      await api.post("/auth/otp/send", { phone });
      setStep(2);
      setResendCooldown(30);
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    const otpString = code ?? otp.join("");
    if (otpString.length !== 6) return;

    setError(null);
    setLoading(true);

    try {
      const res = await api.post("/auth/otp/verify", {
        phone,
        otp: otpString,
      });

      setAuthToken(res.data.token);
      // Decode basic user info from the response
      setCurrentUser({
        userId: res.data.person.id,
        clubId: null,
        planTier: "FREE",
        brandingKey: null,
        roles: [],
        permissions: [],
        isSuperAdmin: res.data.person.isSuperAdmin,
      });
      navigate("/");
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit on 6th digit
    if (value && index === 5) {
      const code = newOtp.join("");
      if (code.length === 6) {
        handleVerifyOtp(code);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    handleSendOtp();
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo placeholder */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">&#9827;</div>
          <h1 className="text-white text-2xl font-bold">PKR Night</h1>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-[#9ca3af] text-sm block mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+14155551234"
                className="w-full px-4 py-3 bg-white/10 text-white text-lg rounded-lg border border-white/10 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}

            <button
              onClick={handleSendOtp}
              disabled={loading || !phone}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-medium text-lg transition-colors"
            >
              {loading ? "Sending..." : "Send Code"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[#6b7280] text-sm">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google Sign-In */}
            <a
              href={`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/auth/google`}
              className="w-full py-3 bg-white hover:bg-gray-100 text-gray-800 rounded-lg font-medium text-lg transition-colors flex items-center justify-center gap-3"
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </a>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-[#9ca3af] text-sm text-center">
              Enter the 6-digit code sent to{" "}
              <span className="text-white">{phone}</span>
            </p>

            <div className="flex justify-center gap-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpInput(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 bg-white/10 text-white text-2xl text-center rounded-lg border border-white/10 focus:border-blue-500 focus:outline-none"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center">{error}</div>
            )}

            <button
              onClick={() => handleVerifyOtp()}
              disabled={loading || otp.join("").length !== 6}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-medium text-lg transition-colors"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>

            <div className="text-center">
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-blue-400 hover:text-blue-300 disabled:text-[#6b7280] text-sm transition-colors"
              >
                {resendCooldown > 0
                  ? `Resend Code (${resendCooldown}s)`
                  : "Resend Code"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
