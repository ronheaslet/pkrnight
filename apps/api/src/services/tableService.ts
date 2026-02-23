import { db } from "../../../../packages/db/src/client";
import { createNotification } from "./notificationService";

const DEFAULT_MAX_SEATS = 9;

export async function assignSeat(gameId: string, personId: string) {
  // Get all active tables for this game
  let tables = await db.gameTable.findMany({
    where: { gameId, isActive: true },
    orderBy: { tableNumber: "asc" },
  });

  // Get current seat assignments
  const sessions = await db.gameSession.findMany({
    where: { gameId, status: "ACTIVE", tableNumber: { not: null } },
    select: { tableNumber: true, seatNumber: true },
  });

  // Count players per table
  const tableCounts = new Map<number, number>();
  const takenSeats = new Map<number, Set<number>>();
  for (const s of sessions) {
    if (s.tableNumber !== null) {
      tableCounts.set(s.tableNumber, (tableCounts.get(s.tableNumber) ?? 0) + 1);
      if (!takenSeats.has(s.tableNumber)) takenSeats.set(s.tableNumber, new Set());
      if (s.seatNumber !== null) takenSeats.get(s.tableNumber)!.add(s.seatNumber);
    }
  }

  // If no tables exist, create Table 1
  if (tables.length === 0) {
    const newTable = await db.gameTable.create({
      data: { gameId, tableNumber: 1, maxSeats: DEFAULT_MAX_SEATS },
    });
    tables = [newTable];
  }

  // Find the table with fewest players that still has open seats
  let targetTable: { tableNumber: number; maxSeats: number } | null = null;
  let minPlayers = Infinity;

  for (const table of tables) {
    const count = tableCounts.get(table.tableNumber) ?? 0;
    if (count < table.maxSeats && count < minPlayers) {
      minPlayers = count;
      targetTable = table;
    }
  }

  // If all tables are full, create a new table
  if (!targetTable) {
    const maxExisting = tables.length > 0
      ? Math.max(...tables.map((t) => t.tableNumber))
      : 0;
    const newTable = await db.gameTable.create({
      data: { gameId, tableNumber: maxExisting + 1, maxSeats: DEFAULT_MAX_SEATS },
    });
    targetTable = newTable;
  }

  // Find lowest available seat at that table
  const taken = takenSeats.get(targetTable.tableNumber) ?? new Set();
  let seatNumber = 1;
  while (taken.has(seatNumber)) seatNumber++;

  return { tableNumber: targetTable.tableNumber, seatNumber };
}

