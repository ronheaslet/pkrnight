import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";

type Tab = "club" | "mine";

interface Trophy {
  id: string;
  clubId: string;
  name: string;
  emoji: string;
  description: string | null;
  isAutomatic: boolean;
  totalAwards: number;
}

interface TrophyAward {
  id: string;
  trophyName: string;
  trophyEmoji: string;
  trophyDescription: string;
  personId: string;
  awardedAt: string;
  gameId: string | null;
  seasonId: string | null;
  note: string | null;
  awardedBy: string;
}

interface Member {
  personId: string;
  displayName: string;
}

export default function TrophyWall() {
  const { clubId } = useParams<{ clubId: string }>();
  const currentUser = useGameStore((s) => s.currentUser);
  const effectiveClubId = clubId || currentUser?.clubId || "mock-club-001";
  const personId = currentUser?.userId || "mock-person-001";
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>("club");
  const [expandedTrophy, setExpandedTrophy] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState<string | null>(null);

  const isOwnerOrAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.roles.includes("OWNER") ||
    currentUser?.roles.includes("ADMIN");

  // Load club trophies
  const trophiesQuery = useQuery<Trophy[]>({
    queryKey: ["clubTrophies", effectiveClubId],
    queryFn: () =>
      api.get(`/results/${effectiveClubId}/trophies`).then((r) => r.data),
    staleTime: 30_000,
  });

  // Load my trophies
  const myTrophiesQuery = useQuery<TrophyAward[]>({
    queryKey: ["myTrophies", effectiveClubId, personId],
    queryFn: () =>
      api
        .get(`/results/${effectiveClubId}/trophies/person/${personId}`)
        .then((r) => r.data),
    staleTime: 30_000,
  });

  // Load members for award modal
  const membersQuery = useQuery<Member[]>({
    queryKey: ["members", effectiveClubId],
    queryFn: () =>
      api.get(`/clubs/${effectiveClubId}/members`).then((r) => r.data),
    enabled: !!showAwardModal,
    staleTime: 60_000,
  });

  const trophies = trophiesQuery.data ?? [];
  const myTrophies = myTrophiesQuery.data ?? [];

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Trophies</h1>
      </div>

      {/* Tab switcher */}
      <div className="px-5 mb-4">
        <div className="flex bg-[#1a1a1a] rounded-xl p-1 border border-[#2a2a2a]">
          <button
            onClick={() => setActiveTab("club")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "club"
                ? "bg-green-600 text-white"
                : "text-[#9ca3af] hover:text-white"
            }`}
          >
            Club Trophies
          </button>
          <button
            onClick={() => setActiveTab("mine")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "mine"
                ? "bg-green-600 text-white"
                : "text-[#9ca3af] hover:text-white"
            }`}
          >
            My Trophies
          </button>
        </div>
      </div>

      {/* Club Trophies tab */}
      {activeTab === "club" && (
        <div className="px-5">
          {/* Admin: Create trophy button */}
          {isOwnerOrAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full mb-4 px-4 py-3 bg-[#1a1a1a] border border-dashed border-[#2a2a2a] rounded-xl flex items-center justify-center gap-2 hover:bg-[#222] transition-colors"
            >
              <span className="text-lg">＋</span>
              <span className="text-sm text-[#9ca3af]">Create Trophy</span>
            </button>
          )}

          {trophiesQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#9ca3af] animate-pulse">
                Loading trophies...
              </div>
            </div>
          ) : trophies.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-xl p-8 text-center">
              <span className="text-3xl block mb-2">🏆</span>
              <p className="text-[#6b7280] text-sm">No trophies yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {trophies.map((trophy) => (
                <div key={trophy.id}>
                  <button
                    onClick={() =>
                      setExpandedTrophy(
                        expandedTrophy === trophy.id ? null : trophy.id
                      )
                    }
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center hover:bg-[#222] transition-colors"
                  >
                    <span className="text-4xl block mb-2">{trophy.emoji}</span>
                    <p className="text-sm font-bold">{trophy.name}</p>
                    {trophy.description && (
                      <p className="text-[10px] text-[#6b7280] mt-1 line-clamp-2">
                        {trophy.description}
                      </p>
                    )}
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="text-[10px] text-[#9ca3af]">
                        Awarded {trophy.totalAwards} times
                      </span>
                      {trophy.isAutomatic && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-600/30">
                          ⚡ Auto
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded: award button for admins */}
                  {expandedTrophy === trophy.id && isOwnerOrAdmin && (
                    <button
                      onClick={() => setShowAwardModal(trophy.id)}
                      className="w-full mt-1 px-3 py-2 bg-green-900/20 border border-green-600/30 rounded-lg text-xs text-green-400 font-medium"
                    >
                      Award Trophy
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Trophies tab */}
      {activeTab === "mine" && (
        <div className="px-5">
          {myTrophiesQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#9ca3af] animate-pulse">
                Loading your trophies...
              </div>
            </div>
          ) : myTrophies.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-xl p-8 text-center">
              <span className="text-3xl block mb-2">🎯</span>
              <p className="text-[#6b7280] text-sm">No trophies yet</p>
              <p className="text-[#4b5563] text-xs mt-1">
                Keep playing to earn your first trophy!
              </p>
            </div>
          ) : (
            <div className="relative pl-6">
              {/* Timeline line */}
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-[#2a2a2a]" />

              <div className="space-y-4">
                {myTrophies.map((award) => (
                  <div key={award.id} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute -left-[18px] top-3 w-3 h-3 rounded-full bg-green-600 border-2 border-[#0f0f0f]" />

                    {/* Date label */}
                    <p className="text-[10px] text-[#6b7280] mb-1">
                      {new Date(award.awardedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>

                    {/* Trophy card */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{award.trophyEmoji}</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold">{award.trophyName}</p>
                          <p className="text-[10px] text-[#6b7280] mt-0.5">
                            {award.trophyDescription}
                          </p>
                          {award.note && (
                            <p className="text-xs text-[#9ca3af] mt-1 italic">
                              "{award.note}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Trophy Modal */}
      {showCreateModal && (
        <CreateTrophyModal
          clubId={effectiveClubId}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({
              queryKey: ["clubTrophies", effectiveClubId],
            });
          }}
        />
      )}

      {/* Award Trophy Modal */}
      {showAwardModal && (
        <AwardTrophyModal
          clubId={effectiveClubId}
          trophyId={showAwardModal}
          members={(membersQuery.data ?? []) as Member[]}
          onClose={() => setShowAwardModal(null)}
          onAwarded={() => {
            setShowAwardModal(null);
            queryClient.invalidateQueries({
              queryKey: ["clubTrophies", effectiveClubId],
            });
          }}
        />
      )}
    </div>
  );
}

// ──── Create Trophy Modal ────

function CreateTrophyModal({
  clubId,
  onClose,
  onCreated,
}: {
  clubId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [emoji, setEmoji] = useState("🏆");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isAutomatic, setIsAutomatic] = useState(false);
  const [triggerJson, setTriggerJson] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      api.post(`/results/${clubId}/trophies`, {
        emoji,
        name,
        description: description || undefined,
        isAutomatic,
        triggerCondition: isAutomatic && triggerJson ? JSON.parse(triggerJson) : undefined,
      }),
    onSuccess: () => onCreated(),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        <div className="px-5 pb-8 space-y-4">
          <h2 className="text-lg font-bold text-white">Create Trophy</h2>

          <div>
            <label className="text-xs text-[#9ca3af] mb-1 block">Emoji</label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
              className="w-20 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-2xl text-center"
            />
          </div>

          <div>
            <label className="text-xs text-[#9ca3af] mb-1 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Trophy name"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6b7280]"
            />
          </div>

          <div>
            <label className="text-xs text-[#9ca3af] mb-1 block">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this trophy for?"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6b7280]"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAutomatic(!isAutomatic)}
              className={`w-10 h-6 rounded-full transition-colors ${isAutomatic ? "bg-green-600" : "bg-[#2a2a2a]"}`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${isAutomatic ? "translate-x-4" : ""}`}
              />
            </button>
            <span className="text-sm text-[#9ca3af]">Automatic trophy</span>
          </div>

          {isAutomatic && (
            <div>
              <label className="text-xs text-[#9ca3af] mb-1 block">
                Trigger Condition (JSON)
              </label>
              <textarea
                value={triggerJson}
                onChange={(e) => setTriggerJson(e.target.value)}
                placeholder='{"type": "first_place"}'
                rows={3}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-[#6b7280] font-mono"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[#2a2a2a] rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!name || createMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──── Award Trophy Modal ────

function AwardTrophyModal({
  clubId,
  trophyId,
  members,
  onClose,
  onAwarded,
}: {
  clubId: string;
  trophyId: string;
  members: Member[];
  onClose: () => void;
  onAwarded: () => void;
}) {
  const [selectedPerson, setSelectedPerson] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");

  const awardMutation = useMutation({
    mutationFn: () =>
      api.post(`/results/${clubId}/trophies/${trophyId}/award`, {
        personId: selectedPerson,
        note: note || undefined,
      }),
    onSuccess: () => onAwarded(),
  });

  const filteredMembers = members.filter((m) =>
    m.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        <div className="px-5 pb-8 space-y-4">
          <h2 className="text-lg font-bold text-white">Award Trophy</h2>

          {/* Search / select member */}
          <div>
            <label className="text-xs text-[#9ca3af] mb-1 block">
              Select Member
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6b7280] mb-2"
            />
            <div className="max-h-32 overflow-y-auto space-y-1">
              {filteredMembers.map((m) => (
                <button
                  key={m.personId}
                  onClick={() => setSelectedPerson(m.personId)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedPerson === m.personId
                      ? "bg-green-600/20 text-green-400 border border-green-600/30"
                      : "bg-[#111] text-white hover:bg-[#222]"
                  }`}
                >
                  {m.displayName}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[#9ca3af] mb-1 block">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why are they receiving this?"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6b7280]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[#2a2a2a] rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => awardMutation.mutate()}
              disabled={!selectedPerson || awardMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {awardMutation.isPending ? "Awarding..." : "Award"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
