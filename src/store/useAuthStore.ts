import { create } from 'zustand';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin';
  organization?: string;
  timezone?: string;
  image?: string;
}

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      if (data.success) {
        set({ user: data.data, loading: false });
      } else {
        set({ error: data.error?.message || 'Failed to load profile', loading: false });
      }
    } catch (e) {
      set({ error: 'Connection failed', loading: false });
    }
  },
  updateProfile: async (payload) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        set({ user: data.data, loading: false });
        return true;
      } else {
        set({ error: data.error?.message || 'Failed to update profile', loading: false });
        return false;
      }
    } catch (e) {
      set({ error: 'Connection failed', loading: false });
      return false;
    }
  }
}));
