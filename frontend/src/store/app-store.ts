import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from '@/lib/api-client';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  reactions?: 'like' | 'dislike' | null;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface ChatFolder {
  id: string;
  name: string;
  chatIds: string[];
}

interface AppState {
  provider: string;
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
  currentView: 'chat' | 'marketplace' | 'knowledge';
  
  // Phase 1 Features
  theme: 'light' | 'dark' | 'system';
  pinnedChats: string[];
  folders: ChatFolder[];
  
  // Inference Settings
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;

  // Infinite Customization - User Interface Preferences
  fontSize: number;
  chatLayout: 'centered' | 'wide';
  bubbleStyle: 'bubble' | 'flat' | 'classic';
  enterKeyBehavior: 'send' | 'newline';
  streamSpeed: number; // 1 to 10
  codeBlocksCollapsed: boolean;
  customCss: string;

  // Infinite Customization - Inference Settings overrides
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences: string[];
  contextLength: number;
  seed: number;

  // Infinite Customization - Audio Settings
  ttsEngine: 'browser' | 'openai' | 'elevenlabs';
  ttsVoiceId: string;
  ttsSpeed: number;
  ttsPitch: number;
  autoSpeak: boolean;
  sttLanguage: string;
  
  // Scoped input draft states per conversation
  drafts: Record<string, string>;
  setDraft: (chatId: string, text: string) => void;

  // Shortcuts settings map
  shortcuts: {
    commandPalette: string;
    newChat: string;
    toggleSidebar: string;
    focusInput: string;
    switchChats: string;
    closeOverlays: string;
  };

  // Canvas View State
  canvasOpen: boolean;
  activeCanvasFileId: string | null;
  setCanvasOpen: (open: boolean) => void;
  setActiveCanvasFileId: (id: string | null) => void;

  // Streaming State
  isStreaming: boolean;
  setIsStreaming: (isStreaming: boolean) => void;

  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  toggleSidebar: () => void;
  setGoogleApiKey: (key: string) => void;
  setOpenaiApiKey: (key: string) => void;
  setSearchProvider: (provider: 'tavily' | 'exa') => void;
  setTavilyApiKey: (key: string) => void;
  setExaApiKey: (key: string) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  clearMessages: () => void;
  setView: (view: 'chat' | 'marketplace' | 'knowledge') => void;
  
  // Theme Action
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Multiple Chats actions
  createChat: () => string;
  deleteChat: (id: string) => void;
  setActiveChatId: (id: string | null) => void;
  updateChatTitle: (id: string, title: string) => void;
  hydrateChats: () => void;

  // Pin / Folder actions
  togglePinChat: (id: string) => void;
  createFolder: (name: string) => string;
  deleteFolder: (folderId: string) => void;
  renameFolder: (folderId: string, name: string) => void;
  addChatToFolder: (folderId: string, chatId: string) => void;
  removeChatFromFolder: (folderId: string, chatId: string) => void;
  reorderChats: (chatIds: string[]) => void;

  activeKbIds: Record<string, string[]>;
  toggleChatKb: (chatId: string, kbId: string) => void;
  
  // Inference Actions
  setSystemPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setTopP: (val: number) => void;
  setMaxTokens: (val: number) => void;

  // Infinite Settings sync
  syncWithServer: () => Promise<void>;
  updateUserSettings: (newSettings: Partial<AppState>) => Promise<void>;
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
      currentView: 'chat',
      theme: 'dark',
      pinnedChats: [],
      folders: [],
      
      // Inference Settings Defaults
      systemPrompt: 'You are a helpful, precise, and sophisticated AI assistant. Format your answers beautifully in Markdown.',
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2048,

      // Infinite Customization - User Interface Defaults
      fontSize: 14,
      chatLayout: 'centered',
      bubbleStyle: 'bubble',
      enterKeyBehavior: 'send',
      streamSpeed: 5,
      codeBlocksCollapsed: false,
      customCss: '',

      // Infinite Customization - Inference Settings defaults
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      stopSequences: [],
      contextLength: 4096,
      seed: 0,

      // Infinite Customization - Audio Defaults
      ttsEngine: 'browser',
      ttsVoiceId: 'default',
      ttsSpeed: 1.0,
      ttsPitch: 1.0,
      autoSpeak: false,
      sttLanguage: 'en-US',
      
      drafts: {},

      // Shortcuts defaults
      shortcuts: {
        commandPalette: 'ctrl+k',
        newChat: 'ctrl+n',
        toggleSidebar: 'ctrl+shift+s',
        focusInput: 'ctrl+/',
        switchChats: 'alt+1-9',
        closeOverlays: 'esc',
      },

      // Canvas state defaults
      canvasOpen: false,
      activeCanvasFileId: null,
      setCanvasOpen: (open) => set({ canvasOpen: open }),
      setActiveCanvasFileId: (id) => set({ activeCanvasFileId: id }),

      // Streaming state defaults
      isStreaming: false,
      setIsStreaming: (isStreaming) => set({ isStreaming }),

      setProvider: (provider) => set({ provider }),
      setModel: (model) => set({ model }),
      setDraft: (chatId, text) => set((state) => ({ drafts: { ...state.drafts, [chatId]: text } })),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setGoogleApiKey: (key) => set({ googleApiKey: key }),
      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
      setSearchProvider: (provider) => set({ searchProvider: provider }),
      setTavilyApiKey: (key) => set({ tavilyApiKey: key }),
      setExaApiKey: (key) => set({ exaApiKey: key }),
      setView: (view) => set({ currentView: view }),
      
