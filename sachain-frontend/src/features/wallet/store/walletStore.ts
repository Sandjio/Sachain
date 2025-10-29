import { create } from 'zustand';

interface WalletState {
  walletAddress: string | null;
  isConnected: boolean;
  connectWallet: (address: string) => void;
  disconnectWallet: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  walletAddress: null,
  isConnected: false,
  connectWallet: (address: string) =>
    set({ walletAddress: address, isConnected: true }),
  disconnectWallet: () => set({ walletAddress: null, isConnected: false }),
}));
