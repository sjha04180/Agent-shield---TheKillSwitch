import { create } from "zustand";

interface AnalyticsState {
  chartData: any | null;
  loading: boolean;
  error: string | null;
  fetchAnalytics: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  chartData: null,
  loading: false,
  error: null,

  fetchAnalytics: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/admin/analytics");
      const data = await res.json();
      if (data.success) {
        set({ chartData: data.data, loading: false });
      } else {
        set({ error: data.error?.message || "Failed to load analytics", loading: false });
      }
    } catch (e) {
      set({ error: "Failed to connect to API", loading: false });
    }
  }
}));
