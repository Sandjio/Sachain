// import React, { useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { useMintStocks } from "@/features/project/hook/useMintStocks";

// interface MintingStepProps {
//   projectId: string;
//   walletAddress: string | null;
//   privateKey: string | null;
//   onNext: () => void;
//   onBack: () => void;
//   onError?: (error: string) => void;
// }

// export function MintingStep({ projectId, walletAddress, privateKey, onNext, onBack, onError }: MintingStepProps) {
//   const { triggerMint, loading, error, data } = useMintStocks(projectId);

//   useEffect(() => {
//     if (error && onError) {
//       onError(error);
//     }
//   }, [error, onError]);

//   useEffect(() => {
//     if (data) {
//       onNext();
//     }
//   }, [data, onNext]);

//   const handleMint = () => {
//     if (!walletAddress) {
//       onError?.("Wallet address is required to mint tokens.");
//       return;
//     }

//     if (!privateKey) {
//       onError?.("Private key is required to mint tokens.");
//       return;
//     }

//     triggerMint(walletAddress, privateKey).catch(() => {
//       // error handled in hook and passed to onError
//     });
//   };

//   return (
//     <>
//       <h2 className="text-4xl font-extrabold mb-4">Minting Tokens</h2>
//       <p className="text-gray-600 mb-8 leading-relaxed">
//         Creating your project share tokens on the Hedera blockchain. This may take a few moments...
//       </p>

//       {error && <p className="text-red-600 mb-4">{error}</p>}

//       <Button onClick={handleMint} disabled={loading}>
//         {loading ? "Minting..." : "Start Minting"}
//       </Button>

//       <Button variant="outline" onClick={onBack} className="mt-4" disabled={loading}>
//         Cancel
//       </Button>
//     </>
//   );
// }


import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useMintStocks } from "@/features/project/hook/useMintStocks";

interface MintingStepProps {
  projectId: string;
  walletAddress: string | null;
  privateKey: string | null;
  onNext: () => void;
  onBack: () => void;
  onError?: (error: string) => void;
}

export function MintingStep({ projectId, walletAddress, privateKey, onNext, onBack, onError }: MintingStepProps) {
  const { triggerMint, loading, error, data, progress, cleanup } = useMintStocks(projectId);

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

  // Cleanup polling when component unmounts
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const handleMint = () => {
    if (!walletAddress) {
      onError?.("Wallet address is required to mint tokens.");
      return;
    }

    if (!privateKey) {
      onError?.("Private key is required to mint tokens.");
      return;
    }

    triggerMint(walletAddress, privateKey).catch(() => {
      // error handled in hook and passed to onError
    });
  };

  return (
    <>
      <h2 className="text-4xl font-extrabold mb-4">Minting Tokens</h2>
      <p className="text-gray-600 mb-8 leading-relaxed">
        Creating your project share tokens on the Hedera blockchain. This may take a few moments...
      </p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Progress Display */}
      {progress && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-blue-900">Minting Progress</h3>
            <span className="text-sm font-medium text-blue-700">
              {progress.completed}/{progress.total} tokens
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          
          {/* Progress Details */}
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">
              {progress.percentage}% complete
            </span>
            <span className="text-blue-600 font-medium">
              {progress.status === 'in_progress' ? 'Minting...' : 
               progress.status === 'completed' ? 'Completed!' : 
               progress.status === 'failed' ? 'Failed' : progress.status}
            </span>
          </div>
        </div>
      )}

      {/* Minting Status Message */}
      {loading && !progress && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800 text-sm">
            Initializing token minting process...
          </p>
        </div>
      )}

      {progress?.status === 'in_progress' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-800 text-sm">
            Creating tokens on Hedera blockchain. Please wait...
          </p>
        </div>
      )}

      <Button onClick={handleMint} disabled={loading}>
        {loading ? "Minting..." : "Start Minting"}
      </Button>

      <Button variant="outline" onClick={onBack} className="mt-4" disabled={loading}>
        Cancel
      </Button>
    </>
  );
}