// import React, { useState } from 'react';
// import { Wallet, AlertTriangle } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent } from '@/components/ui/card';
// import ConnectWalletDialog from '@/features/wallet/components/ConnectWalletDialog';
// import { useWalletStore } from '@/features/wallet/store/walletStore';
// import { RechargeForm } from '@/features/recharge/component/RechargeForm';
// import { useHederaBalance } from '@/features/project/hook/useHederaVerification';
// import { useRecharge } from '@/features/recharge/hook/useRecharge';

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
//   const [refreshTrigger, setRefreshTrigger] = useState(0);

//   // Wallet balance hook with refreshTrigger for manual refresh
//   const {
//     balance: walletBalance,
//     loading: walletLoading,
//     error: walletError,
//   } = useHederaBalance(walletAddress, undefined, refreshTrigger);

//   // Function to refresh wallet balance, used by useRecharge polling
//   const refreshWalletBalance = async (): Promise<number | null> => {
//     setRefreshTrigger((prev) => prev + 1);
//     return walletBalance;
//   };

  
//   const {
//     register,
//     handleSubmit,
//     onSubmit,
//     errors,
//     isSubmitting,
//     error: rechargeError,
//     polling: isPolling,
//     pollAttempts,
//     hbarEquivalent,
//   } = useRecharge(walletAddress!, refreshWalletBalance, onNext);

//   const needsTopUp =
//     calculation &&
//     walletBalance !== null &&
//     walletBalance < calculation.finalTotal;

//   const onWalletConfirmed = () => {
//     setWalletModalOpen(false);
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

//   // Show waiting UI while polling recharge confirmation
//   if (isPolling) {
//     return (
//       <div className="p-6 text-center">
//         <p>
//           Waiting for recharge confirmation... Please complete the payment on
//           your phone.
//         </p>
//         <p>Checking attempt: {pollAttempts} of 12</p>
//         <Button variant="outline" onClick={() => setShowRechargeForm(false)}>
//           Cancel Recharge
//         </Button>
//       </div>
//     );
//   }

//   // Show recharge form when requested (and not polling)
//   if (showRechargeForm) {
//     return (
//       <div>
//         <RechargeForm
//           register={register}
//           handleSubmit={handleSubmit}
//           onSubmit={onSubmit}
//           errors={errors}
//           isSubmitting={isSubmitting}
//           error={rechargeError}
//           hbarEquivalent={hbarEquivalent}
//           walletAddress={walletAddress!}
//         />
//         <Button
//           variant="ghost"
//           className="mt-4"
//           onClick={() => setShowRechargeForm(false)}
//         >
//           Cancel Recharge
//         </Button>
//       </div>
//     );
//   }

//   if (needsTopUp) {
//     return (
//       <div className="text-center space-y-4 p-6">
//         <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center text-yellow-700">
//           <AlertTriangle className="h-4 w-4 mr-2" />
//           <p className="text-sm text-yellow-700">
//             You have {formatCurrency(walletBalance)} but need at least{' '}
//             {formatCurrency(calculation.finalTotal)}. Please recharge to
//             continue.
//           </p>
//         </div>
//         <div className="flex justify-between space-x-4">
//           <Button onClick={() => setShowRechargeForm(true)}>
//             Recharge Wallet
//           </Button>
//           <Button variant="outline" onClick={onBack}>
//             Cancel
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   // Normal wallet balance display when sufficient funds exist
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
//               onClick={() => setRefreshTrigger((p) => p + 1)}
//               loading={walletLoading}
//               className="mt-2 w-full"
//             >
//               Check Balance
//             </Button>
//           </CardContent>
//         </Card>

