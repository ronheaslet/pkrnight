import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../lib/api";

interface EventFormData {
  title: string;
  description: string;
  date: string;
  startTime: string;
  hasEndTime: boolean;
  endTime: string;
  savedLocationId: string;
  isNewLocation: boolean;
  newLocationName: string;
  newLocationAddress: string;
  buyInAmount: number;
  rebuysEnabled: boolean;
  rebuyAmount: number;
  rebuyLimit: number | null;
  addOnsEnabled: boolean;
  addOnAmount: number;
  addOnCutoffLevel: number | null;
  bountyEnabled: boolean;
  bountyAmount: number;
  guestEligible: boolean;
  maxPlayers: number;
  blindStructureId: string;
  chipSetId: string;
  reminder48h: boolean;
  reminder24h: boolean;
  reminder2h: boolean;
}

const defaultForm: EventFormData = {
  title: "",
  description: "",
  date: "",
  startTime: "19:00",
  hasEndTime: false,
  endTime: "23:00",
  savedLocationId: "",
  isNewLocation: false,
  newLocationName: "",
  newLocationAddress: "",
  buyInAmount: 50,
  rebuysEnabled: true,
  rebuyAmount: 50,
  rebuyLimit: 1,
  addOnsEnabled: false,
  addOnAmount: 25,
  addOnCutoffLevel: 6,
  bountyEnabled: false,
  bountyAmount: 10,
  guestEligible: true,
  maxPlayers: 10,
  blindStructureId: "mock-bs-001",
  chipSetId: "mock-chipset-001",
  reminder48h: true,
  reminder24h: true,
  reminder2h: true,
};

const STEPS = ["Basics", "Location", "Game Config", "Reminders"];

