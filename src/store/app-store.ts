import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  provider: 'local' | 'google' | 'openai';
  model: string;
  sidebarOpen: boolean;
  setProvider: (provider: 'local' | 'google' | 'openai') => void;
  setModel: (model: string) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      provider: 'local',
      model: 'Qwen 3.5', // Default Local Model
      sidebarOpen: true,
      setProvider: (provider) => set({ provider }),
      setModel: (model) => set({ model }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'ai-workspace-storage',
    }
  )
);
