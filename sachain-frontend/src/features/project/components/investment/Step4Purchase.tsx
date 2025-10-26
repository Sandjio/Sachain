// import React, { useState } from 'react';
// import { DollarSign, ArrowRight, Box } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent } from '@/components/ui/card';

// interface Step4Props {
//   project: { name: string };
//   calculation: { tokensDesired: number; finalTotal: number } | null;
//   loading: boolean;
//   onPurchase: () => Promise<void>;
//   onNext: () => void;
//   onBack: () => void;
//   formatCurrency: (amount: number) => string;
// }

// function Step4PurchaseAnimation() {
//   return (
//     <div className="text-center mb-6 space-y-2">
//       <div className="flex items-center justify-center space-x-8">
//         {/* HBAR Icon */}
//         <div className="flex flex-col items-center">
//           <DollarSign className="h-12 w-12 text-green-600 animate-bounce-slow" />
//           <span className="mt-1 font-semibold">HBAR</span>
//         </div>

//         {/* Arrow with pulse animation */}
//         <ArrowRight className="h-8 w-8 text-gray-500 animate-pulse" />

//         {/* Tokens Icon */}
//         <div className="flex flex-col items-center">
//           <Box className="h-12 w-12 text-yellow-500 animate-bounce-slow delay-200" />
//           <span className="mt-1 font-semibold">Tokens</span>
//         </div>
//       </div>

//       <p className="text-gray-600 mt-4">Ready to complete your investment</p>

//       <style jsx>{`
//         @keyframes bounceSlow {
//           0%, 100% {
//             transform: translateY(0);
//           }
//           50% {
//             transform: translateY(-10px);
//           }
//         }
//         .animate-bounce-slow {
//           animation: bounceSlow 2s ease-in-out infinite;
//         }
//       `}</style>
//     </div>
//   );
// }

// export default function Step4Purchase({
//   project,
//   calculation,
//   loading,
//   onPurchase,
//   onNext,
//   onBack,
//   formatCurrency,
// }: Step4Props) {
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);

//   const handlePurchase = async () => {
//     setErrorMessage(null);
//     try {
//       await onPurchase();
//       onNext();
//     } catch (err: any) {
//       // Handle or display error message here
//       setErrorMessage(err?.message || "Purchase failed. Please try again.");
//     }
//   };

//   if (!calculation) {
//     return (
//       <div className="text-center p-6">
//         <p className="text-gray-600">No purchase details available.</p>
//         <Button onClick={onBack}>Back</Button>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       <Step4PurchaseAnimation />

//       <Card>
//         <CardContent className="p-4">
//           <h4 className="font-semibold mb-3">Investment Summary</h4>
//           <div className="space-y-2">
//             <div className="flex justify-between">
//               <span>Project:</span>
//               <span className="font-medium">{project.name}</span>
//             </div>
//             <div className="flex justify-between">
//               <span>Tokens to purchase:</span>
//               <span className="font-medium">{calculation.tokensDesired}</span>
//             </div>
//             <div className="flex justify-between">
//               <span>Total cost:</span>
//               <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
//             </div>
//           </div>
//         </CardContent>
//       </Card>

//       {errorMessage && (
//         <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-center">
//           {errorMessage}
//         </div>
//       )}

//       <div className="flex gap-3">
//         <Button
//           variant="outline"
//           onClick={onBack}
//           className="flex-1"
//           disabled={loading}
//           aria-label="Back to previous step"
//         >
//           Back
//         </Button>
//         <Button
//           onClick={handlePurchase}
//           className="flex-1 bg-[#123962] hover:bg-[#90A5FB] text-white"
//           disabled={loading}
//           aria-disabled={loading}
//         >
//           {loading ? 'Purchasing...' : 'Complete Purchase'}
//         </Button>
//       </div>
//     </div>
//   );
// }



// import React, { useState } from 'react';
// import { DollarSign, ArrowRight, Box } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent } from '@/components/ui/card';

// interface Step4Props {
//   project: { name: string };
//   calculation: { tokensDesired: number; finalTotal: number } | null;
//   loading: boolean;
//   onPurchase: (investorPrivateKey: string, investorWalletAddress: string) => Promise<void>;
//   onNext: () => void;
//   onBack: () => void;
//   formatCurrency: (amount: number) => string;
//   investorPrivateKey: string;
//   investorWalletAddress: string;
// }

