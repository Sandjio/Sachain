import { useState } from "react";
import { mintStocks } from "../core/api";


export function useMintStocks(projectId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  async function triggerMint(walletAddress: string) {
    setLoading(true);
    setError(null);

    try {
  const response = await mintStocks(projectId, walletAddress);
  setData(response); // set the full response object
  console.log("Minting response:", response);
  return response;
    } catch (err: any) {
      setError(err.message || "Minting failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { triggerMint, loading, error, data };
}