export default function EventCreate() {
  const { clubId, eventId } = useParams<{
    clubId: string;
    eventId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.pathname.includes("/edit");

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EventFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing event data if editing
  const editQuery = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => api.get(`/events/${eventId}`).then((r) => r.data),
    enabled: isEdit && !!eventId,
  });

  useEffect(() => {
    if (!editQuery.data) return;
    const data = editQuery.data;
    const d = new Date(data.startsAt);
    const endD = data.endsAt ? new Date(data.endsAt) : null;
    setForm({
      ...defaultForm,
      title: data.title || "",
      description: data.description || "",
      date: d.toISOString().split("T")[0],
      startTime: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      hasEndTime: !!endD,
      endTime: endD
        ? `${String(endD.getHours()).padStart(2, "0")}:${String(endD.getMinutes()).padStart(2, "0")}`
        : "23:00",
      savedLocationId: data.savedLocationId || "",
      isNewLocation: false,
      newLocationName: data.locationName || "",
      newLocationAddress: data.locationAddress || "",
      buyInAmount: data.buyInAmount ?? 50,
      rebuysEnabled: (data.rebuyAmount ?? 0) > 0,
      rebuyAmount: data.rebuyAmount ?? 50,
      rebuyLimit: data.rebuyLimit,
      addOnsEnabled: data.addOnAllowed ?? false,
      addOnAmount: data.addOnAmount ?? 25,
      addOnCutoffLevel: data.addOnCutoffLevel,
      bountyEnabled: data.bountyEnabled ?? false,
      bountyAmount: data.bountyAmount ?? 10,
      guestEligible: data.guestEligible ?? true,
      maxPlayers: data.maxPlayers ?? 10,
      blindStructureId: data.blindStructureId || "mock-bs-001",
      chipSetId: data.chipSetId || "mock-chipset-001",
      reminder48h: data.reminder48h ?? true,
      reminder24h: data.reminder24h ?? true,
      reminder2h: data.reminder2h ?? true,
    });
  }, [editQuery.data]);

  // Load saved locations
  const locationsQuery = useQuery({
    queryKey: ["locations", clubId],
    queryFn: () =>
      api.get(`/clubs/${clubId}/locations`).then((r) => r.data),
    enabled: !!clubId,
  });

  const locations: any[] = locationsQuery.data ?? [];

  // Create / update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const startsAt = new Date(`${form.date}T${form.startTime}:00`);
      const endsAt = form.hasEndTime
        ? new Date(`${form.date}T${form.endTime}:00`)
        : null;

      const payload: any = {
        clubId,
        title: form.title,
        description: form.description || null,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt?.toISOString() ?? null,
        buyInAmount: form.buyInAmount,
        rebuyAmount: form.rebuysEnabled ? form.rebuyAmount : 0,
        rebuyLimit: form.rebuysEnabled ? form.rebuyLimit : null,
        addOnAllowed: form.addOnsEnabled,
        addOnAmount: form.addOnsEnabled ? form.addOnAmount : 0,
        addOnCutoffLevel: form.addOnsEnabled ? form.addOnCutoffLevel : null,
        bountyEnabled: form.bountyEnabled,
        bountyAmount: form.bountyEnabled ? form.bountyAmount : 0,
        guestEligible: form.guestEligible,
        maxPlayers: form.maxPlayers,
        blindStructureId: form.blindStructureId,
        chipSetId: form.chipSetId,
        reminder48h: form.reminder48h,
        reminder24h: form.reminder24h,
        reminder2h: form.reminder2h,
      };

      if (form.isNewLocation) {
        payload.locationName = form.newLocationName;
        payload.locationAddress = form.newLocationAddress;
      } else {
        payload.savedLocationId = form.savedLocationId || null;
      }

      if (isEdit && eventId) {
        return api.patch(`/events/${eventId}`, payload).then((r) => r.data);
      }
      return api.post("/events", payload).then((r) => r.data);
    },
    onSuccess: (data: any) => {
      navigate(`/events/${data.id}`);
    },
  });

  function update(partial: Partial<EventFormData>) {
    setForm((prev) => ({ ...prev, ...partial }));
    setErrors({});
  }

  function validateStep(): boolean {
    const errs: Record<string, string> = {};
    if (step === 0) {
      if (!form.title.trim()) errs.title = "Title is required";
      if (!form.date) errs.date = "Date is required";
      if (!form.startTime) errs.startTime = "Start time is required";
    }
    if (step === 2) {
      if (form.buyInAmount <= 0) errs.buyInAmount = "Buy-in must be > 0";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (validateStep()) setStep((s) => Math.min(s + 1, 3));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-[#9ca3af] hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">
          {isEdit ? "Edit Event" : "Create Event"}
        </h1>
        <div className="w-6" />
      </div>

      {/* Step Progress */}
      <div className="px-5 py-3">
        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={`h-1 rounded-full transition-colors ${
                  i <= step ? "bg-green-500" : "bg-[#2a2a2a]"
                }`}
              />
              <p
                className={`text-[10px] mt-1 text-center ${
                  i === step ? "text-green-400" : "text-[#6b7280]"
                }`}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-2">
        {/* Step 1: Basics */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">
                Event Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Saturday Night Poker"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-[#4b5563] focus:outline-none focus:border-green-500"
              />
              {errors.title && (
                <p className="text-red-400 text-xs mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update({ date: e.target.value })}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 [color-scheme:dark]"
              />
              {errors.date && (
                <p className="text-red-400 text-xs mt-1">{errors.date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">
                Start Time *
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => update({ startTime: e.target.value })}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 [color-scheme:dark]"
              />
              {errors.startTime && (
                <p className="text-red-400 text-xs mt-1">{errors.startTime}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-[#9ca3af]">Set End Time</span>
              <button
                onClick={() => update({ hasEndTime: !form.hasEndTime })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  form.hasEndTime ? "bg-green-500" : "bg-[#374151]"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    form.hasEndTime ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {form.hasEndTime && (
              <div>
                <label className="block text-sm text-[#9ca3af] mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => update({ endTime: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 [color-scheme:dark]"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Bring snacks and good vibes..."
                rows={3}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-[#4b5563] focus:outline-none focus:border-green-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#9ca3af]">New Location</span>
              <button
                onClick={() =>
                  update({
                    isNewLocation: !form.isNewLocation,
                    savedLocationId: "",
                  })
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  form.isNewLocation ? "bg-green-500" : "bg-[#374151]"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    form.isNewLocation ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {form.isNewLocation ? (
              <>
                <div>
                  <label className="block text-sm text-[#9ca3af] mb-1">
                    Location Name
                  </label>
                  <input
                    type="text"
                    value={form.newLocationName}
                    onChange={(e) =>
                      update({ newLocationName: e.target.value })
                    }
                    placeholder="Ron's Place"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-[#4b5563] focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#9ca3af] mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={form.newLocationAddress}
                    onChange={(e) =>
                      update({ newLocationAddress: e.target.value })
                    }
                    placeholder="123 Main St, Anytown, USA"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-[#4b5563] focus:outline-none focus:border-green-500"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm text-[#9ca3af] mb-1">
                  Saved Location
                </label>
                <select
                  value={form.savedLocationId}
                  onChange={(e) =>
                    update({ savedLocationId: e.target.value })
                  }
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 [color-scheme:dark]"
                >
                  <option value="">Select a location...</option>
                  {locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} — {loc.address}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Game Config */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">
                Buy-In Amount ($) *
              </label>
              <input
                type="number"
                value={form.buyInAmount}
                onChange={(e) =>
                  update({ buyInAmount: Number(e.target.value) })
                }
                min={1}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
              />
              {errors.buyInAmount && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.buyInAmount}
                </p>
              )}
            </div>

            {/* Rebuys */}
            <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Rebuys</span>
                <button
                  onClick={() =>
                    update({ rebuysEnabled: !form.rebuysEnabled })
                  }
                  className={`w-12 h-6 rounded-full transition-colors ${
                    form.rebuysEnabled ? "bg-green-500" : "bg-[#374151]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      form.rebuysEnabled
                        ? "translate-x-6"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {form.rebuysEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#6b7280]">Amount ($)</label>
                    <input
                      type="number"
                      value={form.rebuyAmount}
                      onChange={(e) =>
                        update({ rebuyAmount: Number(e.target.value) })
                      }
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#6b7280]">
                      Limit (0 = unlimited)
                    </label>
                    <input
                      type="number"
                      value={form.rebuyLimit ?? 0}
                      onChange={(e) =>
                        update({
                          rebuyLimit:
                            Number(e.target.value) || null,
                        })
                      }
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Add-Ons */}
            <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Add-Ons</span>
                <button
                  onClick={() =>
                    update({ addOnsEnabled: !form.addOnsEnabled })
                  }
                  className={`w-12 h-6 rounded-full transition-colors ${
                    form.addOnsEnabled ? "bg-green-500" : "bg-[#374151]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      form.addOnsEnabled
                        ? "translate-x-6"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {form.addOnsEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#6b7280]">Amount ($)</label>
                    <input
                      type="number"
                      value={form.addOnAmount}
                      onChange={(e) =>
                        update({ addOnAmount: Number(e.target.value) })
                      }
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#6b7280]">
                      Cutoff Level
                    </label>
                    <input
                      type="number"
                      value={form.addOnCutoffLevel ?? ""}
                      onChange={(e) =>
                        update({
                          addOnCutoffLevel:
                            Number(e.target.value) || null,
                        })
                      }
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bounty */}
            <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bounty</span>
                <button
                  onClick={() =>
                    update({ bountyEnabled: !form.bountyEnabled })
                  }
                  className={`w-12 h-6 rounded-full transition-colors ${
                    form.bountyEnabled ? "bg-green-500" : "bg-[#374151]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      form.bountyEnabled
                        ? "translate-x-6"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {form.bountyEnabled && (
                <div>
                  <label className="text-xs text-[#6b7280]">
                    Bounty Amount ($)
                  </label>
                  <input
                    type="number"
                    value={form.bountyAmount}
                    onChange={(e) =>
                      update({ bountyAmount: Number(e.target.value) })
                    }
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:border-green-500"
                  />
                </div>
              )}
            </div>

            {/* Guest Eligible */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#9ca3af]">Guest Eligible</span>
              <button
                onClick={() =>
                  update({ guestEligible: !form.guestEligible })
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  form.guestEligible ? "bg-green-500" : "bg-[#374151]"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    form.guestEligible
                      ? "translate-x-6"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Max Players */}
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">
                Max Players
              </label>
              <input
                type="number"
                value={form.maxPlayers}
                onChange={(e) =>
                  update({ maxPlayers: Number(e.target.value) })
                }
                min={2}
                max={100}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Blind Structure */}
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">
                Blind Structure
              </label>
              <select
                value={form.blindStructureId}
                onChange={(e) =>
                  update({ blindStructureId: e.target.value })
                }
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 [color-scheme:dark]"
              >
                <option value="mock-bs-001">Standard 20-min</option>
              </select>
            </div>

            {/* Chip Set */}
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1">
                Chip Set
              </label>
              <select
                value={form.chipSetId}
                onChange={(e) => update({ chipSetId: e.target.value })}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 [color-scheme:dark]"
              >
                <option value="mock-chipset-001">Standard Tournament</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 4: Reminders */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-[#9ca3af] mb-2">
              Send automatic reminders to RSVPs before the event.
            </p>

            {[
              {
                key: "reminder48h" as const,
                label: "48 hours before",
              },
              {
                key: "reminder24h" as const,
                label: "24 hours before",
              },
              {
                key: "reminder2h" as const,
                label: "2 hours before",
              },
            ].map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between bg-[#1a1a1a] rounded-xl px-4 py-3"
              >
                <span className="text-sm">{label}</span>
                <button
                  onClick={() => update({ [key]: !form[key] })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    form[key] ? "bg-green-500" : "bg-[#374151]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      form[key] ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Error from API */}
        {saveMutation.isError && (
          <p className="text-red-400 text-sm mt-4 text-center">
            Failed to save event. Please try again.
          </p>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={back}
              className="flex-1 py-3 rounded-xl bg-[#1a1a1a] text-white font-medium border border-[#2a2a2a]"
            >
              Back
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={next}
              className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Event"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
