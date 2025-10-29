import { useState, useEffect } from 'react';

export type WalletFlow = 'connect' | 'create';

export interface ConnectedAccount {
  accountId: string;
  balance: string;
  publicKey?: string;
  privateKey?: string;
}

const steps = [
  'Wallet detected',
  'Requesting connection...',
  'Verify account',
  'Complete setup',
];

export function useConnectWalletDialog(
  open: boolean,
  onOpenChange: (open: boolean) => void
) {
  const [state, setState] = useState<
    'selection' | 'connecting' | 'success' | 'error'
  >('selection');
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [flow, setFlow] = useState<WalletFlow>('connect');
  const [showManualConnect, setShowManualConnect] = useState(false);
  const [connectedAccount, setConnectedAccount] =
    useState<ConnectedAccount | null>(null);
  const [pendingConnectedAccount, setPendingConnectedAccount] =
    useState<ConnectedAccount | null>(null);

  // Reset modal state when closed
  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const reset = () => {
    setState('selection');
    setSelectedWallet(null);
    setCurrentStep(0);
    setFlow('connect');
    setShowManualConnect(false);
    setConnectedAccount(null);
    setPendingConnectedAccount(null);
    onOpenChange(false);
  };

  // Reset on flow change to 'create'
  useEffect(() => {
    if (flow === 'create') {
      setState('selection');
      setSelectedWallet(null);
      setShowManualConnect(false);
    }
  }, [flow]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state === 'connecting') {
      if (currentStep < steps.length) {
        timer = setTimeout(() => setCurrentStep((prev) => prev + 1), 1200);
      } else {
        timer = setTimeout(() => {
          setState('success');
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

  const handleAccountValidated = (accountId: string, balance: string) => {
    setPendingConnectedAccount({ accountId, balance });
    setShowManualConnect(false);
    setState('connecting');
  };

  const handleWalletCreated = (
    accountId: string,
    publicKey?: string,
    privateKey?: string
  ) => {
    // Create a connected account object with the new wallet details
    const newAccount: ConnectedAccount = {
      accountId,
      balance: '1.00', // Initial funding amount
      publicKey,
      privateKey,
    };

    // Set the connected account and mark as successful
    setConnectedAccount(newAccount);
    setSelectedWallet('Created Wallet');
    setState('success');

    // Don't change flow here - let the component handle that
  };

  const handleContinueFromCreate = () => {
    setFlow('connect');
    // Keep the success state and connected account to show in connect flow
  };

  const handleRetry = () => {
    setState('selection');
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
    setShowManualConnect: setShowManualConnect,
    handleConnect,
    handleAccountValidated,
    handleWalletCreated,
    handleContinueFromCreate,
    handleRetry,
    handleClose,
  };
}
