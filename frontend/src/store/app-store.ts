import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AppState {
  provider: 'local' | 'google' | 'openai';
  model: string;
  sidebarOpen: boolean;
  googleApiKey: string;
  openaiApiKey: string;
  messages: Message[];
  setProvider: (provider: 'local' | 'google' | 'openai') => void;
  setModel: (model: string) => void;
  toggleSidebar: () => void;
  setGoogleApiKey: (key: string) => void;
  setOpenaiApiKey: (key: string) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  clearMessages: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      provider: 'local',
      model: 'Qwen 3.5', // Default Local Model
      sidebarOpen: true,
      googleApiKey: '',
      openaiApiKey: '',
      messages: [],
      setProvider: (provider) => set({ provider }),
      setModel: (model) => set({ model }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setGoogleApiKey: (key) => set({ googleApiKey: key }),
      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
      setMessages: (messagesOrFn) => set((state) => ({
        messages: typeof messagesOrFn === 'function' ? messagesOrFn(state.messages) : messagesOrFn
      })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'ai-workspace-storage',
    }
  )
);
