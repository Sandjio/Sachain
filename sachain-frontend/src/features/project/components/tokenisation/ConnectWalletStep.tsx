// import React from "react";
// import { Button } from "@/components/ui/button";

// interface ConnectWalletStepProps {
//   onNext: () => void;
//   onBack: () => void;
// }

// export function ConnectWalletStep({ onNext, onBack }: ConnectWalletStepProps) {
//   return (
//     <>
//       <h2 className="text-4xl font-extrabold mb-4">Connect Your Wallet</h2>
//       <p className="text-gray-600 mb-8 leading-relaxed">
//         Connect your wallet to deploy and manage your project tokens on the Hedera network.
//       </p>
//       <Button onClick={onNext}>Simulate Wallet Connected</Button>
//       <Button variant="outline" onClick={onBack} className="mt-4">
//         Cancel
//       </Button>
//     </>
//   );
// }

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ConnectWalletDialog from '@/features/wallet/components/ConnectWalletDialog';
import { useWalletStore } from '@/features/wallet/store/walletStore';

interface ConnectWalletStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function ConnectWalletStep({ onNext, onBack }: ConnectWalletStepProps) {
  const walletAddress = useWalletStore((state) => state.walletAddress);
  const isConnected = useWalletStore((state) => state.isConnected);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const onWalletConfirmed = () => {
    setWalletModalOpen(false);
    onNext();
  };

  return (
    <>
      {!isConnected ? (
        <div>
          <span className="mb-4">Please connect or create your wallet to proceed.</span>
          <Button onClick={() => setWalletModalOpen(true)} className="mb-4">
            Connect / Create Wallet
          </Button>
          <ConnectWalletDialog
            open={walletModalOpen}
            onOpenChange={setWalletModalOpen}
            onWalletConfirmed={onWalletConfirmed}
          />
        </div>
      ) : (
        <>
          <p className="mb-4">
            Wallet connected: <span className="font-mono">{walletAddress}</span>
          </p>
          <Button onClick={onNext} className="mb-4">
            Continue to Minting
          </Button>
        </>
      )}
      <Button variant="outline" onClick={onBack}>
        Cancel
      </Button>
    </>
  );
}