//         {calculation && (
//           <Card>
//             <CardContent className="p-4">
//               <h4 className="font-semibold mb-2">Investment Summary</h4>
//               <div className="flex justify-between">
//                 <span>Total needed:</span>
//                 <span className="font-bold">
//                   {formatCurrency(calculation.finalTotal)}
//                 </span>
//               </div>
//             </CardContent>
//           </Card>
//         )}
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
import { 
  Wallet, 
  AlertTriangle, 
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  DollarSign,
  CheckCircle,
  Clock,
  Sparkles,
  CreditCard,
  Loader2,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    calculation &&
    walletBalance !== null &&
    walletBalance < calculation.finalTotal;

  const onWalletConfirmed = () => {
    setWalletModalOpen(false);
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Wallet className="h-8 w-8 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent mb-2">
            Wallet Connection Required
          </h3>
          <p className="text-gray-600">
            Please connect or create your wallet to proceed with investment
          </p>
        </div>

        <Card className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200 rounded-xl shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="flex items-center gap-2 justify-center mb-4">
              <Info className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-gray-700">
                Connect your Hedera wallet to check balances and complete your investment
              </p>
            </div>
            <Button 
              onClick={() => setWalletModalOpen(true)} 
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect / Create Wallet
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <ConnectWalletDialog
          open={walletModalOpen}
          onOpenChange={setWalletModalOpen}
          onWalletConfirmed={onWalletConfirmed}
        />

        <Button 
          variant="outline" 
          onClick={onBack}
          className="w-full border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }

  // Polling state - waiting for recharge confirmation
  if (isPolling) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
              <Clock className="h-8 w-8 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent mb-2">
            Waiting for Confirmation
          </h3>
          <p className="text-gray-600">
            Please complete the payment on your phone
          </p>
        </div>

        <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-200 rounded-xl shadow-sm">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              <p className="font-medium text-gray-900">Processing recharge...</p>
            </div>
            
            <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">
              Attempt {pollAttempts} of 12
            </Badge>

            <div className="flex items-center gap-2 justify-center p-3 bg-white/60 rounded-lg">
              <Info className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-gray-600">
                This may take a few moments. Please don't close this page.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button 
          variant="outline" 
          onClick={() => setShowRechargeForm(false)}
          className="w-full border-gray-200 hover:border-red-300 hover:bg-red-50"
        >
          Cancel Recharge
        </Button>
      </div>
    );
  }

  // Show recharge form when requested
  if (showRechargeForm) {
    return (
      <div className="space-y-4">
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
        <Button
          variant="outline"
          className="w-full border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
          onClick={() => setShowRechargeForm(false)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Balances
        </Button>
      </div>
    );
  }

  // Needs top-up state
  if (needsTopUp) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent mb-2">
            Insufficient Balance
          </h3>
          <p className="text-gray-600">
            Please recharge your wallet to continue
          </p>
        </div>

        <Card className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200 rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-gray-900">Balance Alert</h4>
                <p className="text-sm text-gray-700">
                  You have {formatCurrency(walletBalance)} but need at least{' '}
                  {formatCurrency(calculation.finalTotal)} to complete this investment.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/60 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Current Balance</p>
                <p className="font-semibold text-gray-900">{formatCurrency(walletBalance)}</p>
              </div>
              <div className="p-3 bg-white/60 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Required Amount</p>
                <p className="font-semibold text-emerald-600">{formatCurrency(calculation.finalTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={() => setShowRechargeForm(true)}
            className="bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#123962]/90 hover:to-[#90A5FB]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Recharge Wallet
          </Button>
        </div>
      </div>
    );
  }

  // Normal wallet balance display when sufficient funds exist
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#123962] to-[#90A5FB] rounded-2xl flex items-center justify-center shadow-lg">
            <Wallet className="h-8 w-8 text-white" />
          </div>
        </div>
        <h3 className="text-xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent mb-2">
          Check Your Balances
        </h3>
        <p className="text-gray-600">
          Ensure you have sufficient funds for this investment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Wallet Balance Card */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <CardTitle className="font-semibold text-gray-900">
                Wallet Balance
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <p className="text-3xl font-semibold text-emerald-600 mb-2">
                {formatCurrency(walletBalance)}
              </p>
              {walletError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-xs">{walletError}</p>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshTrigger((p) => p + 1)}
              disabled={walletLoading}
              className="w-full border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
            >
              {walletLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Balance
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Investment Summary Card */}
        {calculation && (
          <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-200 rounded-xl shadow-sm">
            <CardHeader className="border-b border-blue-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#123962]/10 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-[#123962]" />
                </div>
                <CardTitle className="font-semibold text-gray-900">
                  Investment Summary
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="p-3 bg-white/60 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Total Needed</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(calculation.finalTotal)}
                  </span>
                </div>
              </div>

              {walletBalance !== null && walletBalance >= calculation.finalTotal && (
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2 justify-center">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">
                      Sufficient funds available
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Wallet Address Info */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Info className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 mb-1">Connected Wallet</p>
              <p className="text-sm font-mono text-gray-900 truncate">
                {walletAddress}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onNext}
          className="bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#123962]/90 hover:to-[#90A5FB]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          aria-disabled={needsTopUp}
          disabled={needsTopUp}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {needsTopUp ? 'Top Up Required' : 'Proceed to Purchase'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
