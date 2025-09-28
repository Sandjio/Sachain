import { useState, useCallback, useRef } from 'react';
import { mintStocks, getMintStocksStatus } from '../core/api';
import { MintStocksStatusProgress, MintStocksStatus } from '../core/types';

export function useMintStocks(projectId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [progress, setProgress] = useState<MintStocksStatusProgress | null>(
    null
  );

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollMintingStatus = useCallback(async () => {
    try {
      const statusResponse = await getMintStocksStatus(projectId);
      const mintingProgress = statusResponse.progress;

      setProgress(mintingProgress);

      if (mintingProgress.status === 'in_progress') {
        pollingRef.current = setTimeout(pollMintingStatus, 2000);
      } else if (mintingProgress.status === 'completed') {
        setLoading(false);
        setData(statusResponse);
        stopPolling();
      } else if (mintingProgress.status === 'failed') {
        setLoading(false);
        setError('Token minting failed. Please try again.');
        stopPolling();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check minting status');
      setLoading(false);
      stopPolling();
    }
  }, [projectId, stopPolling]);

  const triggerMint = useCallback(
    async (walletAddress: string, privateKey: string) => {
      setLoading(true);
      setError(null);
      setData(null);
      setProgress(null);

      try {
        const mintResponse = await mintStocks(
          projectId,
          walletAddress,
          privateKey
        );
        console.log('Minting initiated:', mintResponse);

        pollMintingStatus();
      } catch (err: any) {
        setError(err.message || 'Minting failed to start');
        setLoading(false);
        throw err;
      }
    },
    [projectId, pollMintingStatus]
  );

  const cleanup = useCallback(() => {
    stopPolling();
  }, [stopPolling]);

  return {
    triggerMint,
    loading,
    error,
    data,
    progress,
    cleanup,
  };
}
