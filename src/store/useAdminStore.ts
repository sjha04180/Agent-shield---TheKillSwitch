import { create } from "zustand";

export interface UserAccount {
  _id: string;
  name: string;
  email: string;
  role: "owner" | "admin";
  organization?: string;
  status?: "active" | "suspended";
}

export interface OrganizationInfo {
  _id: string;
  name: string;
  industry: string;
  country: string;
  status: "active" | "suspended";
  walletCount: number;
  agentCount: number;
  riskScore: number;
}

interface AdminState {
  users: UserAccount[];
  organizations: OrganizationInfo[];
  metrics: any | null;
  demoMode: boolean;
  lyzrEnabled: boolean;
  loading: boolean;
  error: string | null;
  
  fetchUsers: () => Promise<void>;
  fetchOrganizations: () => Promise<void>;
  fetchAdminDashboard: () => Promise<void>;
  toggleUserStatus: (id: string, status: "active" | "suspended") => Promise<boolean>;
  toggleOrgStatus: (id: string, status: "active" | "suspended") => Promise<boolean>;
  fetchSettings: () => Promise<void>;
  updateSettings: (demoMode: boolean, lyzrEnabled: boolean) => Promise<boolean>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  users: [],
  organizations: [],
  metrics: null,
  demoMode: true,
  lyzrEnabled: true,
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) {
        set({ users: data.data, loading: false });
      } else {
        set({ error: data.error?.message || "Failed to load users", loading: false });
      }
    } catch (e) {
      set({ error: "Failed to connect to API", loading: false });
    }
  },

  fetchOrganizations: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/admin/organizations");
      const data = await res.json();
      if (data.success) {
        set({ organizations: data.data, loading: false });
      } else {
        set({ error: data.error?.message || "Failed to load organizations", loading: false });
      }
    } catch (e) {
      set({ error: "Failed to connect to API", loading: false });
    }
  },

  fetchAdminDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/admin/dashboard");
      const data = await res.json();
      if (data.success) {
        set({ metrics: data.data, loading: false });
      } else {
        set({ error: data.error?.message || "Failed to load dashboard metrics", loading: false });
      }
    } catch (e) {
      set({ error: "Failed to connect to API", loading: false });
    }
  },

  toggleUserStatus: async (id, status) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, status })
      });
      const data = await res.json();
      if (data.success) {
        set((state) => ({
          users: state.users.map(u => u._id === id ? { ...u, status } : u)
        }));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  toggleOrgStatus: async (id, status) => {
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: id, status })
      });
      const data = await res.json();
      if (data.success) {
        set((state) => ({
          organizations: state.organizations.map(o => o._id === id ? { ...o, status } : o)
        }));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        set({ demoMode: data.data.demoMode, lyzrEnabled: data.data.lyzrEnabled, loading: false });
      } else {
        set({ error: data.error?.message || "Failed to load settings", loading: false });
      }
    } catch (e) {
      set({ error: "Failed to connect to settings API", loading: false });
    }
  },

  updateSettings: async (demoMode, lyzrEnabled) => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoMode, lyzrEnabled })
      });
      const data = await res.json();
      if (data.success) {
        set({ demoMode: data.data.demoMode, lyzrEnabled: data.data.lyzrEnabled });
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}));
