import { useState, useEffect } from "react";
import {
  Client,
  AccountBalanceQuery,
  TokenMintTransaction,
  TokenId,
  AccountId,
  Hbar,
} from "@hashgraph/sdk";

export function useHederaVerification(walletAddress: string, tokenId: string, mintAmount: number) {
  const [requiredFee, setRequiredFee] = useState<number | null>(null);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [canMint, setCanMint] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      setLoading(true);
      setError(null);
      try {
        const client = Client.forTestnet(); // Change to forMainnet() if needed
        const accountId = AccountId.fromString(walletAddress);

        // 1. Get user hbar balance
        const balance = await new AccountBalanceQuery()
          .setAccountId(accountId)
          .execute(client);
        const hbarBalance = Number(balance.hbars.toTinybars()) / 1e8;

        // 2. Estimate mint fee (simulate)
        const defaultMaxFee = new Hbar(0.2); // 0.2 HBAR as a static estimate
        const tokenMintTx = new TokenMintTransaction()
          .setTokenId(TokenId.fromString(tokenId))
          .setAmount(mintAmount)
          .setMaxTransactionFee(defaultMaxFee);

        // Hedera SDK does not provide getCost for TokenMintTransaction, use static estimate
        const feeTinybars = defaultMaxFee.toTinybars();
        const feeHbar = Number(feeTinybars) / 1e8;

        setUserBalance(hbarBalance);
        setRequiredFee(feeHbar);
        setCanMint(hbarBalance >= feeHbar);
      } catch (err: any) {
        setError(err.message || "Verification failed");
      }
      setLoading(false);
    }
    verify();
  }, [walletAddress, tokenId, mintAmount]);

  return { requiredFee, userBalance, canMint, loading, error };
}
