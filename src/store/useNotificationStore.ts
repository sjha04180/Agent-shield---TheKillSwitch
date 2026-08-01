import { create } from 'zustand';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (title: string, message: string, type?: AppNotification['type']) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [
    {
      id: 'init-notification',
      title: 'Governance Active',
      message: 'AgentShield policy checking engine has booted up successfully.',
      type: 'success',
      timestamp: new Date(),
      read: false
    }
  ],
  addNotification: (title, message, type = 'info') => set((state) => ({
    notifications: [
      {
        id: Math.random().toString(36).substring(7),
        title,
        message,
        type,
        timestamp: new Date(),
        read: false
      },
      ...state.notifications
    ]
  })),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n)
  })),
  clearAll: () => set({ notifications: [] })
}));
