// import React from 'react';
// import { downloadWalletDetails } from '@/utils/downloadWalletDetails';

// interface SuccessStateProps {
//   walletName: string;
//   walletDetails: {
//     accountId: string;
//     balance: string;
//     publicKey?: string;
//     privateKey?: string;
//   };
//   onContinue: () => void;
//   showCreatedWalletDetails?: boolean;
// }

// export default function SuccessState({
//   walletName,
//   walletDetails,
//   onContinue,
//   showCreatedWalletDetails = false,
// }: SuccessStateProps) {
//   if (
//     showCreatedWalletDetails &&
//     walletDetails.publicKey &&
//     walletDetails.privateKey
//   ) {
//     // Show detailed view for newly created wallets
//     return (
//       <div className="p-6 space-y-4">
//         {/* Success header */}
//         <div className="text-center mb-6">
//           <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
//             <svg
//               className="w-8 h-8 text-green-600"
//               fill="none"
//               stroke="currentColor"
//               viewBox="0 0 24 24"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M5 13l4 4L19 7"
//               />
//             </svg>
//           </div>
//           <h3 className="text-xl font-bold text-green-700">
//             Wallet Created Successfully! 🎉
//           </h3>
//           <p className="text-sm text-gray-600 mt-2">
//             Your Hedera account has been created and funded with{' '}
//             {walletDetails.balance} HBAR
//           </p>
//         </div>

//         {/* Account details */}
//         <div className="bg-gray-50 rounded-lg p-4 space-y-3">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Account ID
//             </label>
//             <div className="flex items-center gap-2">
//               <code className="flex-1 p-2 bg-white border rounded text-sm font-mono">
//                 {walletDetails.accountId}
//               </code>
//               <button
//                 onClick={() =>
//                   navigator.clipboard.writeText(walletDetails.accountId)
//                 }
//                 className="p-2 text-gray-500 hover:text-gray-700"
//                 title="Copy Account ID"
//               >
//                 📋
//               </button>
//             </div>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Public Key
//             </label>
//             <div className="flex items-center gap-2">
//               <code className="flex-1 p-2 bg-white border rounded text-sm font-mono break-all text-xs">
//                 {walletDetails.publicKey}
//               </code>
//               <button
//                 onClick={() =>
//                   navigator.clipboard.writeText(walletDetails.publicKey || '')
//                 }
//                 className="p-2 text-gray-500 hover:text-gray-700"
//                 title="Copy Public Key"
//               >
//                 📋
//               </button>
//             </div>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-red-700 mb-1">
//               Private Key (Save this securely! ⚠️)
//             </label>
//             <div className="flex items-center gap-2">
//               <textarea
//                 readOnly
//                 className="flex-1 p-2 bg-white border rounded font-mono text-xs resize-none"
//                 rows={3}
//                 value={walletDetails.privateKey}
//               />
//               <button
//                 onClick={() =>
//                   navigator.clipboard.writeText(walletDetails.privateKey || '')
//                 }
//                 className="p-2 text-gray-500 hover:text-gray-700"
//                 title="Copy Private Key"
//               >
//                 📋
//               </button>
//             </div>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Balance
//             </label>
//             <div className="p-2 bg-white border rounded text-sm font-semibold text-green-600">
//               {walletDetails.balance} HBAR
//             </div>
//           </div>
//         </div>

//         {/* Warning */}
//         <div className="bg-red-50 border border-red-200 rounded-lg p-3">
//           <p className="text-sm text-red-700 font-medium">
//             ⚠️ Important Security Notice
//           </p>
//           <p className="text-xs text-red-600 mt-1">
//             Your private key is the only way to access your wallet. Store it
//             securely and never share it with anyone. If you lose it, you'll lose
//             access to your funds permanently.
//           </p>
//         </div>

//         {/* Action buttons */}
//         <div className="flex gap-3 pt-4">
//           <button
//             onClick={() => downloadWalletDetails(walletDetails)}
//             className="btn-download"
//           >
//             💾 Download Wallet Details
//           </button>

//           <button onClick={onContinue} className="btn-continue">
//             Continue
//           </button>

