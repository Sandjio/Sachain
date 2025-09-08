import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import WalletOption from './WalletOption';
import { Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import ConnectSteps from './ConnectSteps';
import SuccessState from './SuccessState';
import ErrorState from './ErrorState';
import WalletCreation from "./WalletCreation";

interface ConnectWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WalletFlow = "connect" | "create";

export default function ConnectWalletDialog({
  open,
  onOpenChange,
}: ConnectWalletDialogProps) {
  const [state, setState] = useState<
    'selection' | 'connecting' | 'success' | 'error'
  >('selection');
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [flow, setFlow] = useState<WalletFlow>("connect");

  // Reset state when switching to 'create' flow
  useEffect(() => {
    if (flow === "create") {
      setState('selection');
      setSelectedWallet(null);
    }
  }, [flow]);

  // Handler for wallet creation success
  const handleWalletCreated = (publicKey: string) => {
    setFlow("connect");
    setSelectedWallet(publicKey);
    setState("success");
  };

  // Reset modal state when closed
  useEffect(() => {
    if (!open) {
      setState('selection');
      setSelectedWallet(null);
      setFlow("connect");
    }
  }, [open]);

  useEffect(() => {
    let stepTimer: NodeJS.Timeout;
    if (state === 'connecting') {
      if (currentStep < 4) {
        stepTimer = setTimeout(() => {
          setCurrentStep((prev) => prev + 1);
        }, 1500);
      } else {
        const resultTimer = setTimeout(() => {
          if (Math.random() > 0.5) {
            setState('success');
          } else {
            setState('error');
          }
          setCurrentStep(0);
        }, 1000);
        return () => clearTimeout(resultTimer);
      }
    }
    return () => clearTimeout(stepTimer);
  }, [state, currentStep]);

  const handleConnect = (walletType: string) => {
    setSelectedWallet(walletType);
    setState('connecting');
    setCurrentStep(1);
  };

  const handleRetry = () => {
    setState('selection');
    setSelectedWallet(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setState('selection');
    setSelectedWallet(null);
    setFlow("connect");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg rounded-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="font-extrabold text-2xl">
            Connect Your Wallet
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-sm">
            {flow === "connect" && state === 'selection' && 'Please if you are new to Sachain, create a wallet first'}
            {flow === "connect" && state === 'connecting' && `Connecting to ${selectedWallet}`}
            {flow === "connect" && state === 'success' && 'Wallet Connected!'}
            {flow === "connect" && state === 'error' && 'Connection Failed'}
            {flow === "create" && 'Create a new Hedera wallet'}
          </DialogDescription>
        </DialogHeader>

        {/* Toggle buttons to switch flow */}
        <div className="flex justify-center gap-4 py-4">
          
          <button
            className={`px-4 py-2 rounded ${flow === "create" ? "bg-gray-200" : "bg-[#123962] text-white"}`}
            onClick={() => setFlow("create")}
          >
            Create Wallet
          </button>
        </div>

        {/* Render UI based on state and flow */}
        {flow === "connect" && state === 'selection' && (
          <div className="p-6 space-y-4">
            <WalletOption
              icon={<span>🌿</span>}
              name="Hedera Wallet"
              description="Native Hedera HBAR wallet for fast transactions"
              status="available"
              recommended
              onClick={() => handleConnect('Hedera')}
            />
          </div>
        )}

        {flow === "connect" && state === 'connecting' && (
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-6"></div>
            <p className="mb-4">
              Please check your wallet and approve the connection
            </p>
            <ConnectSteps currentStep={currentStep} />
            <button className="btn mt-4" onClick={handleClose}>
              Cancel
            </button>
          </div>
        )}

        {flow === "connect" && state === 'success' && (
          <SuccessState walletName={selectedWallet} onContinue={handleClose} />
        )}

        {flow === "connect" && state === 'error' && (
          <ErrorState onRetry={handleRetry} onClose={handleClose} />
        )}

        {flow === "create" && (
          <WalletCreation onCreateSuccess={handleWalletCreated} />
        )}
      </DialogContent>
    </Dialog>
  );
}
