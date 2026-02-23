import { db } from "../../../../packages/db/src/client";

export async function updateChipDenomination(
  chipDenominationId: string,
  newValue: number,
  changedBy: string,
  gameId?: string
) {
  const denomination = await db.chipDenomination.findUnique({
    where: { id: chipDenominationId },
    include: { chipSet: true },
  });

  if (!denomination) throw new Error("Chip denomination not found");

  const previousValue = denomination.value;
  const clubId = denomination.chipSet.clubId;

  // Create change record
  const changeRecord = await db.chipDenominationChange.create({
    data: {
      chipDenominationId,
      gameId: gameId ?? null,
      clubId,
      changedBy,
      previousValue,
      newValue,
      applyRetroactive: true,
      notificationSent: false,
    },
  });

  // Update denomination value
  await db.chipDenomination.update({
    where: { id: chipDenominationId },
    data: { value: newValue },
  });

  // Mid-game change: notify all active players
  if (gameId) {
    const activeSessions = await db.gameSession.findMany({
      where: { gameId, status: "ACTIVE" },
    });

    const notificationBody = `${denomination.colorName} chips changed from ${previousValue} to ${newValue}. Please rescan your stack.`;

    for (const session of activeSessions) {
      await db.notification.create({
        data: {
          clubId,
          personId: session.personId,
          type: "CHIP_VALUE_CHANGE",
          channel: "IN_APP",
          title: "Chip Value Changed",
          body: notificationBody,
          data: {
            chipDenominationId,
            colorName: denomination.colorName,
            previousValue,
            newValue,
            gameId,
          },
        },
      });
    }

    // Mark notification sent
    await db.chipDenominationChange.update({
      where: { id: changeRecord.id },
      data: { notificationSent: true },
    });
  }

  // Audit log
  await db.auditLog.create({
    data: {
      clubId,
      actorId: changedBy,
      action: "UPDATE",
      entityType: "ChipDenomination",
      entityId: chipDenominationId,
      previousValue: { value: previousValue, colorName: denomination.colorName },
      newValue: { value: newValue, colorName: denomination.colorName },
    },
  });

  const updatedDenomination = await db.chipDenomination.findUnique({
    where: { id: chipDenominationId },
  });

  return { denomination: updatedDenomination, changeRecord };
}
