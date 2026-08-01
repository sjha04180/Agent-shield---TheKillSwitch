import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: true, // AgentShield is dark-first/only by default to respect branding variables
  toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
}));
