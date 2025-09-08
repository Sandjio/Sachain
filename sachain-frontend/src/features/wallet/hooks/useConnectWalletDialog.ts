
import { useState, useEffect } from "react";

export type WalletFlow = "connect" | "create";

export interface ConnectedAccount {
  accountId: string;
  balance: string;
}

const steps = [
  "Wallet detected",
  "Requesting connection...",
  "Verify account",
  "Complete setup",
];

export function useConnectWalletDialog(open: boolean, onOpenChange: (open: boolean) => void) {
  const [state, setState] = useState<"selection" | "connecting" | "success" | "error">("selection");
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [flow, setFlow] = useState<WalletFlow>("connect");
  const [showManualConnect, setShowManualConnect] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccount | null>(null);
  const [pendingConnectedAccount, setPendingConnectedAccount] = useState<ConnectedAccount | null>(null);

  // Reset modal state when closed
  useEffect(() => {
    if (!open) reset();
  }, [open]);

  // Reset helper
  const reset = () => {
    setState("selection");
    setSelectedWallet(null);
    setCurrentStep(0);
    setFlow("connect");
    setShowManualConnect(false);
    setConnectedAccount(null);
    setPendingConnectedAccount(null);
    onOpenChange(false);
  };

  // Reset on flow change to 'create'
  useEffect(() => {
    if (flow === "create") {
      setState("selection");
      setSelectedWallet(null);
      setShowManualConnect(false);
    }
  }, [flow]);

  // Step progression and finalization of connection verification
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state === "connecting") {
      if (currentStep < steps.length) {
        timer = setTimeout(() => setCurrentStep((prev) => prev + 1), 1200);
      } else {
        timer = setTimeout(() => {
          setState("success");
          if (pendingConnectedAccount) {
            setConnectedAccount(pendingConnectedAccount);
            setPendingConnectedAccount(null);
          }
          setCurrentStep(0);
        }, 1000);
      }
      return () => clearTimeout(timer);
    }
  }, [state, currentStep, pendingConnectedAccount]);

  // When user clicks Wallet Option card
  const handleConnect = (walletType: string) => {
    setSelectedWallet(walletType);
    setShowManualConnect(true);
  };

  // When ManualWalletConnect validates account and balance successfully
  const handleAccountValidated = (accountId: string, balance: string) => {
    setPendingConnectedAccount({ accountId, balance });
    setShowManualConnect(false);
    setState("connecting");
  };

  const handleWalletCreated = (publicKey: string) => {
    setFlow("connect");
    setSelectedWallet(publicKey);
    setState("success");
  };

  const handleRetry = () => {
    setState("selection");
    setSelectedWallet(null);
    setShowManualConnect(false);
  };

  const handleClose = () => {
    reset();
  };

  return {
    state,
    selectedWallet,
    currentStep,
    flow,
    showManualConnect,
    connectedAccount,
    setFlow,
    handleConnect,
    handleAccountValidated,
    handleWalletCreated,
    handleRetry,
    handleClose,
  };
}
