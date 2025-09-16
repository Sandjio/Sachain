import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useMintStocks } from "@/features/project/hook/useMintStocks";

interface MintingStepProps {
  projectId: string;
  walletAddress: string | null;
  onNext: () => void; // call on successful mint
  onBack: () => void;
  onError?: (error: string) => void; // optional error handler
}

export function MintingStep({ projectId, walletAddress, onNext, onBack, onError }: MintingStepProps) {
  const { triggerMint, loading, error, data } = useMintStocks(projectId);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  useEffect(() => {
    if (data) {
      onNext();
    }
  }, [data, onNext]);

  // Handle mint button click
  const handleMint = () => {
    if (!walletAddress) {
      onError?.("Wallet address is required to mint tokens.");
      return;
    }
    triggerMint(walletAddress).catch(() => {
      // error handled in hook and passed by props callback
    });
  };

  return (
    <>
      <h2 className="text-4xl font-extrabold mb-4">Minting Tokens</h2>
      <p className="text-gray-600 mb-8 leading-relaxed">
        Creating your project share tokens on the Hedera blockchain. This may take a few moments...
      </p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <Button onClick={handleMint} disabled={loading}>
        {loading ? "Minting..." : "Start Minting"}
      </Button>

      <Button variant="outline" onClick={onBack} className="mt-4" disabled={loading}>
        Cancel
      </Button>
    </>
  );
}