// function Step4PurchaseAnimation() {
//   return (
//     <div className="text-center mb-6 space-y-2">
//       <div className="flex items-center justify-center space-x-8">
//         <div className="flex flex-col items-center">
//           <DollarSign className="h-12 w-12 text-green-600 animate-bounce-slow" />
//           <span className="mt-1 font-semibold">HBAR</span>
//         </div>
//         <ArrowRight className="h-8 w-8 text-gray-500 animate-pulse" />
//         <div className="flex flex-col items-center">
//           <Box className="h-12 w-12 text-yellow-500 animate-bounce-slow delay-200" />
//           <span className="mt-1 font-semibold">Tokens</span>
//         </div>
//       </div>
//       <p className="text-gray-600 mt-4">Ready to complete your investment</p>

//       <style jsx>{`
//         @keyframes bounceSlow {
//           0%, 100% { transform: translateY(0); }
//           50% { transform: translateY(-10px); }
//         }
//         .animate-bounce-slow {
//           animation: bounceSlow 2s ease-in-out infinite;
//         }
//       `}</style>
//     </div>
//   );
// }

// export default function Step4Purchase({
//   project,
//   calculation,
//   loading,
//   onPurchase,
//   onNext,
//   onBack,
//   formatCurrency,
//   investorPrivateKey,
//   investorWalletAddress,
// }: Step4Props) {
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);

//   if (!calculation) {
//     return (
//       <div className="text-center p-6">
//         <p className="text-gray-600">No purchase details available.</p>
//         <Button onClick={onBack}>Back</Button>
//       </div>
//     );
//   }

//   const handlePurchase = async () => {
//     setErrorMessage(null);
//     try {
//       await onPurchase(investorPrivateKey, investorWalletAddress);
//       onNext();
//     } catch (err: any) {
//       setErrorMessage(err?.message || "Purchase failed. Please try again.");
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <Step4PurchaseAnimation />

//       <Card>
//         <CardContent className="p-4">
//           <h4 className="font-semibold mb-3">Investment Summary</h4>
//           <div className="space-y-2">
//             <div className="flex justify-between">
//               <span>Project:</span>
//               <span className="font-medium">{project.name}</span>
//             </div>
//             <div className="flex justify-between">
//               <span>Tokens to purchase:</span>
//               <span className="font-medium">{calculation.tokensDesired}</span>
//             </div>
//             <div className="flex justify-between">
//               <span>Total cost:</span>
//               <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
//             </div>
//           </div>
//         </CardContent>
//       </Card>

//       {errorMessage && (
//         <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-center">
//           {errorMessage}
//         </div>
//       )}

//       <div className="flex gap-3">
//         <Button
//           variant="outline"
//           onClick={onBack}
//           className="flex-1"
//           disabled={loading}
//           aria-label="Back to previous step"
//         >
//           Back
//         </Button>
//         <Button
//           onClick={handlePurchase}
//           className="flex-1 bg-[#123962] hover:bg-[#90A5FB] text-white"
//           disabled={loading}
//           aria-disabled={loading}
//         >
//           {loading ? 'Purchasing...' : 'Complete Purchase'}
//         </Button>
//       </div>
//     </div>
//   );
// }





// import React, { useState, useEffect } from 'react';
// import { DollarSign, ArrowRight, Box } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent } from '@/components/ui/card';

// interface Step4Props {
//   project: { name: string };
//   calculation: { tokensDesired: number; finalTotal: number } | null;
//   loading: boolean;
//   onPurchase: (investorPrivateKey: string, investorWalletAddress: string) => Promise<void>;
//   onNext: () => void;
//   onBack: () => void;
//   formatCurrency: (amount: number) => string;
//   investorPrivateKey: string;
//   investorWalletAddress: string;
//   step: number;
// }

