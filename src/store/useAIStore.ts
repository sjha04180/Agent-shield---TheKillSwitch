import { create } from "zustand";

export interface ChatMessage {
  _id?: string;
  role: "user" | "model" | "system";
  content: string;
  timestamp: string;
}

export interface ChatConversation {
  _id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

interface AIState {
  conversations: ChatConversation[];
  activeConversation: ChatConversation | null;
  loading: boolean;
  usageRequests: number;
  usageTokens: number;
  error: string | null;

  fetchConversations: () => Promise<void>;
  startNewConversation: () => void;
  selectConversation: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearConversation: () => Promise<void>;
  fetchUsage: () => Promise<void>;
}

export const useAIStore = create<AIState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  loading: false,
  usageRequests: 0,
  usageTokens: 0,
  error: null,

  fetchConversations: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/ai/chat");
      const data = await res.json();
      if (data.success) {
        set({ conversations: data.data, loading: false });
        if (data.data.length > 0 && !get().activeConversation) {
          set({ activeConversation: data.data[0] });
        }
      } else {
        set({ loading: false });
      }
    } catch (e) {
      set({ error: "Failed to connect to AI gateway API", loading: false });
    }
  },

  startNewConversation: () => {
    set({
      activeConversation: {
        _id: "temp_" + Date.now(),
        title: "New Conversation",
        messages: [],
        updatedAt: new Date().toISOString()
      }
    });
  },

  selectConversation: (id) => {
    const chat = get().conversations.find(c => c._id === id);
    if (chat) {
      set({ activeConversation: chat });
    }
  },

  sendMessage: async (content) => {
    const active = get().activeConversation;
    if (!active) return;

    // Append user message immediately
    const userMsg: ChatMessage = {
      role: "user",
      content,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...active.messages, userMsg];
    set({
      activeConversation: {
        ...active,
        messages: updatedMessages
      },
      loading: true
    });

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: active._id.startsWith("temp_") ? undefined : active._id,
          message: content
        })
      });
      const data = await res.json();

      set({ loading: false });

      if (data.success) {
        // Update active conversation with model message and correct DB ID
        const modelMsg: ChatMessage = {
          role: "model",
          content: data.data.response,
          timestamp: new Date().toISOString()
        };

        set({
          activeConversation: {
            _id: data.data.chatId,
            title: data.data.title || active.title,
            messages: [...updatedMessages, modelMsg],
            updatedAt: new Date().toISOString()
          }
        });
        
        // Refresh conversations history list
        get().fetchConversations();
      } else {
        set({ error: data.error?.message || "Failed to get reply" });
      }
    } catch (e) {
      set({ error: "Failed to send message", loading: false });
    }
  },

  clearConversation: async () => {
    const active = get().activeConversation;
    if (!active || active._id.startsWith("temp_")) {
      get().startNewConversation();
      return;
    }

    try {
      const res = await fetch(`/api/ai/chat?chatId=${active._id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        get().startNewConversation();
        get().fetchConversations();
      }
    } catch (e) {
      console.error(e);
    }
  },

  fetchUsage: async () => {
    try {
      const res = await fetch("/api/ai/chat?usageOnly=true");
      const data = await res.json();
      if (data.success && data.data) {
        set({
          usageRequests: data.data.requestsToday,
          usageTokens: data.data.tokenUsage
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
}));
