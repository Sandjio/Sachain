// import React, { useState } from 'react';
// import { Wallet, CreditCard, AlertTriangle } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent } from '@/components/ui/card';
// import ConnectWalletDialog from '@/features/wallet/components/ConnectWalletDialog';
// import { useWalletStore } from '@/features/wallet/store/walletStore';

// interface Step2Props {
//   calculation: any;
//   walletBalance: number;
//   orangeMoneyBalance: number;
//   loading: boolean;
//   onCheckWallet: () => void;
//   onCheckOrangeMoney: () => void;
//   onNext: () => void;
//   onBack: () => void;
//   formatCurrency: (amount: number) => string;
// }

// export default function Step2Balances({
//   calculation,
//   walletBalance,
//   orangeMoneyBalance,
//   loading,
//   onCheckWallet,
//   onCheckOrangeMoney,
//   onNext,
//   onBack,
//   formatCurrency,
// }: Step2Props) {
//   const isConnected = useWalletStore((state) => state.isConnected);
//   const walletAddress = useWalletStore((state) => state.walletAddress);
//   const [walletModalOpen, setWalletModalOpen] = useState(false);

//   const needsTopUp = calculation && walletBalance < calculation.finalTotal;

//   const onWalletConfirmed = () => {
//     setWalletModalOpen(false);
//   };

//   if (!isConnected) {
//     return (
//       <div>
//         <p className="mb-4">Please connect or create your wallet to proceed.</p>
//         <Button onClick={() => setWalletModalOpen(true)} className="mb-4">
//           Connect
//         </Button>
//         <ConnectWalletDialog
//           open={walletModalOpen}
//           onOpenChange={setWalletModalOpen}
//           onWalletConfirmed={onWalletConfirmed}
//         />
//         <Button variant="outline" onClick={onBack}>
//           Cancel
//         </Button>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       <div className="text-center">
//         <Wallet className="h-12 w-12 text-blue-600 mx-auto mb-4" />
//         <h3 className="text-lg font-semibold mb-2">Check Your Balances</h3>
//         <p className="text-gray-600">Ensure you have sufficient funds for this investment</p>
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         <Card>
//           <CardContent className="p-4 text-center">
//             <Wallet className="h-8 w-8 text-blue-600 mx-auto mb-2" />
//             <p className="text-sm text-gray-600">Wallet Balance</p>
//             <p className="text-xl font-bold">{formatCurrency(walletBalance)}</p>
//             <Button 
//               variant="outline" 
//               size="sm" 
//               onClick={onCheckWallet}
//               loading={loading}
//               className="mt-2 w-full"
//             >
//               Check Balance
//             </Button>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="p-4 text-center">
//             <CreditCard className="h-8 w-8 text-orange-600 mx-auto mb-2" />
//             <p className="text-sm text-gray-600">Orange Money</p>
//             <p className="text-xl font-bold">{formatCurrency(orangeMoneyBalance)}</p>
//             <Button 
//               variant="outline" 
//               size="sm" 
//               onClick={onCheckOrangeMoney}
//               loading={loading}
//               className="mt-2 w-full"
//             >
//               Recharge
//             </Button>
//           </CardContent>
//         </Card>
//       </div>

//       {calculation && (
//         <Card>
//           <CardContent className="p-4">
//             <h4 className="font-semibold mb-2">Investment Summary</h4>
//             <div className="flex justify-between">
//               <span>Total needed:</span>
//               <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       {needsTopUp && (
//         <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
//           <div className="flex items-center">
//             <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
//             <p className="text-sm text-yellow-700">
//               Insufficient wallet balance. You'll need to top up via Orange Money.
//             </p>
//           </div>
//         </div>
//       )}

//       <div className="flex gap-3">
//         <Button variant="outline" onClick={onBack} className="flex-1">
//           Back
//         </Button>
//         <Button 
//           onClick={onNext} 
//           className="flex-1 bg-[#123962] hover:bg-[#90A5FB] text-white"
//           disabled={needsTopUp}
//         >
//           {needsTopUp ? 'Top Up Wallet' : 'Proceed to Purchase'}
//         </Button>
//       </div>
//     </div>
//   );
// }



// import React, { useState } from 'react';
// import { Wallet, CreditCard, AlertTriangle } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent } from '@/components/ui/card';
// import ConnectWalletDialog from '@/features/wallet/components/ConnectWalletDialog';
// import { useWalletStore } from '@/features/wallet/store/walletStore';
// import { RechargeForm } from '@/features/recharge/component/RechargeForm';
// import { useHederaBalance } from '@/features/project/hook/useHederaVerification'; // Import balance hook

// interface Step2Props {
//   calculation: any;
//   orangeMoneyBalance: number;
//   orangeMoneyLoading: boolean;
//   onCheckOrangeMoney: () => void;
//   onNext: () => void;
//   onBack: () => void;
//   formatCurrency: (amount: number | null) => string;
// }

