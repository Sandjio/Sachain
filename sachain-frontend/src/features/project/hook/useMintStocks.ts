

// import { useState } from "react";
// import { mintStocks } from "../core/api";

// export function useMintStocks(projectId: string) {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [data, setData] = useState<any>(null);

//   async function triggerMint(walletAddress: string, privateKey: string) {
//     setLoading(true);
//     setError(null);

//     try {
//       const response = await mintStocks(projectId, walletAddress, privateKey);
//       setData(response);
//       console.log("Minting response:", response);
//       return response;
//     } catch (err: any) {
//       setError(err.message || "Minting failed");
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   }

//   return { triggerMint, loading, error, data };
// }



import { useState, useCallback, useRef } from "react";
import { mintStocks, getMintStocksStatus } from "../core/api";
import { MintStocksStatusProgress, MintStocksStatus } from "../core/types";



export function useMintStocks(projectId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [progress, setProgress] = useState<MintStocksStatusProgress | null>(null);

  // Use ref to store polling interval ID for cleanup
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
        // Continue polling every 2 seconds
        pollingRef.current = setTimeout(pollMintingStatus, 2000);
      } else if (mintingProgress.status === 'completed') {
        // Minting completed successfully
        setLoading(false);
        setData(statusResponse);
        stopPolling();
      } else if (mintingProgress.status === 'failed') {
        // Minting failed
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

  const triggerMint = useCallback(async (walletAddress: string, privateKey: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    setProgress(null);

    try {
      // Start the minting process
      const mintResponse = await mintStocks(projectId, walletAddress, privateKey);
      console.log("Minting initiated:", mintResponse);
      
      // Start polling for status updates
      pollMintingStatus();
      
    } catch (err: any) {
      setError(err.message || "Minting failed to start");
      setLoading(false);
      throw err;
    }
  }, [projectId, pollMintingStatus]);

  // Cleanup function to stop polling when component unmounts
  const cleanup = useCallback(() => {
    stopPolling();
  }, [stopPolling]);

  return { 
    triggerMint, 
    loading, 
    error, 
    data, 
    progress,
    cleanup 
  };
}