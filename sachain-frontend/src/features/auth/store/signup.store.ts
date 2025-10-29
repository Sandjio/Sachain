// src/features/auth/store/signup.store.ts
import { create } from 'zustand';
import type { SignupPayload } from '../types/authTypes';

export interface SignupState {
  step: 1 | 2; // 1: form, 2: confirmation
  data: Partial<SignupPayload> & { code?: string };
  setStep: (step: 1 | 2) => void;
  updateData: (partial: Partial<SignupPayload> & { code?: string }) => void;
  reset: () => void;
}

export const useSignupStore = create<SignupState>((set) => ({
  step: 1,
  data: {},
  setStep: (step) => set({ step }),
  updateData: (partial) => set((s) => ({ data: { ...s.data, ...partial } })),
  reset: () => set({ step: 1, data: {} }),
}));
