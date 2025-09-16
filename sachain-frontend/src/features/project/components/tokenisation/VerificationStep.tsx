import React from "react";
import { Button } from "@/components/ui/button";
import { useHederaVerification } from "../../hook/useHederaVerification";

interface VerificationStepProps {
  walletAddress: string;
  tokenId: string;
  mintAmount: number;
  onProceed: () => void;
  onRecharge: () => void;
  onCancel: () => void;
}

export function VerificationStep({
  walletAddress,
  tokenId,
  mintAmount,
  onProceed,
  onRecharge,
  onCancel,
}: VerificationStepProps) {
  const { requiredFee, userBalance, canMint, loading, error } = useHederaVerification(
    walletAddress,
    tokenId,
    mintAmount,
  );

  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <h2 className="text-3xl font-bold mb-6">Verify Minting Fees & Balance</h2>

      {loading && <p>Checking wallet balance and estimating fees...</p>}

      {error && <p className="text-red-600 mb-4">Error: {error}</p>}

      {!loading && !error && (
        <>
          <p className="mb-2">
            Required Minting Fee: <strong>{requiredFee?.toFixed(6)} HBAR</strong>
          </p>
          <p className="mb-6">
            Your Wallet Balance: <strong>{userBalance?.toFixed(6)} HBAR</strong>
          </p>

          {canMint ? (
            <p className="text-green-600 font-semibold mb-6">
              Your balance is sufficient to mint tokens.
            </p>
          ) : (
            <p className="text-red-600 font-semibold mb-6">
              Insufficient balance. Please recharge to proceed.
            </p>
          )}

          <div className="flex flex-col gap-4">
            <Button onClick={onProceed} disabled={!canMint}>
              Proceed to Mint
            </Button>
            {!canMint && (
              <Button variant="outline" onClick={onRecharge}>
                Recharge Account
              </Button>
            )}
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