// function Step4PurchaseAnimation() {
//   return (
//     <div className="text-center mb-6 space-y-2">
//       <div className="flex items-center justify-center space-x-8">
//         <div className="flex flex-col items-center">
//           <DollarSign className="h-12 w-12 text-green-600 animate-bounce-slow" />
//           <span className="mt-1 font-semibold">HBAR</span>
//         </div>
//         <ArrowRight className="h-8 w-8 text-gray-500 animate-pulse" />
//         <div className="flex flex-col items-center">
//           <Box className="h-12 w-12 text-yellow-500 animate-bounce-slow delay-200" />
//           <span className="mt-1 font-semibold">Tokens</span>
//         </div>
//       </div>
//       <p className="text-gray-600 mt-4">Ready to complete your investment</p>

//       <style jsx>{`
//         @keyframes bounceSlow {
//           0%, 100% { transform: translateY(0); }
//           50% { transform: translateY(-10px); }
//         }
//         .animate-bounce-slow {
//           animation: bounceSlow 2s ease-in-out infinite;
//         }
//       `}</style>
//     </div>
//   );
// }

// export default function Step4Purchase({
//   project,
//   calculation,
//   loading,
//   onPurchase,
//   onNext,
//   onBack,
//   formatCurrency,
//   investorPrivateKey,
//   investorWalletAddress,
//   step,
// }: Step4Props) {
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [isPending, setIsPending] = useState(false);

//   useEffect(() => {
//     if (step !== 4) {
//       setIsPending(false);
//       setErrorMessage(null);
//     }
//   }, [step]);

//   if (!calculation) {
//     return (
//       <div className="text-center p-6">
//         <p className="text-gray-600">No purchase details available.</p>
//         <Button onClick={onBack}>Back</Button>
//       </div>
//     );
//   }

//   const handlePurchase = async () => {
//     setErrorMessage(null);
//     setIsPending(false);
//     try {
//       await onPurchase(investorPrivateKey, investorWalletAddress);
//       setIsPending(true);
//       // Manually advance step after purchase success
//       onNext();
//     } catch (err: any) {
//       setErrorMessage(err?.message || 'Purchase failed. Please try again.');
//       setIsPending(false);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <Step4PurchaseAnimation />

//       <Card>
//         <CardContent className="p-4">
//           <h4 className="font-semibold mb-3">Investment Summary</h4>
//           <div className="space-y-2">
//             <div className="flex justify-between">
//               <span>Project:</span>
//               <span className="font-medium">{project.name}</span>
//             </div>
//             <div className="flex justify-between">
//               <span>Tokens to purchase:</span>
//               <span className="font-medium">{calculation.tokensDesired}</span>
//             </div>
//             <div className="flex justify-between">
//               <span>Total cost:</span>
//               <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
//             </div>
//           </div>
//         </CardContent>
//       </Card>

//       {errorMessage && (
//         <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-center">
//           {errorMessage}
//         </div>
//       )}

//       {isPending && (
//         <p className="text-center text-yellow-600 font-medium">
//           Purchase pending startup approval...
//         </p>
//       )}

//       <div className="flex gap-3">
//         <Button
//           variant="outline"
//           onClick={onBack}
//           className="flex-1"
//           disabled={loading || isPending}
//           aria-label="Back to previous step"
//         >
//           Back
//         </Button>
//         <Button
//           onClick={handlePurchase}
//           className="flex-1 bg-[#123962] hover:bg-[#90A5FB] text-white"
//           disabled={loading || isPending}
//           aria-disabled={loading || isPending}
//         >
//           {(loading || isPending) ? 'Processing...' : 'Complete Purchase'}
//         </Button>
//       </div>
//     </div>
//   );
// }

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ArrowRight, 
  Box, 
  ArrowLeft,
  CheckCircle,
  Sparkles,
  Zap,
  TrendingUp,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Step4Props {
  project: { name: string };
  calculation: { tokensDesired: number; finalTotal: number } | null;
  loading: boolean;
  onPurchase: (investorPrivateKey: string, investorWalletAddress: string) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  formatCurrency: (amount: number) => string;
  investorPrivateKey: string;
  investorWalletAddress: string;
  step: number;
}

