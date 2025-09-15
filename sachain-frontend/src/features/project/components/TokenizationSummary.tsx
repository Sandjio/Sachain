import React from 'react';
import { Button } from '@/components/ui/button';

interface TokenizationSummaryProps {
  projectName: string;
  walletAddress: string;
  onConfirm: () => void;
  onBack: () => void;
}

const TokenizationSummary: React.FC<TokenizationSummaryProps> = ({
  projectName,
  walletAddress,
  onConfirm,
  onBack,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-lg mx-auto mt-6">
      <h2 className="text-xl font-semibold mb-4">Tokenization Summary</h2>
      <p className="mb-2">
        <strong>Project:</strong> {projectName}
      </p>
      <p className="mb-4">
        <strong>Wallet:</strong>{' '}
        <span className="font-mono text-gray-700">{walletAddress}</span>
      </p>
      <div className="flex gap-4">
        <Button
          onClick={onConfirm}
          className="flex-1 bg-[#123962] hover:bg-[#0f2f52] text-white"
        >
          Confirm Tokenization &amp; Go Live
        </Button>
        <Button onClick={onBack} variant="outline" className="flex-1">
          Back
        </Button>
      </div>
    </div>
  );
};

export default TokenizationSummary;
