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




// import React from "react";
// import { Check, Clipboard } from "lucide-react"; 
// import { Button } from "@/components/ui/button"; 
// import { downloadWalletDetails } from "@/utils/downloadWalletDetails";

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
//   const copyToClipboard = (text: string) => {
//     navigator.clipboard.writeText(text);
//   };

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
//             <Check className="w-8 h-8 text-green-600" />
//           </div>
//           <h3 className="text-xl font-bold text-green-700">
//             Wallet Created Successfully! 🎉
//           </h3>
//           <p className="text-sm text-gray-600 mt-2">
//             Your Hedera account has been created and funded with{" "}
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
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 onClick={() => copyToClipboard(walletDetails.accountId)}
//                 title="Copy Account ID"
//                 aria-label="Copy Account ID"
//               >
//                 <Clipboard className="w-4 h-4" />
//               </Button>
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
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 onClick={() => copyToClipboard(walletDetails.publicKey || "")}
//                 title="Copy Public Key"
//                 aria-label="Copy Public Key"
//               >
//                 <Clipboard className="w-4 h-4" />
//               </Button>
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
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 onClick={() => copyToClipboard(walletDetails.privateKey || "")}
//                 title="Copy Private Key"
//                 aria-label="Copy Private Key"
//               >
//                 <Clipboard className="w-4 h-4" />
//               </Button>
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
//           <Button
//             variant="outline"
//             className="flex-1"
//             onClick={() => downloadWalletDetails(walletDetails)}
//           >
//             💾 Download Wallet Details
//           </Button>
//           <Button className="flex-1" onClick={onContinue}>
//             Continue
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   // Standard success view for regular wallet connections
//   return (
//     <div className="p-6 text-center space-y-4">
//       <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
//         <Check className="w-8 h-8 text-green-600" />
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
//       <Button className="w-full" onClick={onContinue}>
//         Continue
//       </Button>
//     </div>
//   );
// }



import React from "react";
import { Check, Clipboard, Download, Shield, CheckCircle } from "lucide-react"; 
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
      <div className="space-y-6">
        {/* Success header with animation */}
        <div className="text-center">
          <div className="relative mx-auto w-20 h-20 mb-5">
            {/* Outer glow rings */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full opacity-20"></div>
            {/* Main circle */}
            <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Wallet Created Successfully! 🎉
          </h3>
          <p className="text-sm text-gray-600">
            Your Hedera account has been created and funded with{" "}
            <span className="font-semibold text-emerald-600">{walletDetails.balance} HBAR</span>
          </p>
        </div>

        {/* Account details cards */}
        <div className="space-y-4">
          {/* Account ID */}
          <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <div className="w-6 h-6 bg-[#90A5FB]/10 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#123962]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
              </div>
              Account ID
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-white border border-gray-200 rounded-lg text-sm font-mono text-gray-900">
                {walletDetails.accountId}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 hover:bg-[#90A5FB]/10 hover:text-[#123962]"
                onClick={() => copyToClipboard(walletDetails.accountId)}
                title="Copy Account ID"
                aria-label="Copy Account ID"
              >
                <Clipboard className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Public Key */}
          <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <div className="w-6 h-6 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              Public Key
            </label>
            <div className="flex items-start gap-2">
              <code className="flex-1 p-3 bg-white border border-gray-200 rounded-lg text-xs font-mono break-all text-gray-900 leading-relaxed">
                {walletDetails.publicKey}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 hover:bg-blue-50 hover:text-blue-600"
                onClick={() => copyToClipboard(walletDetails.publicKey || "")}
                title="Copy Public Key"
                aria-label="Copy Public Key"
              >
                <Clipboard className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Private Key - Warning Style */}
          <div className="p-4 bg-gradient-to-br from-red-50 to-white rounded-xl border-2 border-red-200 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-2">
              <div className="w-6 h-6 bg-red-500/10 rounded-lg flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-red-600" />
              </div>
              Private Key
              <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">⚠️ KEEP SECRET</span>
            </label>
            <div className="flex items-start gap-2">
              <textarea
                readOnly
                className="flex-1 p-3 bg-white border border-red-200 rounded-lg font-mono text-xs resize-none text-gray-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-red-300"
                rows={3}
                value={walletDetails.privateKey}
              />
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 hover:bg-red-50 hover:text-red-600"
                onClick={() => copyToClipboard(walletDetails.privateKey || "")}
                title="Copy Private Key"
                aria-label="Copy Private Key"
              >
                <Clipboard className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Balance */}
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-200 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <div className="w-6 h-6 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Current Balance
            </label>
            <div className="p-3 bg-white border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-600">{walletDetails.balance}</span>
                <span className="text-sm text-gray-600 font-medium">HBAR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Warning */}
        <div className="relative overflow-hidden bg-gradient-to-br from-red-50 via-orange-50 to-red-50 border-2 border-red-300 rounded-xl p-5 shadow-lg">
          {/* Warning icon */}
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                <span>⚠️ Critical Security Notice</span>
              </p>
              <p className="text-sm text-red-700 leading-relaxed">
                Your <strong>private key</strong> is the only way to access your wallet. Store it securely and <strong>never share it</strong> with anyone. If you lose it, you'll lose access to your funds permanently. We recommend downloading and storing your wallet details in a safe place.
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 border-2 border-[#123962] text-[#123962] hover:bg-[#123962]/5 font-medium"
            onClick={() => downloadWalletDetails(walletDetails)}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Wallet Details
          </Button>
          <Button 
            className="flex-1 bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#0d2640] hover:to-[#7088e8] text-white shadow-lg shadow-[#90A5FB]/30 font-medium"
            onClick={onContinue}
          >
            Continue
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    );
  }

  // Standard success view for regular wallet connections
  return (
    <div className="text-center space-y-6">
      {/* Success Animation */}
      <div className="relative mx-auto w-20 h-20 mb-2">
        {/* Outer glow rings with staggered animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full animate-ping opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full opacity-20"></div>
        {/* Main circle */}
        <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/40">
          <Check className="w-10 h-10 text-white" strokeWidth={3} />
        </div>
        {/* Checkmark accent */}
        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full border-4 border-emerald-500 flex items-center justify-center shadow-lg">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Successfully Connected!
        </h3>
        <p className="text-gray-600">
          Your <span className="font-semibold text-[#123962]">{walletName}</span> wallet is now connected
        </p>
      </div>

      {/* Wallet Info Card */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 shadow-lg p-6 space-y-4">
        {/* Account ID */}
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#90A5FB]/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-[#123962]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500 font-medium mb-0.5">Account ID</p>
              <code className="text-sm font-mono font-semibold text-gray-900">{walletDetails.accountId}</code>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500 font-medium mb-0.5">Balance</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-emerald-600">{walletDetails.balance}</span>
                <span className="text-sm text-gray-600 font-medium">HBAR</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <Button 
        className="w-full bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#0d2640] hover:to-[#7088e8] text-white shadow-lg shadow-[#90A5FB]/30 font-medium py-6"
        onClick={onContinue}
      >
        Continue
        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Button>
    </div>
  );
}
