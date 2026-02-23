import { useQuery } from "@tanstack/react-query";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";

interface UserCircuit {
  id: string;
  name: string;
  slug: string;
}

export function useCircuits() {
  const currentUser = useGameStore((s) => s.currentUser);

  return useQuery<UserCircuit[]>({
    queryKey: ["myCircuits", currentUser?.userId],
    queryFn: () => api.get("/circuits/me").then((r) => r.data),
    enabled: !!currentUser?.userId,
    staleTime: 5 * 60 * 1000,
  });
}
