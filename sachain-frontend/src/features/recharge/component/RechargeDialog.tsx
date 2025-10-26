// RechargeDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RechargeForm } from './RechargeForm';
import { useWalletStore } from '@/features/wallet/store/walletStore';

interface RechargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RechargeDialog({ open, onOpenChange }: RechargeDialogProps) {
  const walletAddress = useWalletStore((state) => state.walletAddress);

  const handleSuccess = () => {
    console.log('Recharge successful!');
    onOpenChange(false);
    // Optionally show a success toast/notification
  };

  const handleError = (msg: string) => {
    console.error('Recharge error:', msg);
    // Optionally show an error toast/notification
  };

  if (!walletAddress) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wallet Not Connected</DialogTitle>
            <DialogDescription>
              Please connect your wallet before recharging.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Recharge Wallet</DialogTitle>
          <DialogDescription>
            Add HBAR to your wallet via Orange Money
          </DialogDescription>
        </DialogHeader>
        <RechargeForm
          walletAddress={walletAddress}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </DialogContent>
    </Dialog>
  );
}
