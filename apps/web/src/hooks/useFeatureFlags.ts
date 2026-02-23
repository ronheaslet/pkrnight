import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

export interface FeatureFlag {
  featureKey: string;
  name: string;
  description: string | null;
  globalState: string;
  clubEnabled: boolean;
  isContextLocked: boolean;
  contextNote: string | null;
}

export function useFeatureFlags(clubId: string | undefined) {
  const query = useQuery<FeatureFlag[]>({
    queryKey: ["featureFlags", clubId],
    queryFn: () => api.get(`/clubs/${clubId}/features`).then((r) => r.data),
    enabled: !!clubId,
    staleTime: 60_000,
  });

  const flags = query.data ?? [];

  const isEnabled = (featureKey: string): boolean => {
    const flag = flags.find((f) => f.featureKey === featureKey);
    if (!flag) return false;
    return flag.clubEnabled && !flag.isContextLocked;
  };

  const isLoaded = !query.isLoading && !!query.data;

  return { flags, isEnabled, isLoaded, isLoading: query.isLoading };
}
