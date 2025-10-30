

import { useState, useEffect } from 'react';

interface HederaBalanceResponse {
  hbarBalance: number | null;
}

export function useHederaBalance(
  walletAddress: string | null,
  refreshTrigger = 0
) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setBalance(null);
      setError('Wallet not connected');
      return;
    }

    setLoading(true);
    fetch(
      `/api/get-hedera-balance?walletAddress=${encodeURIComponent(walletAddress)}`
    )
      .then((res) => res.json())
      .then((data: HederaBalanceResponse & { error?: string }) => {
        if (data.error) {
          setError(data.error);
          setBalance(null);
        } else {
          setBalance(data.hbarBalance);
          setError(null);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch balance');
        setBalance(null);
      })
      .finally(() => setLoading(false));
  }, [walletAddress, refreshTrigger]);

  return { balance, loading, error };
}
