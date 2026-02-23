import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";

interface Member {
  id: string;
  personId: string;
  displayName: string;
  phone: string | null;
  avatarUrl: string | null;
  systemRole: string;
  memberType: string;
  status: string;
  joinedAt: string;
  specialRoles: Array<{ id: string; name: string; emoji: string }>;
}

interface CustomRole {
  id: string;
  name: string;
  emoji: string;
  isSystem: boolean;
}

type FilterTab = "All" | "Admins" | "Members" | "Guests" | "Suspended";

export default function MemberList() {
  const { clubId } = useParams<{ clubId: string }>();
  const currentUser = useGameStore((s) => s.currentUser);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState<Member | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const isOwnerOrAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.roles.includes("OWNER") ||
    currentUser?.roles.includes("ADMIN");

  const membersQuery = useQuery({
    queryKey: ["members", clubId],
    queryFn: () => api.get(`/clubs/${clubId}/members`).then((r) => r.data),
    enabled: !!clubId,
  });

  const rolesQuery = useQuery({
    queryKey: ["customRoles", clubId],
    queryFn: () => api.get(`/clubs/${clubId}/roles`).then((r) => r.data),
    enabled: !!clubId,
  });

  const removeMutation = useMutation({
    mutationFn: (personId: string) =>
      api.delete(`/clubs/${clubId}/members/${personId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", clubId] });
      setMenuOpen(null);
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({
      personId,
      customRoleId,
    }: {
      personId: string;
      customRoleId: string;
    }) =>
      api.post(`/clubs/${clubId}/members/${personId}/special-roles`, {
        customRoleId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", clubId] });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: ({
      personId,
      customRoleId,
    }: {
      personId: string;
      customRoleId: string;
    }) =>
      api.delete(
        `/clubs/${clubId}/members/${personId}/special-roles/${customRoleId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", clubId] });
    },
  });

  const members: Member[] = membersQuery.data ?? [];
  const customRoles: CustomRole[] = rolesQuery.data ?? [];

  // Filter members
  const filtered = members.filter((m) => {
    const matchesSearch = m.displayName
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesTab =
      activeTab === "All" ||
      (activeTab === "Admins" &&
        (m.systemRole === "OWNER" || m.systemRole === "ADMIN")) ||
      (activeTab === "Members" &&
        m.systemRole === "MEMBER" &&
        m.memberType === "PAID" &&
        m.status === "ACTIVE") ||
      (activeTab === "Guests" && m.memberType === "GUEST") ||
      (activeTab === "Suspended" && m.status === "SUSPENDED");
    return matchesSearch && matchesTab;
  });

  const tabs: FilterTab[] = [
    "All",
    "Admins",
    "Members",
    "Guests",
    "Suspended",
  ];

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Search Bar */}
      <div className="px-5 pt-4 pb-2">
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 bg-[#1a1a1a] rounded-lg text-sm text-white placeholder-[#6b7280] border border-[#374151] focus:border-green-500 focus:outline-none"
        />
      </div>

      {/* Filter Tabs */}
      <div className="px-5 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "bg-green-600 text-white"
                : "bg-[#1a1a1a] text-[#9ca3af] hover:bg-[#252525]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Member List */}
      <div className="px-5 pt-3 space-y-2">
        {membersQuery.isLoading ? (
          <div className="text-center py-8 text-[#6b7280]">
            Loading members...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-[#6b7280]">
            No members found
          </div>
        ) : (
          filtered.map((member) => (
            <div
              key={member.id}
              className="bg-[#1a1a1a] rounded-xl p-4 flex items-center gap-3 relative"
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                style={{
                  backgroundColor: getAvatarColor(member.displayName),
                }}
              >
                {member.displayName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {member.displayName}
                  </span>
                  <RoleBadge role={member.systemRole} />
                  {member.memberType === "GUEST" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-500">
                      Guest
                    </span>
                  )}
                  {member.status === "SUSPENDED" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-500">
                      Suspended
                    </span>
                  )}
                </div>

                {/* Special Role Chips */}
                {member.specialRoles.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {member.specialRoles.map((sr) => (
                      <span
                        key={sr.id}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[#374151]/60 text-[#9ca3af]"
                      >
                        {sr.emoji} {sr.name}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-[#4b5563] mt-1">
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </p>
              </div>

              {/* Kebab Menu */}
              {isOwnerOrAdmin && (
                <div className="relative">
                  <button
                    onClick={() =>
                      setMenuOpen(
                        menuOpen === member.personId ? null : member.personId
                      )
                    }
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-[#6b7280]"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <circle cx="8" cy="3" r="1.5" />
                      <circle cx="8" cy="8" r="1.5" />
                      <circle cx="8" cy="13" r="1.5" />
                    </svg>
                  </button>

                  {menuOpen === member.personId && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpen(null)}
                      />
                      <div className="absolute right-0 top-10 z-20 bg-[#252525] border border-[#374151] rounded-lg shadow-xl py-1 min-w-[160px]">
                        <button
                          onClick={() => {
                            setShowRoleModal(member);
                            setMenuOpen(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors"
                        >
                          Assign Special Role
                        </button>
                        {member.systemRole !== "OWNER" && (
                          <button
                            onClick={() =>
                              removeMutation.mutate(member.personId)
                            }
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors"
                          >
                            Remove Member
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Member FAB */}
      {isOwnerOrAdmin && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-24 right-5 w-14 h-14 bg-green-600 hover:bg-green-700 rounded-full shadow-lg flex items-center justify-center transition-colors z-10"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMemberModal
          clubId={clubId!}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Role Assignment Modal */}
      {showRoleModal && (
        <RoleAssignmentModal
          member={showRoleModal}
          customRoles={customRoles}
          onAssign={(customRoleId) =>
            assignRoleMutation.mutate({
              personId: showRoleModal.personId,
              customRoleId,
            })
          }
          onRemove={(customRoleId) =>
            removeRoleMutation.mutate({
              personId: showRoleModal.personId,
              customRoleId,
            })
          }
          onClose={() => setShowRoleModal(null)}
        />
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "MEMBER") return null;
  const color =
    role === "OWNER"
      ? "bg-amber-900/40 text-amber-400"
      : "bg-blue-900/40 text-blue-400";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${color}`}>
      {role}
    </span>
  );
}

function AddMemberModal({
  clubId,
  onClose,
}: {
  clubId: string;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (personId: string) =>
      api.post(`/clubs/${clubId}/members`, { personId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", clubId] });
      onClose();
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setError(err.response?.data?.error || "Failed to add member");
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Member</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <p className="text-sm text-[#9ca3af] mb-4">
          Enter the person's phone number or ID to add them.
        </p>
        <input
          type="text"
          placeholder="Phone number or person ID"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-4 py-2.5 bg-[#0f0f0f] rounded-lg text-sm border border-[#374151] focus:border-green-500 focus:outline-none mb-3"
        />
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <button
          onClick={() => phone && addMutation.mutate(phone)}
          disabled={!phone || addMutation.isPending}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:text-green-300 rounded-lg font-medium transition-colors"
        >
          {addMutation.isPending ? "Adding..." : "Add Member"}
        </button>
      </div>
    </div>
  );
}

function RoleAssignmentModal({
  member,
  customRoles,
  onAssign,
  onRemove,
  onClose,
}: {
  member: Member;
  customRoles: CustomRole[];
  onAssign: (roleId: string) => void;
  onRemove: (roleId: string) => void;
  onClose: () => void;
}) {
  const assignedIds = new Set(member.specialRoles.map((sr) => sr.id));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Roles for {member.displayName}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="space-y-2">
          {customRoles.map((role) => {
            const isAssigned = assignedIds.has(role.id);
            return (
              <div
                key={role.id}
                className="flex items-center justify-between bg-[#0f0f0f] rounded-lg px-4 py-3"
              >
                <span className="text-sm">
                  {role.emoji} {role.name}
                </span>
                <button
                  onClick={() =>
                    isAssigned ? onRemove(role.id) : onAssign(role.id)
                  }
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    isAssigned
                      ? "bg-green-600 text-white"
                      : "bg-[#374151] text-[#9ca3af] hover:bg-[#4b5563]"
                  }`}
                >
                  {isAssigned ? "Assigned" : "Assign"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getAvatarColor(name: string): string {
  const colors = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
