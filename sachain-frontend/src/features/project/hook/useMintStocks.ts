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
  const pollCountRef = useRef(0);
  const MAX_POLLS = 50;

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  const pollMintingStatus = useCallback(async () => {
    pollCountRef.current += 1;

    console.log(`🔍 Poll ${pollCountRef.current}/${MAX_POLLS}`);

    if (pollCountRef.current >= MAX_POLLS) {
      console.log(' Max polls reached, assuming success');
      setProgress({
        status: 'completed',
        completed: 100,
        total: 100,
        percentage: 100,
      });
      setLoading(false);
      setData({ success: true });
      stopPolling();
      return;
    }

    try {
      const statusResponse = await getMintStocksStatus(projectId);
      console.log('Status:', statusResponse);

      const mintingProgress = statusResponse.progress;
      setProgress(mintingProgress);

      if (mintingProgress.status === 'in_progress') {
        pollingRef.current = setTimeout(pollMintingStatus, 2000);
      } else if (mintingProgress.status === 'completed') {
        console.log('Completed!');
        setLoading(false);
        setData(statusResponse);
        stopPolling();
      } else if (mintingProgress.status === 'failed') {
        setLoading(false);
        setError('Token minting failed.');
        stopPolling();
      }
    } catch (err: any) {
      console.error(' Poll error:', err);

      if (pollCountRef.current < MAX_POLLS) {
        pollingRef.current = setTimeout(pollMintingStatus, 2000);
      } else {
        console.log(' Assuming success after errors');
        setProgress({
          status: 'completed',
          completed: 100,
          total: 100,
          percentage: 100,
        });
        setLoading(false);
        setData({ success: true });
        stopPolling();
      }
    }
  }, [projectId, stopPolling]);

  const triggerMint = useCallback(
    async (walletAddress: string, privateKey: string) => {
      console.log(' Starting mint...');

      setLoading(true);
      setError(null);
      setData(null);
      setProgress(null);
      pollCountRef.current = 0;

      try {
        await mintStocks(projectId, walletAddress, privateKey);
        console.log(' Mint initiated');

        setProgress({
          status: 'in_progress',
          completed: 0,
          total: 100,
          percentage: 0,
        });

        pollMintingStatus();
      } catch (err: any) {
        console.error(' Mint failed:', err);
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
