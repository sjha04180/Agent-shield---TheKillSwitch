import { create } from "zustand";

export interface HealthStatus {
  apiStatus: string;
  dbStatus: string;
  blockchainStatus: string;
  geminiStatus: string;
  lyzrStatus: string;
  simulatorStatus: string;
  metaMaskStatus: string;
  responseTime: number;
  memoryUsage: number;
  storageUsage: number;
  apiLatencyMs?: number;
  version?: string;
}

interface HealthState {
  health: HealthStatus | null;
  loading: boolean;
  error: string | null;
  fetchHealth: () => Promise<void>;
}

export const useSystemHealthStore = create<HealthState>((set) => ({
  health: null,
  loading: false,
  error: null,

  fetchHealth: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/system/health");
      const data = await res.json();
      if (data.success) {
        set({ health: data.data, loading: false });
      } else {
        set({ error: data.error?.message || "Failed to load health metrics", loading: false });
      }
    } catch (e) {
      set({ error: "Failed to connect to API", loading: false });
    }
  }
}));
