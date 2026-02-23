import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import api from "../lib/api";
import { useGameStore } from "../store/gameStore";
import { isMockPubClub, mockPubClub } from "../lib/pubPokerMocks";

export function useClub(clubId: string | undefined) {
  const setCurrentClub = useGameStore((s) => s.setCurrentClub);
  const setActiveGameId = useGameStore((s) => s.setActiveGameId);

  const clubQuery = useQuery({
    queryKey: ["club", clubId],
    queryFn: () => {
      if (isMockPubClub(clubId)) return Promise.resolve(mockPubClub);
      return api.get(`/clubs/${clubId}`).then((r) => r.data);
    },
    enabled: !!clubId,
    staleTime: 30_000,
  });

  // Poll for active game every 30 seconds
  const activeGameQuery = useQuery({
    queryKey: ["activeGame", clubId],
    queryFn: async () => {
      // For now, the game state endpoint checks for active games
      // This will be enhanced when game listing is built in Phase 4
      try {
        const res = await api.get(`/games/mock-game-001/state`);
        const game = res.data?.game;
        if (
          game?.clubId === clubId &&
          (game?.status === "ACTIVE" || game?.status === "PAUSED")
        ) {
          return game.id as string;
        }
      } catch {
        // No active game
      }
      return null;
    },
    enabled: !!clubId,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (clubQuery.data) {
      setCurrentClub(clubQuery.data);
    }
  }, [clubQuery.data, setCurrentClub]);

  useEffect(() => {
    setActiveGameId(activeGameQuery.data ?? null);
  }, [activeGameQuery.data, setActiveGameId]);

  return {
    club: clubQuery.data ?? null,
    isLoading: clubQuery.isLoading,
    error: clubQuery.error,
    activeGameId: activeGameQuery.data ?? null,
  };
}
