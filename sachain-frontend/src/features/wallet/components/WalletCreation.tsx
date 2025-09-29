// import React from "react";
// import { useWalletCreation } from "../hooks/useWalletCreation";

// interface WalletCreationProps {
//   onCreateSuccess: (accountId: string) => void;
// }

// export default function WalletCreation({ onCreateSuccess }: WalletCreationProps) {
//   const {
//     publicKey,
//     privateKey,
//     accountId,
//     isCreating,
//     error,
//     createWallet,
//   } = useWalletCreation();

//   React.useEffect(() => {
//     if (accountId) {
//       onCreateSuccess(accountId);
//     }
//   }, [accountId, onCreateSuccess]);

//   return (
//     <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow space-y-6">
//       <h2 className="text-2xl font-bold text-center">Create New Hedera Wallet</h2>

//       {accountId ? (
//         <div className="bg-green-100 p-4 rounded">
//           <p><strong>New Account ID:</strong> {accountId}</p>
//           <p><strong>Public Key:</strong> {publicKey}</p>
//           <p><strong>Private Key (SAVE THIS SECURELY):</strong></p>
//           <textarea
//             readOnly
//             className="w-full border p-2 rounded resize-none font-mono"
//             rows={4}
//             value={privateKey || ""}
//           />
//         </div>
//       ) : (
//         <button
//           onClick={createWallet}
//           disabled={isCreating}
//           className="w-full py-3 bg-[#123962] text-white rounded font-semibold disabled:opacity-50 transition"
//         >
//           {isCreating ? "Creating Wallet..." : "Create Wallet"}
//         </button>
//       )}

//       {error && <p className="text-red-600 mt-4 text-center">{error}</p>}
//     </div>
//   );
// }



// import React, { useEffect } from "react";
// import ConnectSteps from "./ConnectSteps"; // Your existing stepper component
// import { useWalletCreation } from "../hooks/useWalletCreation";

// interface WalletCreationProps {
//   onCreateSuccess: (accountId: string) => void;
// }

// export default function WalletCreation({ onCreateSuccess }: WalletCreationProps) {
//   const {
//     publicKey,
//     privateKey,
//     accountId,
//     currentStep,
//     state,
//     error,
//     createWallet,
//     creationSteps,
//   } = useWalletCreation();

//   // Notify parent once creation is successful
//   useEffect(() => {
//     if (state === "success" && accountId) {
//       onCreateSuccess(accountId);
//     }
//   }, [state, accountId, onCreateSuccess]);

//   if (state === "creating") {
//     return (
//       <div className="p-6 text-center">
//         <p className="mb-4 font-semibold text-lg">Creating your wallet...</p>
//         <ConnectSteps currentStep={currentStep} totalSteps={creationSteps.length} />
//       </div>
//     );
//   }

//   if (state === "success") {
//     return (
//       <div className="p-6 bg-green-100 rounded shadow space-y-4 text-center">
//         <h3 className="text-xl font-bold">Wallet Created Successfully!</h3>
//         <p><strong>Account ID:</strong> {accountId}</p>
//         <p><strong>Public Key:</strong> {publicKey}</p>
//         <p><strong>Private Key (SAVE THIS SECURELY):</strong></p>
//         <textarea
//           readOnly
//           className="w-full p-2 border rounded font-mono"
//           rows={4}
//           value={privateKey || ""}
//         />
//         <p className="text-sm text-red-600">
//           Keep your private key secure. It will not be shown again.
//         </p>
//       </div>
//     );
//   }

//   if (state === "error") {
//     return (
//       <div className="p-6 bg-red-100 rounded shadow text-center space-y-4">
//         <p className="text-red-700 font-semibold">Error creating wallet:</p>
//         <p>{error}</p>
//         <button
//           onClick={createWallet}
//           className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
//         >
//           Retry
//         </button>
//       </div>
//     );
//   }

//   // idle state with create button
//   return (
//     <div className="p-6 text-center">
//       <button
//         onClick={createWallet}
//         className="px-6 py-3 bg-[#123962] text-white rounded-lg font-semibold hover:bg-[#0f2b45] transition"
//       >
//         Create Wallet
//       </button>
//     </div>
//   );
// }






import React, { useEffect } from "react";
import ConnectSteps from "./ConnectSteps";
import { useWalletCreation } from "../hooks/useWalletCreation";

interface WalletCreationProps {
  onCreateSuccess: (accountId: string, publicKey?: string, privateKey?: string) => void;
  onClose?: () => void;
}

export default function WalletCreation({ onCreateSuccess, onClose }: WalletCreationProps) {
  const {
    publicKey,
    privateKey,
    accountId,
    currentStep,
    state,
    error,
    createWallet,
    creationSteps,
  } = useWalletCreation();

  // Notify parent once creation is successful, but don't auto-close
  useEffect(() => {
    if (state === "success" && accountId) {
      // Pass all the details to parent
      onCreateSuccess(accountId, publicKey || undefined, privateKey || undefined);
    }
  }, [state, accountId, publicKey, privateKey, onCreateSuccess]);

  if (state === "creating") {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
        <p className="mb-4 font-semibold text-lg">Creating your wallet...</p>
        <ConnectSteps currentStep={currentStep} />
        <div className="mt-4 text-sm text-gray-600">
          {creationSteps[Math.min(currentStep, creationSteps.length - 1)]}
        </div>
      </div>
    );
  }

  // Success state is now handled by the main dialog component
  if (state === "success") {
    return null; // Let the parent component handle the success state
  }

  if (state === "error") {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-700">Wallet Creation Failed</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={createWallet}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // Idle state - initial create button
  return (
    <div className="p-6 text-center space-y-4">
      <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold">Create New Hedera Wallet</h3>
      <p className="text-sm text-gray-600 mb-6">
        Generate a new Hedera account with 5 HBAR initial funding
      </p>
      <button
        onClick={createWallet}
        className="px-6 py-3 bg-[#123962] text-white rounded-lg font-semibold hover:bg-[#0f2b45] transition-colors"
      >
        Create Wallet
      </button>
    </div>
  );
}