//           <button
//             onClick={onContinue}
//             className="flex-1 px-4 py-2 bg-[#123962] text-white rounded-lg hover:bg-[#0f2b45] transition-colors text-sm"
//           >
//             Continue
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // Standard success view for regular wallet connections
//   return (
//     <div className="p-6 text-center space-y-4">
//       <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
//         <svg
//           className="w-8 h-8 text-green-600"
//           fill="none"
//           stroke="currentColor"
//           viewBox="0 0 24 24"
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={2}
//             d="M5 13l4 4L19 7"
//           />
//         </svg>
//       </div>

//       <h3 className="text-xl font-bold text-green-700">
//         Successfully Connected!
//       </h3>
//       <p className="text-gray-600">Your {walletName} wallet is now connected</p>

//       <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-left">
//         <div className="flex justify-between">
//           <span className="text-sm text-gray-600">Account ID:</span>
//           <code className="text-sm font-mono">{walletDetails.accountId}</code>
//         </div>
//         <div className="flex justify-between">
//           <span className="text-sm text-gray-600">Balance:</span>
//           <span className="text-sm font-semibold text-green-600">
//             {walletDetails.balance} HBAR
//           </span>
//         </div>
//       </div>

//       <button
//         onClick={onContinue}
//         className="w-full px-4 py-2 bg-[#123962] text-white rounded-lg hover:bg-[#0f2b45] transition-colors"
//       >
//         Continue
//       </button>
//     </div>
//   );
// }




import React from "react";
import { Check, Clipboard } from "lucide-react"; 
import { Button } from "@/components/ui/button"; 
import { downloadWalletDetails } from "@/utils/downloadWalletDetails";

interface SuccessStateProps {
  walletName: string;
  walletDetails: {
    accountId: string;
    balance: string;
    publicKey?: string;
    privateKey?: string;
  };
  onContinue: () => void;
  showCreatedWalletDetails?: boolean;
}

export default function SuccessState({
  walletName,
  walletDetails,
  onContinue,
  showCreatedWalletDetails = false,
}: SuccessStateProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (
    showCreatedWalletDetails &&
    walletDetails.publicKey &&
    walletDetails.privateKey
  ) {
    // Show detailed view for newly created wallets
    return (
      <div className="p-6 space-y-4">
        {/* Success header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-green-700">
            Wallet Created Successfully! 🎉
          </h3>
          <p className="text-sm text-gray-600 mt-2">
            Your Hedera account has been created and funded with{" "}
            {walletDetails.balance} HBAR
          </p>
        </div>

        {/* Account details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account ID
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-white border rounded text-sm font-mono">
                {walletDetails.accountId}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(walletDetails.accountId)}
                title="Copy Account ID"
                aria-label="Copy Account ID"
              >
                <Clipboard className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Public Key
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-white border rounded text-sm font-mono break-all text-xs">
                {walletDetails.publicKey}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(walletDetails.publicKey || "")}
                title="Copy Public Key"
                aria-label="Copy Public Key"
              >
                <Clipboard className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-red-700 mb-1">
              Private Key (Save this securely! ⚠️)
            </label>
            <div className="flex items-center gap-2">
              <textarea
                readOnly
                className="flex-1 p-2 bg-white border rounded font-mono text-xs resize-none"
                rows={3}
                value={walletDetails.privateKey}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(walletDetails.privateKey || "")}
                title="Copy Private Key"
                aria-label="Copy Private Key"
              >
                <Clipboard className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Balance
            </label>
            <div className="p-2 bg-white border rounded text-sm font-semibold text-green-600">
              {walletDetails.balance} HBAR
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700 font-medium">
            ⚠️ Important Security Notice
          </p>
          <p className="text-xs text-red-600 mt-1">
            Your private key is the only way to access your wallet. Store it
            securely and never share it with anyone. If you lose it, you'll lose
            access to your funds permanently.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => downloadWalletDetails(walletDetails)}
          >
            💾 Download Wallet Details
          </Button>
          <Button className="flex-1" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Standard success view for regular wallet connections
  return (
    <div className="p-6 text-center space-y-4">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-green-700">
        Successfully Connected!
      </h3>
      <p className="text-gray-600">Your {walletName} wallet is now connected</p>
      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-left">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Account ID:</span>
          <code className="text-sm font-mono">{walletDetails.accountId}</code>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Balance:</span>
          <span className="text-sm font-semibold text-green-600">
            {walletDetails.balance} HBAR
          </span>
        </div>
      </div>
      <Button className="w-full" onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}