// export default function Step2Balances({
//   calculation,
//   orangeMoneyBalance,
//   orangeMoneyLoading,
//   onCheckOrangeMoney,
//   onNext,
//   onBack,
//   formatCurrency,
// }: Step2Props) {
//   const walletAddress = useWalletStore((state) => state.walletAddress);
//   const isConnected = useWalletStore((state) => state.isConnected);
//   const [walletModalOpen, setWalletModalOpen] = useState(false);
//   const [showRechargeForm, setShowRechargeForm] = useState(false);
//   const [triggerBalanceRefresh, setTriggerBalanceRefresh] = useState(0); // to manually refetch

//   // Call the custom hook with walletAddress and tokenId if needed
//   const {
//     balance: walletBalance,
//     loading: walletLoading,
//     error: walletError,
//   } = useHederaBalance(walletAddress, undefined);

//   // Manually trigger balance refresh by updating a state that `useHederaBalance` depends on
//   // To do this, you might need to modify `useHederaBalance` to accept a refresh trigger or use a client refetch method.
//   // For this example, let's assume changing walletAddress triggers re-fetch.

//   const needsTopUp = calculation && walletBalance !== null && walletBalance < calculation.finalTotal;

//   const onWalletConfirmed = () => {
//     setWalletModalOpen(false);
//   };

//   const handleRechargeSuccess = () => {
//     setShowRechargeForm(false);
//     // After recharge, trigger wallet balance refresh
//     setTriggerBalanceRefresh((prev) => prev + 1);
//   };

//   if (!isConnected) {
//     return (
//       <div>
//         <p className="mb-4">Please connect or create your wallet to proceed.</p>
//         <Button onClick={() => setWalletModalOpen(true)} className="mb-4">
//           Connect / Create Wallet
//         </Button>
//         <ConnectWalletDialog
//           open={walletModalOpen}
//           onOpenChange={setWalletModalOpen}
//           onWalletConfirmed={onWalletConfirmed}
//         />
//         <Button variant="outline" onClick={onBack}>
//           Cancel
//         </Button>
//       </div>
//     );
//   }

//   if (walletLoading && !showRechargeForm) {
//     return (
//       <div className="text-center p-6">
//         <p>Checking your wallet balance...</p>
//       </div>
//     );
//   }

//   if (needsTopUp) {
//     if (showRechargeForm) {
//       return (
//         <div>
//           <RechargeForm
//             walletAddress={walletAddress!}
//             onSuccess={handleRechargeSuccess}
//             onError={(msg) => alert(msg)}
//           />
//           <Button
//             variant="ghost"
//             className="mt-4"
//             onClick={() => setShowRechargeForm(false)}
//           >
//             Cancel Recharge
//           </Button>
//         </div>
//       );
//     }

//     return (
//       <div className="text-center space-y-4 p-6">
//         <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center text-yellow-700">
//     <AlertTriangle className="h-4 w-4 mr-2" />
//     <p className="text-sm text-yellow-700">
//       You have {formatCurrency(walletBalance)} but need at least {formatCurrency(calculation.finalTotal)}.
//       Please recharge to continue.
//     </p>
//   </div>
//   <div className="text-center flex justify-between space-y-4">
//     <Button onClick={() => setShowRechargeForm(true)}>Recharge Wallet</Button>
//     <Button variant="outline" onClick={onBack}>
//       Cancel
//     </Button>
//   </div>
// </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       <div className="text-center">
//         <Wallet className="h-12 w-12 text-blue-600 mx-auto mb-4" />
//         <h3 className="text-lg font-semibold mb-2">Check Your Balances</h3>
//         <p className="text-gray-600">
//           Ensure you have sufficient funds for this investment
//         </p>
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         <Card>
//           <CardContent className="p-4 text-center">
//             <Wallet className="h-8 w-8 text-blue-600 mx-auto mb-2" />
//             <p className="text-sm text-gray-600">Wallet Balance</p>
//             <p className="text-xl font-bold">{formatCurrency(walletBalance)}</p>
//             {walletError && (
//               <p className="text-red-600 text-sm mt-1">{walletError}</p>
//             )}
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={() => setTriggerBalanceRefresh((p) => p + 1)}
//               loading={walletLoading}
//               className="mt-2 w-full"
//             >
//               Check Balance
//             </Button>
//           </CardContent>
//         </Card>

//         {calculation && (
//         <Card>
//           <CardContent className="p-4">
//             <h4 className="font-semibold mb-2">Investment Summary</h4>
//             <div className="flex justify-between">
//               <span>Total needed:</span>
//               <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       </div>

      
//       <div className="flex gap-3">
//         <Button variant="outline" onClick={onBack} className="flex-1">
//           Back
//         </Button>
//         <Button
//           onClick={onNext}
//           className="flex-1 bg-[#123962] hover:bg-[#90A5FB] text-white"
//           aria-disabled={needsTopUp}
//           disabled={needsTopUp}
//         >
//           {needsTopUp ? 'Top Up Wallet' : 'Proceed to Purchase'}
//         </Button>
//       </div>
//     </div>
//   );
// }