function Step4PurchaseAnimation() {
  return (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center gap-8">
        {/* HBAR Icon */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg animate-float">
              <DollarSign className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
              <Zap className="h-3 w-3 text-white" />
            </div>
          </div>
          <Badge className="mt-3 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
            HBAR
          </Badge>
        </div>

        {/* Animated Arrow */}
        <div className="relative">
          <ArrowRight className="h-12 w-12 text-[#90A5FB] animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-[#90A5FB]/10 rounded-full animate-ping" />
          </div>
        </div>

        {/* Token Icon */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-[#123962] to-[#90A5FB] rounded-2xl flex items-center justify-center shadow-lg animate-float-delay">
              <Box className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#90A5FB] rounded-full flex items-center justify-center shadow-md">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
          </div>
          <Badge className="mt-3 bg-[#90A5FB]/10 text-[#123962] border-[#90A5FB]/20">
            Tokens
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-gray-900 font-medium">Ready to Complete Your Investment</p>
        <p className="text-sm text-gray-600">Secure blockchain transaction powered by Hedera</p>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes floatDelay {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delay {
          animation: floatDelay 3s ease-in-out infinite 0.5s;
        }
      `}</style>
    </div>
  );
}

export default function Step4Purchase({
  project,
  calculation,
  loading,
  onPurchase,
  onNext,
  onBack,
  formatCurrency,
  investorPrivateKey,
  investorWalletAddress,
  step,
}: Step4Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (step !== 4) {
      setIsPending(false);
      setErrorMessage(null);
    }
  }, [step]);

  if (!calculation) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent mb-2">
            No Purchase Details Available
          </h3>
          <p className="text-gray-600">
            Unable to load purchase information. Please try again.
          </p>
        </div>
        <Button 
          onClick={onBack}
          variant="outline"
          className="w-full border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }

  const handlePurchase = async () => {
    setErrorMessage(null);
    setIsPending(false);
    try {
      await onPurchase(investorPrivateKey, investorWalletAddress);
      setIsPending(true);
      // Manually advance step after purchase success
      onNext();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Purchase failed. Please try again.');
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section with Animation */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#123962] to-[#90A5FB] rounded-2xl flex items-center justify-center shadow-lg">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent mb-2">
          Complete Your Investment
        </h2>
        <p className="text-gray-600">
          Review and confirm your purchase details
        </p>
      </div>

      {/* Animation Component */}
      <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-200 rounded-xl shadow-sm">
        <CardContent className="p-8">
          <Step4PurchaseAnimation />
        </CardContent>
      </Card>

      {/* Investment Summary Card */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#123962]/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-[#123962]" />
            </div>
            <CardTitle className="font-semibold text-gray-900">
              Investment Summary
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {/* Project Name */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-br from-purple-50/50 to-violet-50/30 border border-purple-100 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-500/10 rounded flex items-center justify-center">
                <Box className="h-3 w-3 text-purple-600" />
              </div>
              <span className="text-sm text-gray-700">Project</span>
            </div>
            <span className="font-semibold text-gray-900">{project.name}</span>
          </div>

          {/* Tokens to Purchase */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500/10 rounded flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-blue-600" />
              </div>
              <span className="text-sm text-gray-700">Tokens to Purchase</span>
            </div>
            <span className="font-semibold text-gray-900">{calculation.tokensDesired}</span>
          </div>

          {/* Total Cost */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50/50 to-green-50/30 border-2 border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="font-semibold text-gray-900">Total Cost</span>
            </div>
            <span className="text-xl font-semibold text-emerald-600">
              {formatCurrency(calculation.finalTotal)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {errorMessage && (
        <Card className="bg-gradient-to-br from-red-50/50 to-rose-50/30 border border-red-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-red-900 text-sm mb-1">Purchase Failed</h5>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending State */}
      {isPending && (
        <Card className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-amber-600 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-amber-900 text-sm">
                  Purchase pending startup approval...
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  This may take a few moments. Please wait.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h5 className="font-semibold text-gray-900 text-sm mb-1">Secure Transaction</h5>
              <p className="text-xs text-gray-700">
                Your investment will be processed securely on the Hedera blockchain. 
                You'll receive a confirmation once the transaction is complete.
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
          disabled={loading || isPending}
          className="border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
          aria-label="Back to previous step"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handlePurchase}
          disabled={loading || isPending}
          className="bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#123962]/90 hover:to-[#90A5FB]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          aria-disabled={loading || isPending}
        >
          {(loading || isPending) ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Complete Purchase
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
