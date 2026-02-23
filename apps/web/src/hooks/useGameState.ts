import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import type { GameState } from "../store/gameStore";

export function useGameState(gameId: string) {
  const { data, isLoading, error } = useQuery<GameState>({
    queryKey: ["gameState", gameId],
    queryFn: async () => {
      const res = await api.get(`/games/${gameId}/state`);
      return res.data;
    },
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    enabled: !!gameId,
  });

  return {
    gameState: data ?? null,
    isLoading,
    error,
    isMockData: false, // Would check response header in a more sophisticated setup
  };
}
