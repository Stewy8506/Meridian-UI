import { create } from 'zustand';
import { apiRequest } from '@/lib/api-client';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  is_guest?: boolean;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthEnabled: boolean;
  isLoading: boolean;
  initialized: boolean;

  checkAuthStatus: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (username?: string, avatarUrl?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen for unauthorized 401 events from api-client to log out automatically
  if (typeof window !== "undefined") {
    window.addEventListener("auth-unauthorized", () => {
      set({ user: null, token: null, isAuthenticated: false });
    });
  }

  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isAuthEnabled: false,
    isLoading: true,
    initialized: false,

    checkAuthStatus: async () => {
      set({ isLoading: true });
      try {
        const { auth_enabled } = await apiRequest<{ auth_enabled: boolean }>("/api/auth/status");
        
        let token = null;
        if (typeof window !== "undefined") {
          token = localStorage.getItem("auth-token");
        }

        set({ isAuthEnabled: auth_enabled });

        if (!auth_enabled) {
          // If auth is disabled, automatically log in as guest
          set({
            user: { id: "default_user", email: "guest@workspace.local", username: "Guest", is_guest: true },
            token: "not-needed",
            isAuthenticated: true,
            isLoading: false,
            initialized: true
          });
          return;
        }

        if (token) {
          // Validate token by fetching profile info
          const userProfile = await apiRequest<UserProfile>("/api/auth/me", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          set({
            user: userProfile,
            token,
            isAuthenticated: true,
            isLoading: false,
            initialized: true
          });
        } else {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            initialized: true
          });
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          initialized: true
        });
      }
    },

    login: async (email, password) => {
      set({ isLoading: true });
      try {
        const response = await apiRequest<{ access_token: string; token_type: string; user: UserProfile }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password })
        });
        
        if (typeof window !== "undefined" && response.access_token !== "not-needed") {
          localStorage.setItem("auth-token", response.access_token);
        }

        set({
          token: response.access_token,
          user: response.user,
          isAuthenticated: true,
          isLoading: false
        });
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    signup: async (email, username, password) => {
      set({ isLoading: true });
      try {
        const response = await apiRequest<{ access_token: string; token_type: string; user: UserProfile }>("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ email, username, password })
        });

        if (typeof window !== "undefined" && response.access_token !== "not-needed") {
          localStorage.setItem("auth-token", response.access_token);
        }

        set({
          token: response.access_token,
          user: response.user,
          isAuthenticated: true,
          isLoading: false
        });
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    logout: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth-token");
      }
      set({
        user: null,
        token: null,
        isAuthenticated: false
      });
    },

    updateProfile: async (username, avatarUrl) => {
      try {
        const response = await apiRequest<UserProfile>("/api/auth/me", {
          method: "PUT",
          body: JSON.stringify({ username, avatar_url: avatarUrl })
        });
        set({ user: response });
      } catch (error) {
        console.error("Failed to update profile:", error);
        throw error;
      }
    }
  };
});
