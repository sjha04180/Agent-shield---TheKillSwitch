import { create } from "zustand";

export interface SystemSettings {
  demoMode: boolean;
  lyzrEnabled: boolean;
  simulatorSpeed: "normal" | "fast" | "stress";
  autoDemo: boolean;
  blockchainSimulation: boolean;
  geminiEnabled: boolean;
}

interface SettingsState extends SystemSettings {
  loading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (payload: Partial<SystemSettings>) => Promise<boolean>;
  resetDemoData: () => Promise<boolean>;
  setupDemoData: () => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  demoMode: true,
  lyzrEnabled: true,
  simulatorSpeed: "normal",
  autoDemo: false,
  blockchainSimulation: true,
  geminiEnabled: true,
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        set({
          demoMode: data.data.demoMode,
          lyzrEnabled: data.data.lyzrEnabled,
          simulatorSpeed: data.data.simulatorSpeed,
          autoDemo: data.data.autoDemo,
          blockchainSimulation: data.data.blockchainSimulation,
          geminiEnabled: data.data.geminiEnabled,
          loading: false,
        });
      } else {
        set({ error: data.error?.message || "Failed to load settings", loading: false });
      }
    } catch (e) {
      set({ error: "Failed to connect to Settings API", loading: false });
    }
  },

  updateSettings: async (payload) => {
    set({ loading: true, error: null });
    const current = get();
    const updated = {
      demoMode: payload.demoMode !== undefined ? payload.demoMode : current.demoMode,
      lyzrEnabled: payload.lyzrEnabled !== undefined ? payload.lyzrEnabled : current.lyzrEnabled,
      simulatorSpeed: payload.simulatorSpeed !== undefined ? payload.simulatorSpeed : current.simulatorSpeed,
      autoDemo: payload.autoDemo !== undefined ? payload.autoDemo : current.autoDemo,
      blockchainSimulation: payload.blockchainSimulation !== undefined ? payload.blockchainSimulation : current.blockchainSimulation,
      geminiEnabled: payload.geminiEnabled !== undefined ? payload.geminiEnabled : current.geminiEnabled,
    };

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success) {
        set({
          demoMode: data.data.demoMode,
          lyzrEnabled: data.data.lyzrEnabled,
          simulatorSpeed: data.data.simulatorSpeed,
          autoDemo: data.data.autoDemo,
          blockchainSimulation: data.data.blockchainSimulation,
          geminiEnabled: data.data.geminiEnabled,
          loading: false,
        });
        return true;
      } else {
        set({ error: data.error?.message || "Failed to update settings", loading: false });
        return false;
      }
    } catch (e) {
      set({ error: "Failed to connect to API", loading: false });
      return false;
    }
  },

  resetDemoData: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/admin/demo/reset", { method: "POST" });
      const data = await res.json();
      set({ loading: false });
      return data.success;
    } catch (e) {
      set({ error: "Connection error during demo reset", loading: false });
      return false;
    }
  },

  setupDemoData: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/admin/demo/setup", { method: "POST" });
      const data = await res.json();
      set({ loading: false });
      return data.success;
    } catch (e) {
      set({ error: "Connection error during demo setup", loading: false });
      return false;
    }
  },
}));