export async function getTableAssignments(gameId: string) {
  const tables = await db.gameTable.findMany({
    where: { gameId },
    orderBy: { tableNumber: "asc" },
  });

  const sessions = await db.gameSession.findMany({
    where: { gameId, tableNumber: { not: null } },
    include: {
      person: { select: { id: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { seatNumber: "asc" },
  });

  return tables.map((table) => {
    const players = sessions
      .filter((s) => s.tableNumber === table.tableNumber)
      .map((s) => ({
        personId: s.personId,
        displayName: s.person.displayName,
        avatarUrl: s.person.avatarUrl,
        seatNumber: s.seatNumber,
        currentStack: s.currentStack,
        status: s.status,
      }));

    // Build seat map with nulls for empty seats
    const seats: (typeof players[number] | null)[] = [];
    for (let i = 1; i <= table.maxSeats; i++) {
      const player = players.find((p) => p.seatNumber === i);
      seats.push(player ?? null);
    }

    return {
      tableNumber: table.tableNumber,
      maxSeats: table.maxSeats,
      isActive: table.isActive,
      players,
      seats,
    };
  });
}

interface MoveSuggestion {
  fromTable: number;
  fromSeat: number;
  personId: string;
  displayName: string;
  toTable: number;
  toSeat: number;
}

export async function balanceTables(gameId: string, actorId: string) {
  const activeSessions = await db.gameSession.findMany({
    where: { gameId, status: "ACTIVE", tableNumber: { not: null } },
    include: {
      person: { select: { id: true, displayName: true } },
    },
  });

  const tables = await db.gameTable.findMany({
    where: { gameId, isActive: true },
    orderBy: { tableNumber: "asc" },
  });

  if (tables.length <= 1) {
    return { suggestions: [], isBalanced: true };
  }

  const totalPlayers = activeSessions.length;
  const tableCount = tables.length;
  const idealPerTable = Math.ceil(totalPlayers / tableCount);

  // Count per table
  const tablePlayers = new Map<number, typeof activeSessions>();
  for (const table of tables) {
    tablePlayers.set(
      table.tableNumber,
      activeSessions.filter((s) => s.tableNumber === table.tableNumber)
    );
  }

  // Find over-capacity and under-capacity tables
  const overTables: number[] = [];
  const underTables: number[] = [];
  for (const [tableNum, players] of tablePlayers) {
    if (players.length > idealPerTable) overTables.push(tableNum);
    else if (players.length < idealPerTable - 1) underTables.push(tableNum);
  }

  if (overTables.length === 0 || underTables.length === 0) {
    return { suggestions: [], isBalanced: true };
  }

  // Generate move suggestions — max 1 per over-capacity table
  const suggestions: MoveSuggestion[] = [];
  const movedTables = new Set<number>();

  for (const fromTableNum of overTables) {
    if (movedTables.has(fromTableNum)) continue;

    const fromPlayers = tablePlayers.get(fromTableNum)!;
    // Pick the last player at the table (least disruptive)
    const playerToMove = fromPlayers[fromPlayers.length - 1];

    // Find the most under-capacity table
    let bestUnder: number | null = null;
    let leastPlayers = Infinity;
    for (const toTableNum of underTables) {
      const count = tablePlayers.get(toTableNum)!.length;
      if (count < leastPlayers) {
        leastPlayers = count;
        bestUnder = toTableNum;
      }
    }

    if (bestUnder === null) break;

    // Find available seat at destination table
    const destPlayers = tablePlayers.get(bestUnder)!;
    const takenSeats = new Set(destPlayers.map((p) => p.seatNumber));
    let toSeat = 1;
    while (takenSeats.has(toSeat)) toSeat++;

    suggestions.push({
      fromTable: fromTableNum,
      fromSeat: playerToMove!.seatNumber!,
      personId: playerToMove!.personId,
      displayName: playerToMove!.person.displayName,
      toTable: bestUnder,
      toSeat,
    });

    movedTables.add(fromTableNum);
  }

  return {
    suggestions,
    isBalanced: suggestions.length === 0,
  };
}

export async function approveMoves(
  gameId: string,
  moves: MoveSuggestion[],
  actorId: string
) {
  for (const move of moves) {
    await db.gameSession.updateMany({
      where: { gameId, personId: move.personId },
      data: { tableNumber: move.toTable, seatNumber: move.toSeat },
    });

    // Notify the moved player
    await createNotification({
      personId: move.personId,
      type: "TABLE_MOVE",
      title: "Table Move",
      body: `Move to Table ${move.toTable}, Seat ${move.toSeat}`,
    });
  }

  return getTableAssignments(gameId);
}

export async function formFinalTable(gameId: string, actorId: string) {
  // Get all active players
  const activeSessions = await db.gameSession.findMany({
    where: { gameId, status: "ACTIVE" },
    include: { person: { select: { id: true, displayName: true } } },
  });

  // Deactivate all tables except Table 1
  await db.gameTable.updateMany({
    where: { gameId, tableNumber: { not: 1 } },
    data: { isActive: false },
  });

  // Ensure Table 1 exists
  await db.gameTable.upsert({
    where: { gameId_tableNumber: { gameId, tableNumber: 1 } },
    update: { isActive: true },
    create: { gameId, tableNumber: 1, maxSeats: DEFAULT_MAX_SEATS, isActive: true },
  });

  // Reassign all active players to Table 1 with sequential seats
  for (let i = 0; i < activeSessions.length; i++) {
    const session = activeSessions[i]!;
    const newSeat = i + 1;
    const oldTable = session.tableNumber;

    await db.gameSession.update({
      where: { id: session.id },
      data: { tableNumber: 1, seatNumber: newSeat },
    });

    // Notify if player was actually moved (different table or seat)
    if (oldTable !== 1 || session.seatNumber !== newSeat) {
      await createNotification({
        personId: session.personId,
        type: "TABLE_MOVE",
        title: "Final Table!",
        body: `Move to Table 1, Seat ${newSeat}`,
      });
    }
  }

  return getTableAssignments(gameId);
}
