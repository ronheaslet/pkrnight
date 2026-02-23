import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";

/**
 * Handles the OAuth callback redirect.
 * Reads token + user info from URL params, stores them, and navigates home.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuthToken = useGameStore((s) => s.setAuthToken);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");
    const userId = searchParams.get("userId");
    const isSuperAdmin = searchParams.get("isSuperAdmin") === "true";

    if (!token || !userId) {
      navigate("/login?error=google_failed", { replace: true });
      return;
    }

    // Store tokens
    setAuthToken(token);
    if (refreshToken) {
      localStorage.setItem("pkr_refresh_token", refreshToken);
    }

    // Store user in Zustand
    setCurrentUser({
      userId,
      clubId: null,
      planTier: "FREE",
      brandingKey: null,
      roles: [],
      permissions: [],
      isSuperAdmin,
    });

    navigate("/", { replace: true });
  }, [searchParams, navigate, setAuthToken, setCurrentUser]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="text-white text-lg">Signing you in...</div>
    </div>
  );
}
