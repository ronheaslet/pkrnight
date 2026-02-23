import api from "./api";
import {
  getMockSystemStatus,
  getMockClubsOverview,
  getMockErrorFeed,
  getMockAiUsageSummary,
  getMockGrowthStats,
  getMockSuperAdminFeatureFlags,
} from "./superAdminMocks";

const useMock = import.meta.env.VITE_USE_MOCK_DATA === "true";

export async function fetchSystemStatus() {
  if (useMock) return getMockSystemStatus();
  const res = await api.get("/super/status");
  return res.data;
}

export async function fetchClubsOverview(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  if (useMock) return getMockClubsOverview();
  const res = await api.get("/super/clubs", { params });
  return res.data;
}

export async function fetchErrorFeed(params?: {
  severity?: string;
  resolved?: boolean;
}) {
  if (useMock) return getMockErrorFeed();
  const res = await api.get("/super/errors", { params });
  return res.data;
}

export async function resolveError(errorLogId: string) {
  if (useMock) return { success: true };
  const res = await api.patch(`/super/errors/${errorLogId}/resolve`);
  return res.data;
}

export async function fetchAiUsage() {
  if (useMock) return getMockAiUsageSummary();
  const res = await api.get("/super/ai-usage");
  return res.data;
}

export async function fetchGrowthStats() {
  if (useMock) return getMockGrowthStats();
  const res = await api.get("/super/growth");
  return res.data;
}

export async function fetchFeatureFlags() {
  if (useMock) return getMockSuperAdminFeatureFlags();
  const res = await api.get("/super/features");
  return res.data;
}

export async function updateFeatureFlag(
  featureKey: string,
  state: string
) {
  if (useMock) return { success: true };
  const res = await api.patch(`/super/features/${featureKey}`, { state });
  return res.data;
}

export async function deactivateClub(clubId: string, reason: string) {
  if (useMock) return { success: true };
  const res = await api.patch(`/super/clubs/${clubId}/deactivate`, { reason });
  return res.data;
}

export async function reactivateClub(clubId: string) {
  if (useMock) return { success: true };
  const res = await api.patch(`/super/clubs/${clubId}/reactivate`);
  return res.data;
}
