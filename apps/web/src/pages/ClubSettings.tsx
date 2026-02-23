import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";
import PubPokerGate from "../components/common/PubPokerGate";
import ReferralQR from "../components/profile/ReferralQR";
import { isMockPubClub, mockPubClub } from "../lib/pubPokerMocks";

interface FeatureFlag {
  featureKey: string;
  name: string;
  description: string | null;
  globalState: string;
  clubEnabled: boolean;
  isContextLocked: boolean;
  contextNote: string | null;
}

export default function ClubSettings() {
  const { clubId } = useParams<{ clubId: string }>();
  const currentClub = useGameStore((s) => s.currentClub);
  const setCurrentClub = useGameStore((s) => s.setCurrentClub);
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#22c55e");
  const [accentColor, setAccentColor] = useState("#3b82f6");
  const [logoUrl, setLogoUrl] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Populate form from currentClub
  useEffect(() => {
    if (currentClub) {
      setName(currentClub.name);
      setTagline(currentClub.tagline || "");
      setPrimaryColor(currentClub.primaryColor || "#22c55e");
      setAccentColor(currentClub.accentColor || "#3b82f6");
      setLogoUrl(currentClub.logoUrl || "");
    }
  }, [currentClub]);

  const featuresQuery = useQuery({
    queryKey: ["features", clubId],
    queryFn: () => api.get(`/clubs/${clubId}/features`).then((r) => r.data),
    enabled: !!clubId,
  });

  const updateClubMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch(`/clubs/${clubId}`, data),
    onSuccess: (res) => {
      setSaveStatus("saved");
      setCurrentClub(res.data);
      queryClient.invalidateQueries({ queryKey: ["club", clubId] });
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: () => {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
  });

  const toggleFeatureMutation = useMutation({
    mutationFn: ({
      featureKey,
      isEnabled,
    }: {
      featureKey: string;
      isEnabled: boolean;
    }) => api.patch(`/clubs/${clubId}/features/${featureKey}`, { isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features", clubId] });
      showToast("Feature updated", "success");
    },
    onError: () => {
      showToast("Failed to update feature", "error");
    },
  });

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSaveIdentity() {
    setSaveStatus("saving");
    updateClubMutation.mutate({
      name,
      tagline: tagline || null,
      primaryColor,
      accentColor,
      logoUrl: logoUrl || null,
    });
  }

  const features: FeatureFlag[] = featuresQuery.data ?? [];

  // Split features: GLOBALLY_OFF hidden, GLOBALLY_ON shown as always-on, CLUB_CONFIGURABLE toggleable
  const visibleFeatures = features.filter(
    (f) => f.globalState !== "GLOBALLY_OFF"
  );

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold">Club Settings</h1>
        <p className="text-[#6b7280] text-sm">
          Manage your club identity and features
        </p>
      </div>

      {/* Club Identity Section */}
      <div className="px-5 mb-8">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-4">
          Club Identity
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#9ca3af] mb-1">
              Club Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-[#9ca3af] mb-1">
              Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A short description of your club"
              className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#4b5563]"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-[#9ca3af] mb-1">
                Primary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer"
                />
                <span className="text-xs text-[#6b7280] font-mono">
                  {primaryColor}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-[#9ca3af] mb-1">
                Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer"
                />
                <span className="text-xs text-[#6b7280] font-mono">
                  {accentColor}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#9ca3af] mb-1">
              Logo URL
            </label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#4b5563]"
            />
          </div>

          <button
            onClick={handleSaveIdentity}
            disabled={saveStatus === "saving"}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              saveStatus === "saved"
                ? "bg-green-700 text-green-200"
                : saveStatus === "error"
                  ? "bg-red-700 text-red-200"
                  : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
                ? "Saved!"
                : saveStatus === "error"
                  ? "Error — try again"
                  : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Feature Toggles Section */}
      <div className="px-5">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-4">
          Feature Toggles
        </h2>
        {featuresQuery.isLoading ? (
          <div className="text-center py-8 text-[#6b7280]">
            Loading features...
          </div>
        ) : (
          <div className="space-y-2">
            {visibleFeatures.map((feature) => {
              const isGloballyOn = feature.globalState === "GLOBALLY_ON";
              return (
                <div
                  key={feature.featureKey}
                  className="bg-[#1a1a1a] rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex-1 mr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {feature.name}
                      </span>
                      {feature.isContextLocked && (
                        <span
                          title={feature.contextNote || "Context-locked"}
                          className="cursor-help"
                        >
                          <svg
                            className="w-3.5 h-3.5 text-yellow-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                    {isGloballyOn && (
                      <span className="text-[10px] text-[#6b7280]">
                        Always On
                      </span>
                    )}
                    {feature.description && (
                      <p className="text-[10px] text-[#4b5563] mt-0.5">
                        {feature.description}
                      </p>
                    )}
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => {
                      if (!isGloballyOn) {
                        toggleFeatureMutation.mutate({
                          featureKey: feature.featureKey,
                          isEnabled: !feature.clubEnabled,
                        });
                      }
                    }}
                    disabled={isGloballyOn}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      isGloballyOn || feature.clubEnabled
                        ? "bg-green-600"
                        : "bg-[#374151]"
                    } ${isGloballyOn ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        isGloballyOn || feature.clubEnabled
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Referral QR */}
      <div className="px-5 mb-6">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-4">
          Referrals
        </h2>
        <ReferralQR />
      </div>

      {/* Pub Poker: Venue & Bonus Config */}
      <PubPokerGate fallback={null}>
        <VenueSettings clubId={clubId} showToast={showToast} />
      </PubPokerGate>

      {/* Phase 9: Public Profile section (pub_poker / circuit only) */}
      {currentClub && (currentClub.clubType === "PUB_POKER" || currentClub.clubType === "CIRCUIT") && (
        <PublicProfileSettings clubId={clubId} showToast={showToast} />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium z-50 ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ---- Pub Poker Venue Settings (only rendered inside PubPokerGate) ----

const ALL_NIGHTS = [
  { key: "MONDAY", label: "Mon" },
  { key: "TUESDAY", label: "Tue" },
  { key: "WEDNESDAY", label: "Wed" },
  { key: "THURSDAY", label: "Thu" },
  { key: "FRIDAY", label: "Fri" },
  { key: "SATURDAY", label: "Sat" },
  { key: "SUNDAY", label: "Sun" },
];

function VenueSettings({
  clubId,
  showToast,
}: {
  clubId: string | undefined;
  showToast: (message: string, type: "success" | "error") => void;
}) {
  const currentClub = useGameStore((s) => s.currentClub);
  const isMock = isMockPubClub(clubId ?? "");
  const mockVenue = mockPubClub.venueProfile;
  const mockBonus = mockPubClub.bonusChipConfig;

  // Venue fields
  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [nights, setNights] = useState<Set<string>>(new Set());
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Bonus fields
  const [bonusMode, setBonusMode] = useState<"OFF" | "TRACKED" | "SELF_REPORT">("OFF");
  const [chipAmount, setChipAmount] = useState(500);
  const [maxPerNight, setMaxPerNight] = useState(3);
  const [triggerFood, setTriggerFood] = useState(true);
  const [triggerDrink, setTriggerDrink] = useState(true);

  const [venueSaveStatus, setVenueSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [bonusSaveStatus, setBonusSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (isMock) {
      setVenueName(mockVenue.venueName);
      setAddress(mockVenue.address);
      setNights(new Set(mockVenue.operatingNights));
      setContactPhone(mockVenue.contactPhone);
      setContactEmail(mockVenue.contactEmail);
      setWebsiteUrl(mockVenue.websiteUrl);
      setIsPublic(true);
      setBonusMode(mockBonus.mode);
      setChipAmount(mockBonus.chipAmount);
      setMaxPerNight(mockBonus.maxPerNight);
      setTriggerFood(mockBonus.triggers.includes("FOOD"));
      setTriggerDrink(mockBonus.triggers.includes("DRINK"));
    } else if (currentClub) {
      const vp = currentClub.venueProfile as Record<string, unknown> | undefined;
      if (vp) {
        setVenueName((vp.venueName as string) ?? "");
        setAddress((vp.address as string) ?? "");
        setNights(new Set((vp.operatingNights as string[]) ?? []));
        setContactPhone((vp.contactPhone as string) ?? "");
        setContactEmail((vp.contactEmail as string) ?? "");
        setWebsiteUrl((vp.websiteUrl as string) ?? "");
      }
      setIsPublic(currentClub.isPublic);
    }
  }, [currentClub, isMock]);

  const venueMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (isMock) return Promise.resolve({ data: { success: true } } as any);
      return api.put(`/pub/clubs/${clubId}/venue`, data);
    },
    onSuccess: () => {
      setVenueSaveStatus("saved");
      showToast("Venue info saved", "success");
      setTimeout(() => setVenueSaveStatus("idle"), 2000);
    },
    onError: () => {
      setVenueSaveStatus("error");
      showToast("Failed to save venue info", "error");
      setTimeout(() => setVenueSaveStatus("idle"), 2000);
    },
  });

  const bonusMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (isMock) return Promise.resolve({ data: { success: true } } as any);
      return api.put(`/pub/clubs/${clubId}/bonus-config`, data);
    },
    onSuccess: () => {
      setBonusSaveStatus("saved");
      showToast("Bonus config saved", "success");
      setTimeout(() => setBonusSaveStatus("idle"), 2000);
    },
    onError: () => {
      setBonusSaveStatus("error");
      showToast("Failed to save bonus config", "error");
      setTimeout(() => setBonusSaveStatus("idle"), 2000);
    },
  });

  function handleSaveVenue() {
    setVenueSaveStatus("saving");
    const triggers: string[] = [];
    if (triggerFood) triggers.push("FOOD");
    if (triggerDrink) triggers.push("DRINK");
    venueMutation.mutate({
      venueName,
      address,
      operatingNights: Array.from(nights),
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      websiteUrl: websiteUrl || null,
      isPublic,
    });
  }

  function handleSaveBonus() {
    setBonusSaveStatus("saving");
    const triggers: string[] = [];
    if (triggerFood) triggers.push("FOOD");
    if (triggerDrink) triggers.push("DRINK");
    bonusMutation.mutate({
      mode: bonusMode,
      chipAmount,
      maxPerNight,
      triggers,
    });
  }

  function toggleNight(night: string) {
    setNights((prev) => {
      const next = new Set(prev);
      if (next.has(night)) next.delete(night);
      else next.add(night);
      return next;
    });
  }

  return (
    <>
      {/* Venue Information */}
      <div className="px-5 mt-8 mb-8">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-4">
          Venue Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#9ca3af] mb-1">Venue Name</label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-[#9ca3af] mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-[#9ca3af] mb-2">Operating Nights</label>
            <div className="flex flex-wrap gap-2">
              {ALL_NIGHTS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleNight(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    nights.has(key)
                      ? "bg-green-600 text-white"
                      : "bg-[#1a1a1a] text-[#6b7280] border border-[#374151]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#9ca3af] mb-1">Contact Phone (optional)</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-[#9ca3af] mb-1">Contact Email (optional)</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-[#9ca3af] mb-1">Website URL (optional)</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#4b5563]"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm">Public Discovery</span>
              <p className="text-[10px] text-[#6b7280]">
                List this venue in the public directory
              </p>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`w-11 h-6 rounded-full transition-colors flex items-center ${
                isPublic ? "bg-green-600" : "bg-[#374151]"
              }`}
            >
              <span
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  isPublic ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <button
            onClick={handleSaveVenue}
            disabled={venueSaveStatus === "saving"}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              venueSaveStatus === "saved"
                ? "bg-green-700 text-green-200"
                : venueSaveStatus === "error"
                  ? "bg-red-700 text-red-200"
                  : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {venueSaveStatus === "saving"
              ? "Saving..."
              : venueSaveStatus === "saved"
                ? "Saved!"
                : venueSaveStatus === "error"
                  ? "Error — try again"
                  : "Save Venue Info"}
          </button>
        </div>
      </div>

      {/* Bonus Chip Configuration */}
      <div className="px-5 mb-8">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-4">
          Bonus Chip Configuration
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#9ca3af] mb-2">Mode</label>
            <div className="flex gap-2">
              {(["OFF", "TRACKED", "SELF_REPORT"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setBonusMode(mode)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    bonusMode === mode
                      ? "bg-green-600 text-white"
                      : "bg-[#1a1a1a] text-[#6b7280] border border-[#374151]"
                  }`}
                >
                  {mode === "OFF" ? "Off" : mode === "TRACKED" ? "Tracked" : "Self-Report"}
                </button>
              ))}
            </div>
          </div>
          {bonusMode !== "OFF" && (
            <>
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1">Chip Amount</label>
                <input
                  type="number"
                  value={chipAmount}
                  onChange={(e) => setChipAmount(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1">Max Per Night</label>
                <input
                  type="number"
                  value={maxPerNight}
                  onChange={(e) => setMaxPerNight(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9ca3af] mb-2">Triggers</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={triggerFood}
                      onChange={() => setTriggerFood(!triggerFood)}
                      className="w-4 h-4 rounded bg-[#374151] accent-green-500"
                    />
                    <span className="text-sm">Food purchase</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={triggerDrink}
                      onChange={() => setTriggerDrink(!triggerDrink)}
                      className="w-4 h-4 rounded bg-[#374151] accent-green-500"
                    />
                    <span className="text-sm">Drink purchase</span>
                  </label>
                </div>
              </div>
              <div className="p-3 bg-amber-900/20 border border-amber-600/30 rounded-xl">
                <p className="text-amber-400 text-xs">
                  When enabled, players will see: "Buy food or drinks? Tap to
                  claim +{chipAmount} chips"
                </p>
              </div>
            </>
          )}
          <button
            onClick={handleSaveBonus}
            disabled={bonusSaveStatus === "saving"}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              bonusSaveStatus === "saved"
                ? "bg-green-700 text-green-200"
                : bonusSaveStatus === "error"
                  ? "bg-red-700 text-red-200"
                  : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {bonusSaveStatus === "saving"
              ? "Saving..."
              : bonusSaveStatus === "saved"
                ? "Saved!"
                : bonusSaveStatus === "error"
                  ? "Error — try again"
                  : "Save Bonus Config"}
          </button>
        </div>
      </div>
    </>
  );
}

// ---- Phase 9: Public Profile Settings ----

function PublicProfileSettings({
  clubId,
  showToast,
}: {
  clubId: string | undefined;
  showToast: (message: string, type: "success" | "error") => void;
}) {
  const currentClub = useGameStore((s) => s.currentClub);
  const navigate = useNavigate();

  const [publicBio, setPublicBio] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueCity, setVenueCity] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [isPublicDiscoverable, setIsPublicDiscoverable] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentClub) {
      // Load from club data — these new fields may need to come from a separate fetch
      setIsPublicDiscoverable(currentClub.isPublic);
    }
  }, [currentClub]);

  // Fetch current public profile data
  const profileQuery = useQuery({
    queryKey: ["club-public-profile", clubId],
    queryFn: async () => {
      if (!clubId) return null;
      const res = await api.get(`/clubs/${clubId}`);
      return res.data;
    },
    enabled: !!clubId,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setPublicBio(profileQuery.data.publicBio || "");
      setVenueAddress(profileQuery.data.venueAddress || "");
      setVenueCity(profileQuery.data.venueCity || "");
      setSocialLink(profileQuery.data.socialLink || "");
      setIsPublicDiscoverable(profileQuery.data.isPublic || false);
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch(`/clubs/${clubId}/public-profile`, data),
    onSuccess: () => {
      setSaveStatus("saved");
      showToast("Public profile saved", "success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: () => {
      setSaveStatus("error");
      showToast("Failed to save public profile", "error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
  });

  function handleSave() {
    setSaveStatus("saving");
    saveMutation.mutate({
      isPublic: isPublicDiscoverable,
      publicBio: publicBio || null,
      venueAddress: venueAddress || null,
      venueCity: venueCity || null,
      socialLink: socialLink || null,
    });
  }

  function handleCopySlug() {
    if (currentClub?.slug) {
      navigator.clipboard.writeText(`pkrnight.com/c/${currentClub.slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="px-5 mt-8 mb-8">
      <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-4">
        Public Profile
      </h2>
      <div className="space-y-4">
        {/* Public URL */}
        {currentClub?.slug && (
          <div>
            <label className="block text-xs text-[#9ca3af] mb-1">Public URL</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 bg-[#0f0f0f] rounded-lg text-xs text-[#9ca3af] font-mono border border-[#374151] truncate">
                pkrnight.com/c/{currentClub.slug}
              </div>
              <button
                onClick={handleCopySlug}
                className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {/* View Public Page link */}
        {currentClub?.slug && (
          <button
            onClick={() => window.open(`/c/${currentClub.slug}`, "_blank")}
            className="text-[#D4AF37] text-xs hover:underline"
          >
            View Public Page &rarr;
          </button>
        )}

        {/* Discoverable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm">Make club publicly discoverable</span>
            <p className="text-[10px] text-[#6b7280]">
              Anyone with the link can see your club page
            </p>
          </div>
          <button
            onClick={() => setIsPublicDiscoverable(!isPublicDiscoverable)}
            className={`w-11 h-6 rounded-full transition-colors flex items-center ${
              isPublicDiscoverable ? "bg-green-600" : "bg-[#374151]"
            }`}
          >
            <span
              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                isPublicDiscoverable ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs text-[#9ca3af] mb-1">
            Bio ({publicBio.length}/280)
          </label>
          <textarea
            value={publicBio}
            onChange={(e) => setPublicBio(e.target.value.slice(0, 280))}
            placeholder="Tell players about your club..."
            rows={3}
            className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#4b5563] resize-none"
          />
        </div>

        {/* Venue address */}
        <div>
          <label className="block text-xs text-[#9ca3af] mb-1">Venue Address</label>
          <input
            type="text"
            value={venueAddress}
            onChange={(e) => setVenueAddress(e.target.value)}
            placeholder="123 Main St"
            className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#4b5563]"
          />
        </div>

        {/* Venue city */}
        <div>
          <label className="block text-xs text-[#9ca3af] mb-1">City</label>
          <input
            type="text"
            value={venueCity}
            onChange={(e) => setVenueCity(e.target.value)}
            placeholder="Austin, TX"
            className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#4b5563]"
          />
        </div>

        {/* Social link */}
        <div>
          <label className="block text-xs text-[#9ca3af] mb-1">Social Link</label>
          <input
            type="url"
            value={socialLink}
            onChange={(e) => setSocialLink(e.target.value)}
            placeholder="https://instagram.com/yourclub"
            className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#4b5563]"
          />
        </div>

        {/* QR Code link */}
        {clubId && (
          <button
            onClick={() => navigate(`/clubs/${clubId}/qr`)}
            className="w-full py-3 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] rounded-xl text-sm font-medium transition-colors"
          >
            Manage QR Code
          </button>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            saveStatus === "saved"
              ? "bg-green-700 text-green-200"
              : saveStatus === "error"
                ? "bg-red-700 text-red-200"
                : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {saveStatus === "saving"
            ? "Saving..."
            : saveStatus === "saved"
              ? "Saved!"
              : saveStatus === "error"
                ? "Error — try again"
                : "Save Public Profile"}
        </button>
      </div>
    </div>
  );
}
