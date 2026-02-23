import { prisma } from "../../../../packages/db/src/client";

const MEMBER_INCLUDE = {
  person: {
    select: {
      id: true,
      displayName: true,
      phone: true,
      avatarUrl: true,
    },
  },
  specialRoles: {
    include: {
      customRole: {
        select: {
          id: true,
          name: true,
          emoji: true,
        },
      },
    },
  },
};

export async function getMembers(clubId: string) {
  const memberships = await prisma.membership.findMany({
    where: { clubId },
    include: MEMBER_INCLUDE,
    orderBy: [{ systemRole: "asc" }, { joinedAt: "asc" }],
  });

  return memberships.map((m) => ({
    id: m.id,
    personId: m.personId,
    displayName: m.person.displayName,
    phone: m.person.phone,
    avatarUrl: m.person.avatarUrl,
    systemRole: m.systemRole,
    memberType: m.memberType,
    status: m.status,
    joinedAt: m.joinedAt,
    specialRoles: m.specialRoles.map((sr) => ({
      id: sr.customRole.id,
      name: sr.customRole.name,
      emoji: sr.customRole.emoji,
    })),
  }));
}

export async function addMember(
  clubId: string,
  personId: string,
  actorId: string,
  options: {
    systemRole?: "OWNER" | "ADMIN" | "MEMBER";
    memberType?: "PAID" | "GUEST";
    invitedBy?: string;
  } = {}
) {
  // Verify actor is OWNER or ADMIN
  const actorMembership = await prisma.membership.findUnique({
    where: { clubId_personId: { clubId, personId: actorId } },
  });

  if (
    !actorMembership ||
    !["OWNER", "ADMIN"].includes(actorMembership.systemRole)
  ) {
    throw new Error("Only OWNER or ADMIN can add members");
  }

  // If adding as OWNER, only current OWNER can do this
  if (
    options.systemRole === "OWNER" &&
    actorMembership.systemRole !== "OWNER"
  ) {
    throw new Error("Only OWNER can add another OWNER");
  }

  // Check person is not already a member
  const existing = await prisma.membership.findUnique({
    where: { clubId_personId: { clubId, personId } },
  });
  if (existing) {
    throw new Error("Person is already a member of this club");
  }

  const membership = await prisma.membership.create({
    data: {
      clubId,
      personId,
      systemRole: options.systemRole || "MEMBER",
      memberType: options.memberType || "PAID",
      status: "ACTIVE",
      invitedBy: options.invitedBy || actorId,
    },
    include: MEMBER_INCLUDE,
  });

  return membership;
}

export async function removeMember(
  clubId: string,
  personId: string,
  actorId: string
) {
  // Verify actor is OWNER or ADMIN
  const actorMembership = await prisma.membership.findUnique({
    where: { clubId_personId: { clubId, personId: actorId } },
  });

  if (
    !actorMembership ||
    !["OWNER", "ADMIN"].includes(actorMembership.systemRole)
  ) {
    throw new Error("Only OWNER or ADMIN can remove members");
  }

  // Cannot remove the last OWNER
  const targetMembership = await prisma.membership.findUnique({
    where: { clubId_personId: { clubId, personId } },
  });

  if (!targetMembership) throw new Error("Member not found");

  if (targetMembership.systemRole === "OWNER") {
    const ownerCount = await prisma.membership.count({
      where: { clubId, systemRole: "OWNER", status: "ACTIVE" },
    });
    if (ownerCount <= 1) {
      throw new Error("Cannot remove the last owner");
    }
  }

  // Soft suspend — not a hard delete
  const updated = await prisma.membership.update({
    where: { clubId_personId: { clubId, personId } },
    data: { status: "SUSPENDED" },
    include: MEMBER_INCLUDE,
  });

  return updated;
}

export async function updateMemberRole(
  clubId: string,
  personId: string,
  systemRole: "OWNER" | "ADMIN" | "MEMBER",
  actorId: string
) {
  // Only OWNER can change systemRole
  const actorMembership = await prisma.membership.findUnique({
    where: { clubId_personId: { clubId, personId: actorId } },
  });

  if (!actorMembership || actorMembership.systemRole !== "OWNER") {
    throw new Error("Only OWNER can change system roles");
  }

  // Cannot demote yourself if you're the only OWNER
  if (actorId === personId && systemRole !== "OWNER") {
    const ownerCount = await prisma.membership.count({
      where: { clubId, systemRole: "OWNER", status: "ACTIVE" },
    });
    if (ownerCount <= 1) {
      throw new Error("Cannot demote yourself — you are the only owner");
    }
  }

  const updated = await prisma.membership.update({
    where: { clubId_personId: { clubId, personId } },
    data: { systemRole },
    include: MEMBER_INCLUDE,
  });

  return updated;
}