import React, { useState } from 'react';
import { Wallet, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ConnectWalletDialog from '@/features/wallet/components/ConnectWalletDialog';
import { useWalletStore } from '@/features/wallet/store/walletStore';
import { RechargeForm } from '@/features/recharge/component/RechargeForm';
import { useHederaBalance } from '@/features/project/hook/useHederaVerification';
import { useRecharge } from '@/features/recharge/hook/useRecharge';

interface Step2Props {
  calculation: any;
  orangeMoneyBalance: number;
  orangeMoneyLoading: boolean;
  onCheckOrangeMoney: () => void;
  onNext: () => void;
  onBack: () => void;
  formatCurrency: (amount: number | null) => string;
}

export default function Step2Balances({
  calculation,
  orangeMoneyBalance,
  orangeMoneyLoading,
  onCheckOrangeMoney,
  onNext,
  onBack,
  formatCurrency,
}: Step2Props) {
  const walletAddress = useWalletStore((state) => state.walletAddress);
  const isConnected = useWalletStore((state) => state.isConnected);

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [showRechargeForm, setShowRechargeForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Wallet balance hook with refreshTrigger for manual refresh
  const {
    balance: walletBalance,
    loading: walletLoading,
    error: walletError,
  } = useHederaBalance(walletAddress, undefined, refreshTrigger);

  // Function to refresh wallet balance, used by useRecharge polling
  const refreshWalletBalance = async (): Promise<number | null> => {
    setRefreshTrigger((prev) => prev + 1);
    return walletBalance;
  };

  // Use recharge hook, pass refreshWalletBalance and onNext to proceed after confirmation
  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    error: rechargeError,
    polling: isPolling,
    pollAttempts,
    hbarEquivalent,
  } = useRecharge(walletAddress!, refreshWalletBalance, onNext);

  const needsTopUp =
    calculation && walletBalance !== null && walletBalance < calculation.finalTotal;

  const onWalletConfirmed = () => {
    setWalletModalOpen(false);
  };

  if (!isConnected) {
    return (
      <div>
        <p className="mb-4">Please connect or create your wallet to proceed.</p>
        <Button onClick={() => setWalletModalOpen(true)} className="mb-4">
          Connect / Create Wallet
        </Button>
        <ConnectWalletDialog
          open={walletModalOpen}
          onOpenChange={setWalletModalOpen}
          onWalletConfirmed={onWalletConfirmed}
        />
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
      </div>
    );
  }

  // Show waiting UI while polling recharge confirmation
  if (isPolling) {
    return (
      <div className="p-6 text-center">
        <p>Waiting for recharge confirmation... Please complete the payment on your phone.</p>
        <p>Checking attempt: {pollAttempts} of 12</p>
        <Button variant="outline" onClick={() => setShowRechargeForm(false)}>
          Cancel Recharge
        </Button>
      </div>
    );
  }

  // Show recharge form when requested (and not polling)
  if (showRechargeForm) {
    return (
      <div>
        <RechargeForm
          register={register}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          errors={errors}
          isSubmitting={isSubmitting}
          error={rechargeError}
          hbarEquivalent={hbarEquivalent}
          walletAddress={walletAddress!}
        />
        <Button variant="ghost" className="mt-4" onClick={() => setShowRechargeForm(false)}>
          Cancel Recharge
        </Button>
      </div>
    );
  }

  if (needsTopUp) {
    return (
      <div className="text-center space-y-4 p-6">
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center text-yellow-700">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <p className="text-sm text-yellow-700">
            You have {formatCurrency(walletBalance)} but need at least {formatCurrency(calculation.finalTotal)}.
            Please recharge to continue.
          </p>
        </div>
        <div className="flex justify-between space-x-4">
          <Button onClick={() => setShowRechargeForm(true)}>Recharge Wallet</Button>
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Normal wallet balance display when sufficient funds exist
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Wallet className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Check Your Balances</h3>
        <p className="text-gray-600">Ensure you have sufficient funds for this investment</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Wallet className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Wallet Balance</p>
            <p className="text-xl font-bold">{formatCurrency(walletBalance)}</p>
            {walletError && <p className="text-red-600 text-sm mt-1">{walletError}</p>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshTrigger((p) => p + 1)}
              loading={walletLoading}
              className="mt-2 w-full"
            >
              Check Balance
            </Button>
          </CardContent>
        </Card>

        {calculation && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">Investment Summary</h4>
              <div className="flex justify-between">
                <span>Total needed:</span>
                <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 bg-[#123962] hover:bg-[#90A5FB] text-white"
          aria-disabled={needsTopUp}
          disabled={needsTopUp}
        >
          {needsTopUp ? 'Top Up Wallet' : 'Proceed to Purchase'}
        </Button>
      </div>
    </div>
  );
}
