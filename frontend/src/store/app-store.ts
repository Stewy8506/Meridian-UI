import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface AppState {
  provider: 'local' | 'google' | 'openai';
  model: string;
  sidebarOpen: boolean;
  googleApiKey: string;
  openaiApiKey: string;
  searchProvider: 'tavily' | 'exa';
  tavilyApiKey: string;
  exaApiKey: string;
  messages: Message[];
  chats: ChatSession[];
  activeChatId: string | null;
  setProvider: (provider: 'local' | 'google' | 'openai') => void;
  setModel: (model: string) => void;
  toggleSidebar: () => void;
  setGoogleApiKey: (key: string) => void;
  setOpenaiApiKey: (key: string) => void;
  setSearchProvider: (provider: 'tavily' | 'exa') => void;
  setTavilyApiKey: (key: string) => void;
  setExaApiKey: (key: string) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  clearMessages: () => void;
  
  // Multiple Chats actions
  createChat: () => string;
  deleteChat: (id: string) => void;
  setActiveChatId: (id: string | null) => void;
  updateChatTitle: (id: string, title: string) => void;
  hydrateChats: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      provider: 'local',
      model: 'Qwen 3.5', // Default Local Model
      sidebarOpen: true,
      googleApiKey: '',
      openaiApiKey: '',
      searchProvider: 'tavily',
      tavilyApiKey: '',
      exaApiKey: '',
      messages: [],
      chats: [],
      activeChatId: null,
      setProvider: (provider) => set({ provider }),
      setModel: (model) => set({ model }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setGoogleApiKey: (key) => set({ googleApiKey: key }),
      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
      setSearchProvider: (provider) => set({ searchProvider: provider }),
      setTavilyApiKey: (key) => set({ tavilyApiKey: key }),
      setExaApiKey: (key) => set({ exaApiKey: key }),
      
      setMessages: (messagesOrFn) => set((state) => {
        const nextMessages = typeof messagesOrFn === 'function' ? messagesOrFn(state.messages) : messagesOrFn;
        let currentActiveId = state.activeChatId;
        let currentChats = state.chats;
        
        if (!currentActiveId) {
          currentActiveId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
          const newChat: ChatSession = {
            id: currentActiveId,
            title: 'New Chat',
            messages: nextMessages,
            createdAt: Date.now()
          };
          currentChats = [newChat];
        } else {
          currentChats = state.chats.map((c) => 
            c.id === currentActiveId ? { ...c, messages: nextMessages } : c
          );
        }
        
        return {
          messages: nextMessages,
          activeChatId: currentActiveId,
          chats: currentChats
        };
      }),
      
      clearMessages: () => set((state) => ({
        messages: [],
        chats: state.activeChatId 
          ? state.chats.map(c => c.id === state.activeChatId ? { ...c, messages: [] } : c)
          : state.chats
      })),

      createChat: () => {
        const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
        const newChat: ChatSession = {
          id: newId,
          title: 'New Chat',
          messages: [],
          createdAt: Date.now()
        };
        set((state) => ({
          chats: [newChat, ...state.chats],
          activeChatId: newId,
          messages: []
        }));
        return newId;
      },

      deleteChat: (id) => set((state) => {
        const newChats = state.chats.filter(c => c.id !== id);
        let newActiveId = state.activeChatId;
        let newMessages = state.messages;
        if (state.activeChatId === id) {
          newActiveId = newChats.length > 0 ? newChats[0].id : null;
          newMessages = newActiveId ? (newChats.find(c => c.id === newActiveId)?.messages || []) : [];
        }
        return {
          chats: newChats,
          activeChatId: newActiveId,
          messages: newMessages
        };
      }),

      setActiveChatId: (id) => set((state) => {
        const chat = state.chats.find(c => c.id === id);
        return {
          activeChatId: id,
          messages: chat ? chat.messages : []
        };
      }),

      updateChatTitle: (id, title) => set((state) => ({
        chats: state.chats.map(c => c.id === id ? { ...c, title } : c)
      })),

      hydrateChats: () => set((state) => {
        // If chats are empty but we have messages, migrate them
        if (state.chats.length === 0 && state.messages.length > 0) {
          const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
          const newChat: ChatSession = {
            id: newId,
            title: 'Imported Chat',
            messages: state.messages,
            createdAt: Date.now()
          };
          return {
            chats: [newChat],
            activeChatId: newId
          };
        }
        // If chats are completely empty, create an initial one
        if (state.chats.length === 0) {
          const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
          const newChat: ChatSession = {
            id: newId,
            title: 'New Chat',
            messages: [],
            createdAt: Date.now()
          };
          return {
            chats: [newChat],
            activeChatId: newId,
            messages: []
          };
        }
        // Fallback checks
        if (state.activeChatId && !state.chats.some(c => c.id === state.activeChatId)) {
          return {
            activeChatId: state.chats[0].id,
            messages: state.chats[0].messages
          };
        }
        if (!state.activeChatId && state.chats.length > 0) {
          return {
            activeChatId: state.chats[0].id,
            messages: state.chats[0].messages
          };
        }
        return {};
      }),
    }),
    {
      name: 'ai-workspace-storage',
    }
  )
);