export async function assignSpecialRole(
  clubId: string,
  personId: string,
  customRoleId: string,
  actorId: string
) {
  // OWNER or ADMIN can assign
  const actorMembership = await prisma.membership.findUnique({
    where: { clubId_personId: { clubId, personId: actorId } },
  });

  if (
    !actorMembership ||
    !["OWNER", "ADMIN"].includes(actorMembership.systemRole)
  ) {
    throw new Error("Only OWNER or ADMIN can assign special roles");
  }

  const membership = await prisma.membership.findUnique({
    where: { clubId_personId: { clubId, personId } },
  });

  if (!membership) throw new Error("Member not found");

  await prisma.memberSpecialRole.create({
    data: {
      membershipId: membership.id,
      customRoleId,
      assignedBy: actorId,
    },
  });

  // Return updated member with all roles
  const updated = await prisma.membership.findUnique({
    where: { id: membership.id },
    include: MEMBER_INCLUDE,
  });

  return updated;
}

export async function removeSpecialRole(
  clubId: string,
  personId: string,
  customRoleId: string,
  actorId: string
) {
  // OWNER or ADMIN can remove
  const actorMembership = await prisma.membership.findUnique({
    where: { clubId_personId: { clubId, personId: actorId } },
  });

  if (
    !actorMembership ||
    !["OWNER", "ADMIN"].includes(actorMembership.systemRole)
  ) {
    throw new Error("Only OWNER or ADMIN can remove special roles");
  }

  const membership = await prisma.membership.findUnique({
    where: { clubId_personId: { clubId, personId } },
  });

  if (!membership) throw new Error("Member not found");

  await prisma.memberSpecialRole.delete({
    where: {
      membershipId_customRoleId: {
        membershipId: membership.id,
        customRoleId,
      },
    },
  });

  // Return updated member
  const updated = await prisma.membership.findUnique({
    where: { id: membership.id },
    include: MEMBER_INCLUDE,
  });

  return updated;
}

export async function createCustomRole(
  clubId: string,
  data: {
    name: string;
    emoji: string;
    description?: string;
    pauseTimer?: boolean;
    startGame?: boolean;
    manageRebuys?: boolean;
    eliminatePlayers?: boolean;
    manageMoney?: boolean;
    postTransactions?: boolean;
    viewFinancials?: boolean;
    exportReports?: boolean;
    viewAuditLog?: boolean;
    issuePenalties?: boolean;
    makeAnnouncements?: boolean;
    awardTrophies?: boolean;
    postToFeed?: boolean;
    postExpenseOnly?: boolean;
    pauseAllTables?: boolean;
    clubWideAnnounce?: boolean;
    levelOverride?: boolean;
  },
  actorId: string
) {
  // OWNER or ADMIN can create
  const actorMembership = await prisma.membership.findUnique({
    where: { clubId_personId: { clubId, personId: actorId } },
  });

  if (
    !actorMembership ||
    !["OWNER", "ADMIN"].includes(actorMembership.systemRole)
  ) {
    throw new Error("Only OWNER or ADMIN can create custom roles");
  }

  const { name, emoji, description, ...permissions } = data;

  const customRole = await prisma.customRole.create({
    data: {
      clubId,
      name,
      emoji,
      description: description || null,
      isSystem: false,
      ...permissions,
    },
  });

  return customRole;
}

export async function transferOwnership(
  clubId: string,
  toPersonId: string,
  actorId: string
) {
  // Only current OWNER can initiate
  const actorMembership = await prisma.membership.findUnique({
    where: { clubId_personId: { clubId, personId: actorId } },
  });

  if (!actorMembership || actorMembership.systemRole !== "OWNER") {
    throw new Error("Only the current owner can transfer ownership");
  }

  const targetMembership = await prisma.membership.findUnique({
    where: { clubId_personId: { clubId, personId: toPersonId } },
  });

  if (!targetMembership || targetMembership.status !== "ACTIVE") {
    throw new Error("Target must be an active member");
  }

  const result = await prisma.$transaction(async (tx) => {
    const newOwner = await tx.membership.update({
      where: { clubId_personId: { clubId, personId: toPersonId } },
      data: { systemRole: "OWNER" },
      include: MEMBER_INCLUDE,
    });

    const oldOwner = await tx.membership.update({
      where: { clubId_personId: { clubId, personId: actorId } },
      data: { systemRole: "ADMIN" },
      include: MEMBER_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        clubId,
        actorId,
        action: "TRANSFER",
        entityType: "Membership",
        entityId: newOwner.id,
        previousValue: { owner: actorId },
        newValue: { owner: toPersonId },
      },
    });

    return { newOwner, oldOwner };
  });

  return result;
}

export async function getCustomRoles(clubId: string) {
  return prisma.customRole.findMany({
    where: { clubId },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}
