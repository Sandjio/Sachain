import { create } from "zustand";
import type { AuthUser } from "@/features/auth/types/authTypes";
import type { CognitoTokens } from "@/features/auth/core/cognitoProvider";

interface AuthState {
  user: AuthUser | null;
  tokens: CognitoTokens | null;
  isHydrated: boolean;
  login: (user: AuthUser, tokens: CognitoTokens) => void;
  logout: () => void;
  hydrate: () => void;
  setRole: (role: "startup" | "investor") => void;
  setUser: (userData: Partial<AuthUser>) => void; // partial update and persist user  
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isHydrated: false,

  login: (user, tokens) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_user", JSON.stringify(user));
      localStorage.setItem("auth_tokens", JSON.stringify(tokens));
    }
    set({ user, tokens });
    console.log("User logged in:", user);
    console.log("Tokens stored:", tokens);
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_tokens");
    }
    set({ user: null, tokens: null });
    console.log("User logged out, cleared localStorage and store");
  },

  setRole: (role) => {
    set((state) => {
      if (role !== "startup" && role !== "investor") return {};

      let updatedUser: AuthUser;

      if (state.user) {
        updatedUser = { ...state.user, role };
      } else {
        // Create a new user with blank email but set role
        updatedUser = { email: "", role };
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("auth_user", JSON.stringify(updatedUser));
      }

      return { user: updatedUser };
    });
  },

  setUser: (userData) => {
    set((state) => {
      if (!state.user) return {};
      const updatedUser: AuthUser = { ...state.user, ...userData };
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_user", JSON.stringify(updatedUser));
      }
      return { user: updatedUser };
    });
  },

  hydrate: () => {
    if (typeof window === "undefined") return;

    try {
      const storedUser = localStorage.getItem("auth_user");
      const storedTokens = localStorage.getItem("auth_tokens");

      console.group("Hydrating auth store from localStorage");
      console.log("Raw stored user:", storedUser);
      console.log("Raw stored tokens:", storedTokens);

      const user = storedUser ? JSON.parse(storedUser) : null;
      const tokens = storedTokens ? JSON.parse(storedTokens) : null;

      console.log("Parsed stored user:", user);
      console.log("Parsed stored tokens:", tokens);

      if (user && tokens) {
        set({ user, tokens, isHydrated: true });
        console.log("Store hydrated with user and tokens");
      } else if (user) {
        set({ user, tokens: null, isHydrated: true });
        console.log("Store hydrated with user (no tokens found)");
      } else {
        set({ isHydrated: true });
        console.log("Store hydrated but no user or tokens found");
      }
      console.groupEnd();
    } catch (error) {
      console.error("Failed to hydrate auth store:", error);
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_tokens");
      set({ isHydrated: true });
    }
  },
}));
