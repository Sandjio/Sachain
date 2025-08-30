// import { create } from "zustand";
// import { AuthUser } from "@/features/auth/types/authTypes";
// import { CognitoTokens } from "@/features/auth/core/cognitoProvider";

// interface AuthState {
//   user: AuthUser | null;
//   tokens: CognitoTokens | null;
//   login: (user: AuthUser, tokens: CognitoTokens) => void;
//   logout: () => void;
// }

// export const useAuthStore = create<AuthState>((set) => ({
//   user: null,
//   tokens: null,
//   login: (user, tokens) => {
//     localStorage.setItem("auth_user", JSON.stringify(user));
//     localStorage.setItem("auth_tokens", JSON.stringify(tokens));
//     set({ user, tokens });
//   },
//   logout: () => {
//     localStorage.removeItem("auth_user");
//     localStorage.removeItem("auth_tokens");
//     set({ user: null, tokens: null });
//   },
// }));



// src/store/authStore.ts
import { create } from "zustand";
import type { AuthUser } from "@/features/auth/types/authTypes";

interface AuthState {
  user: AuthUser | null;
  tokens: any | null; // tokens from Cognito
  login: (user: AuthUser, tokens: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  login: (user, tokens) => set({ user, tokens }),
  logout: () => set({ user: null, tokens: null }),
}));
