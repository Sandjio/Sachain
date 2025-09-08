// import { useState } from "react";
// import { Client, AccountBalanceQuery } from "@hashgraph/sdk";

// interface ManualWalletConnectProps {
//   onConnectSuccess: (accountId: string, balance: string) => void;
// }

// export default function ManualWalletConnect({ onConnectSuccess }: ManualWalletConnectProps) {
//   const [accountId, setAccountId] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [balance, setBalance] = useState<string | null>(null);

//   // Initialize Hedera client with operator credentials from env
//   const client = Client.forTestnet();
//   client.setOperator(
//     process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID!,
//     process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY!
//   );

//   const handleConnect = async () => {
//     setError(null);
//     setBalance(null);

//     if (!accountId.trim()) {
//       setError("Please enter a valid Hedera Account ID (e.g., 0.0.1234)");
//       return;
//     }

//     setLoading(true);
//     try {
//       // Query account balance to verify connection
//       const balanceResponse = await new AccountBalanceQuery()
//         .setAccountId(accountId.trim())
//         .execute(client);

//       const balanceHbar = balanceResponse.hbars.toString();

//       setBalance(balanceHbar);
//       onConnectSuccess(accountId.trim(), balanceHbar);
//     } catch (err) {
//       setError("Unable to fetch balance. Check Account ID and network connection.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow space-y-4">
//       <label className="block font-semibold">Enter your Hedera Account ID</label>
//       <input
//         type="text"
//         placeholder="e.g. 0.0.12345"
//         value={accountId}
//         onChange={(e) => setAccountId(e.target.value)}
//         className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
//       />

//       {error && <p className="text-red-600">{error}</p>}
//       {balance !== null && <p className="text-green-600">Balance: {balance} HBAR</p>}

//       <button
//         onClick={handleConnect}
//         disabled={loading}
//         className="w-full py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
//       >
//         {loading ? "Connecting..." : "Connect"}
//       </button>
//     </div>
//   );
// }

// import { useState, useEffect } from "react";
// import { Client, AccountBalanceQuery } from "@hashgraph/sdk";
// import ConnectSteps from "./ConnectSteps";

// interface ManualWalletConnectProps {
//   onConnectSuccess: (accountId: string, balance: string) => void;
// }

// const steps = [
//   "Wallet detected",
//   "Requesting connection...",
//   "Verify account",
//   "Complete setup",
// ];

// export default function ManualWalletConnect({ onConnectSuccess }: ManualWalletConnectProps) {
//   const [accountId, setAccountId] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [balance, setBalance] = useState<string | null>(null);
//   const [currentStep, setCurrentStep] = useState(0);
//   const [connecting, setConnecting] = useState(false);

//   const client = Client.forTestnet();
//   client.setOperator(
//     process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID!,
//     process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY!
//   );

//   useEffect(() => {
//     let timer: NodeJS.Timeout;

//     // Automatically progress steps when connecting
//     if (connecting && currentStep < steps.length) {
//       timer = setTimeout(() => {
//         setCurrentStep(currentStep + 1);
//       }, 1200);
//     }

//     // When finished all steps, call success handler
//     if (connecting && currentStep === steps.length) {
//       onConnectSuccess(accountId.trim(), balance || "0");
//       setConnecting(false);
//       setLoading(false);
//       setCurrentStep(0);
//     }

//     return () => clearTimeout(timer);
//   }, [connecting, currentStep, accountId, balance, onConnectSuccess]);

//   const handleConnect = async () => {
//     setError(null);
//     setBalance(null);

//     if (!accountId.trim()) {
//       setError("Please enter a valid Hedera Account ID (e.g., 0.0.1234)");
//       return;
//     }

//     setLoading(true);
//     try {
//       const balanceResponse = await new AccountBalanceQuery()
//         .setAccountId(accountId.trim())
//         .execute(client);

//       const balanceHbar = balanceResponse.hbars.toString();
//       setBalance(balanceHbar);

//       setConnecting(true);
//       setCurrentStep(1); // start steps progression
//     } catch (err) {
//       setError("Unable to fetch balance. Please Check Account ID or  network connection.");
//       setLoading(false);
//     }
//   };

//   if (connecting) {
//     return <ConnectSteps currentStep={currentStep} totalSteps={steps.length} />;
//   }

//   return (
//     <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow space-y-4">
//       <label className="block font-semibold">Enter your Hedera Account ID</label>
//       <input
//         type="text"
//         placeholder="e.g. 0.0.12345"
//         value={accountId}
//         onChange={(e) => setAccountId(e.target.value)}
//         className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
//       />

//       {error && <p className="text-red-600">{error}</p>}
//       {balance !== null && <p className="text-green-600">Balance: {balance} HBAR</p>}

//       <button
//         onClick={handleConnect}
//         disabled={loading}
//         className="w-full py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
//       >
//         {loading ? "Connecting..." : "Connect"}
//       </button>
//     </div>
//   );
// }

import React from 'react';
import { useManualWalletConnect } from '../hooks/useWalletConnect';

interface ManualWalletConnectProps {
  onValidated: (accountId: string, balance: string) => void;
}

export default function ManualWalletConnect({
  onValidated,
}: ManualWalletConnectProps) {
  const { accountId, setAccountId, error, loading, startValidation } =
    useManualWalletConnect();

  const handleConnectClick = async () => {
    const balance = await startValidation();
    if (balance !== null) {
      onValidated(accountId, balance);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow space-y-4">
      <label className="block font-semibold">
        Enter your Hedera Account ID
      </label>
      <input
        type="text"
        placeholder="e.g. 0.0.12345"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {error && <p className="text-red-600">{error}</p>}

      <button
        onClick={handleConnectClick}
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Validating...' : 'Connect'}
      </button>
    </div>
  );
}
