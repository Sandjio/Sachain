import { useState, useEffect } from 'react';
import { Client, AccountBalanceQuery, AccountId } from '@hashgraph/sdk';

export function useHederaBalance(
  walletAddress: string | null,
  tokenId?: string
) {
  const [balance, setBalance] = useState<number | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBalance() {
      if (!walletAddress) {
        setBalance(null);
        setTokenBalance(null);
        setError('Wallet address is required');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const client = Client.forTestnet();
        const accountId = AccountId.fromString(walletAddress);

        const response = await new AccountBalanceQuery()
          .setAccountId(accountId)
          .execute(client);

        setBalance(Number(response.hbars.toTinybars()) / 1e8);

        if (tokenId && response.tokens) {
          const tokensMap = response.tokens._map; // Internal map of tokenId => balance
          const tokenBalanceRaw = tokensMap.get(tokenId);
          setTokenBalance(tokenBalanceRaw ? Number(tokenBalanceRaw) : 0);
        } else {
          setTokenBalance(null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch balance');
        setBalance(null);
        setTokenBalance(null);
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();
  }, [walletAddress, tokenId]);

  return { balance, tokenBalance, loading, error };
}
