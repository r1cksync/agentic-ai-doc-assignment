import { create } from "zustand";

const useStore = create((set, get) => ({
  // Documents
  documents: [],
  setDocuments: (docs) => set({ documents: docs }),
  selectedDocIds: [],
  setSelectedDocIds: (ids) => set({ selectedDocIds: ids }),

  // Sessions
  sessions: [],
  setSessions: (sessions) => set({ sessions }),
  currentSessionId: null,
  setCurrentSessionId: (id) => set({ currentSessionId: id }),

  // Chat
  messages: [],
  setMessages: (msgs) => set({ messages: msgs }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastMessage: (update) =>
    set((s) => {
      const msgs = [...s.messages];
      if (msgs.length > 0) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...update };
      return { messages: msgs };
    }),
  isStreaming: false,
  setIsStreaming: (v) => set({ isStreaming: v }),

  // UI
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  darkMode: true,
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

  // Analytics
  analytics: null,
  setAnalytics: (data) => set({ analytics: data }),
}));

export default useStore;
