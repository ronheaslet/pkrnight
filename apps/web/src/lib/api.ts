import axios from "axios";
import { useGameStore } from "../store/gameStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = useGameStore.getState().authToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track if a refresh is already in flight
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function attemptRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem("pkr_refresh_token");
  if (!refreshToken) return null;

  try {
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
    const newToken = res.data.accessToken;
    useGameStore.getState().setAuthToken(newToken);
    return newToken;
  } catch {
    localStorage.removeItem("pkr_refresh_token");
    return null;
  }
}

// Handle 401 — attempt refresh once, then redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = attemptRefresh().finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Refresh failed — clear and redirect
      useGameStore.getState().setAuthToken(null);
      useGameStore.getState().setCurrentUser(null);
      localStorage.removeItem("pkr_refresh_token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
