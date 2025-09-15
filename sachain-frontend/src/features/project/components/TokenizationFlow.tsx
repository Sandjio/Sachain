import React, { useState } from 'react';
import { useWalletStore } from '@/features/wallet/store/walletStore';
import ConnectWalletDialog from '@/features/wallet/components/ConnectWalletDialog';
import TokenizationSummary from './TokenizationSummary'; // Import your summary UI component

interface TokenizationFlowProps {
  project: {
    projectId: string;  // use projectId, not id
    name: string;
    // other fields if needed
  };

}

const TokenizationFlow: React.FC<TokenizationFlowProps> = ({ project }) => {
  const walletAddress = useWalletStore((state) => state.walletAddress);
  const isConnected = useWalletStore((state) => state.isConnected);

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [step, setStep] = useState<'idle' | 'summary' | 'minting'>('idle');

  // Called when user clicks "Tokenize & Go Live"
  const startTokenization = () => {
    if (isConnected && walletAddress) {
      setStep('summary');
    } else {
      setWalletModalOpen(true);
    }
  };

  // Called after wallet connection or creation is confirmed
  const onWalletConfirmed = () => {
    setWalletModalOpen(false);
    setStep('summary');
  };

  // Called when user confirms tokenization summary
  const onConfirmTokenization = () => {
    setStep('minting');
    // TODO: Implement minting call and state handling here
  };

  // Back to wallet connection screen
  const onBackToWallet = () => {
    setStep('idle');
    setWalletModalOpen(true);
  };

  return (
    <div>
      {step === 'idle' && (
        <button onClick={startTokenization} className="btn btn-primary">
          Tokenize & Go Live
        </button>
      )}

      <ConnectWalletDialog
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
        onWalletConfirmed={onWalletConfirmed}
      />

      {step === 'summary' && walletAddress && (
        <TokenizationSummary
          projectName={project.name}
          walletAddress={walletAddress}
          onBack={onBackToWallet}
          onConfirm={onConfirmTokenization}
        />
      )}

      {step === 'minting' && (
        <div>
          <p>Minting in progress... (To be implemented)</p>
        </div>
      )}
    </div>
  );
};

export default TokenizationFlow;
