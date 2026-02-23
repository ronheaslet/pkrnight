import { useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";

export function useUnreadCount() {
  const authToken = useGameStore((s) => s.authToken);
  const currentUser = useGameStore((s) => s.currentUser);
  const currentClub = useGameStore((s) => s.currentClub);
  const setUnreadCount = useGameStore((s) => s.setUnreadCount);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clubId = currentUser?.clubId || currentClub?.id;

  useEffect(() => {
    if (!authToken || !clubId) return;

    const fetchCount = async () => {
      try {
        const res = await api.get(`/inbox/count?clubId=${clubId}`);
        setUnreadCount(res.data.unreadCount ?? 0);
      } catch {
        // silently fail — badge just won't update
      }
    };

    fetchCount();
    intervalRef.current = setInterval(fetchCount, 60_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [authToken, clubId, setUnreadCount]);
}