      setTheme: (theme) => set({ theme }),

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
          messages: newMessages,
          pinnedChats: state.pinnedChats.filter(chatId => chatId !== id),
          folders: state.folders.map(f => ({
            ...f,
            chatIds: f.chatIds.filter(chatId => chatId !== id)
          }))
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

      togglePinChat: (id) => set((state) => {
        const isPinned = state.pinnedChats.includes(id);
        const pinnedChats = isPinned
          ? state.pinnedChats.filter(chatId => chatId !== id)
          : [...state.pinnedChats, id];
        return { pinnedChats };
      }),

      createFolder: (name) => {
        const newFolderId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
        set((state) => ({
          folders: [...state.folders, { id: newFolderId, name, chatIds: [] }]
        }));
        return newFolderId;
      },

      deleteFolder: (folderId) => set((state) => ({
        folders: state.folders.filter(f => f.id !== folderId)
      })),

      renameFolder: (folderId, name) => set((state) => ({
        folders: state.folders.map(f => f.id === folderId ? { ...f, name } : f)
      })),

      addChatToFolder: (folderId, chatId) => set((state) => {
        const cleanFolders = state.folders.map(f => ({
          ...f,
          chatIds: f.chatIds.filter(id => id !== chatId)
        }));
        return {
          folders: cleanFolders.map(f => f.id === folderId ? { ...f, chatIds: [...f.chatIds, chatId] } : f)
        };
      }),

      removeChatFromFolder: (folderId, chatId) => set((state) => ({
        folders: state.folders.map(f => f.id === folderId ? { ...f, chatIds: f.chatIds.filter(id => id !== chatId) } : f)
      })),

      reorderChats: (chatIds) => set((state) => {
        const chatMap = new Map(state.chats.map(c => [c.id, c]));
        const reordered = chatIds.map(id => chatMap.get(id)).filter(Boolean) as ChatSession[];
        const remaining = state.chats.filter(c => !chatIds.includes(c.id));
        return {
          chats: [...reordered, ...remaining]
        };
      }),

      setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
      setTemperature: (temperature) => set({ temperature }),
      setTopP: (topP) => set({ topP }),
      setMaxTokens: (maxTokens) => set({ maxTokens }),
      
      activeKbIds: {},
      toggleChatKb: (chatId, kbId) => set((state) => {
        const current = state.activeKbIds[chatId] || [];
        const next = current.includes(kbId)
          ? current.filter(id => id !== kbId)
          : [...current, kbId];
        return {
          activeKbIds: {
            ...state.activeKbIds,
            [chatId]: next
          }
        };
      }),

      syncWithServer: async () => {
        try {
          const userSettings = await apiRequest<any>('/api/settings/user');
          if (userSettings) {
            set({
              fontSize: userSettings.fontSize ?? 14,
              chatLayout: userSettings.chatLayout ?? 'centered',
              bubbleStyle: userSettings.bubbleStyle ?? 'bubble',
              theme: userSettings.theme ?? 'dark',
              enterKeyBehavior: userSettings.enterKeyBehavior ?? 'send',
              streamSpeed: userSettings.streamSpeed ?? 5,
              codeBlocksCollapsed: userSettings.codeBlocksCollapsed ?? false,
              customCss: userSettings.customCss ?? '',
              
              // Inference settings mapping
              frequencyPenalty: userSettings.frequencyPenalty ?? 0.0,
              presencePenalty: userSettings.presencePenalty ?? 0.0,
              stopSequences: userSettings.stopSequences ?? [],
              contextLength: userSettings.contextLength ?? 4096,
              seed: userSettings.seed ?? 0,
              
              // Audio settings mapping
              ttsEngine: userSettings.ttsEngine ?? 'browser',
              ttsVoiceId: userSettings.ttsVoiceId ?? 'default',
              ttsSpeed: userSettings.ttsSpeed ?? 1.0,
              ttsPitch: userSettings.ttsPitch ?? 1.0,
              autoSpeak: userSettings.autoSpeak ?? false,
              sttLanguage: userSettings.sttLanguage ?? 'en-US',
              
              // Shortcuts mapping
              shortcuts: userSettings.shortcuts ?? {
                commandPalette: 'ctrl+k',
                newChat: 'ctrl+n',
                toggleSidebar: 'ctrl+shift+s',
                focusInput: 'ctrl+/',
                switchChats: 'alt+1-9',
                closeOverlays: 'esc',
              }
            });

            // Apply theme class to document element
            if (typeof window !== 'undefined') {
              const root = window.document.documentElement;
              const currentTheme = userSettings.theme ?? 'dark';
              if (currentTheme === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                root.classList.remove('light', 'dark');
                root.classList.add(systemTheme);
              } else {
                root.classList.remove('light', 'dark');
                root.classList.add(currentTheme);
              }
            }
          }
        } catch (err) {
          console.error("Failed to sync settings with server:", err);
        }
      },

      updateUserSettings: async (newSettings: any) => {
        set(newSettings);
        try {
          await apiRequest('/api/settings/user', {
            method: 'POST',
            body: JSON.stringify({ settings: newSettings })
          });
        } catch (err) {
          console.error("Failed to save user settings to server:", err);
        }
      },
    }),
    {
      name: 'ai-workspace-storage',
    }
  )
);
