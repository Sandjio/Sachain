import React from "react";
import { Button } from "@/components/ui/button";
import { useHederaBalance } from "@/features/project/hook/useHederaVerification";


interface VerificationStepProps {
  walletAddress: string;
  requiredFeeHbar: number;
  onProceed: () => void;
  onRecharge: () => void;
  onCancel: () => void;
}

export function VerificationStep({
  walletAddress,
  requiredFeeHbar,
  onProceed,
  onRecharge,
  onCancel,
}: VerificationStepProps) {
  const { balance, loading, error } = useHederaBalance(walletAddress);
  const canMint = balance !== null && balance >= requiredFeeHbar;

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center space-y-4">
      <h2 className="text-2xl font-semibold">Verify Your Wallet</h2>

      {loading && <p>Checking your HBAR balance...</p>}

      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && balance !== null && (
        <>
          <p>
            Required Minting Fee: <strong>{requiredFeeHbar} HBAR</strong>
          </p>
          <p>
            Your Wallet Balance: <strong>{balance.toFixed(6)} HBAR</strong>
          </p>

          {canMint ? (
            <p className="text-green-600 font-semibold">You have sufficient balance to mint tokens.</p>
          ) : (
            <p className="text-red-600 font-semibold">Insufficient balance. Please recharge to continue.</p>
          )}

          <div className="flex flex-col gap-3">
            <Button onClick={onProceed} disabled={!canMint}>
              Proceed to Mint
            </Button>
            {!canMint && (
              <Button variant="outline" onClick={onRecharge}>
                Recharge Wallet
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
