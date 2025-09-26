// import { useEffect } from 'react';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Card, CardContent } from '@/components/ui/card';
// import { Progress } from '@/components/ui/progress';
// import { useInvestment } from '../hook/useInvestment';
// import {
//   X,
//   Calculator,
//   Wallet,
//   CreditCard,
//   ArrowRight,
//   CheckCircle,
//   AlertTriangle,
//   DollarSign
// } from 'lucide-react';

// interface InvestmentFlowProps {
//   onClose: () => void;
//   project: {
//     projectId: string;
//     name: string;
//     pricePerStock: number;
//     stockSupply: number;
//     category: string;
//     coverImageUrl?: string;
//   };
//   onSuccess?: () => void;
// }

// export function InvestmentFlow({ onClose, project, onSuccess }: InvestmentFlowProps) {
//   const {
//     step,
//     calculation,
//     walletBalance,
//     orangeMoneyBalance,
//     loading,
//     error,
//     startInvestment,
//     updateTokenAmount,
//     nextStep,
//     prevStep,
//     resetInvestment,
//     checkWalletBalance,
//     checkOrangeMoneyBalance,
//     processOrangeMoneyPayment,
//     purchaseTokens,
//   } = useInvestment();

//   useEffect(() => {
//     startInvestment(project.projectId, project.name, project.pricePerStock);
//     return () => {
//       resetInvestment();
//     };
//   }, [project, startInvestment, resetInvestment]);

//   const handleClose = () => {
//     resetInvestment();
//     onClose();
//   };

//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 2,
//     }).format(amount);
//   };

//   const getStepTitle = () => {
//     switch (step) {
//       case 1: return 'Calculate Investment';
//       case 2: return 'Check Balances';
//       case 3: return 'Orange Money Payment';
//       case 4: return 'Purchase Tokens';
//       case 5: return 'Investment Complete';
//       default: return 'Invest in Project';
//     }
//   };

//   return (
//     <div className="p-6 bg-white rounded-lg max-w-4xl mx-auto shadow-md">
//       {/* Header */}
//       <div className="flex items-center justify-between mb-6 border-b pb-3">
//         <div>
//           <h2 className="text-xl font-bold text-gray-900">{getStepTitle()}</h2>
//           <p className="text-sm text-gray-600">{project.name}</p>
//         </div>
//         <button
//           onClick={handleClose}
//           className="text-gray-500 hover:text-gray-700"
//           disabled={loading}
//           aria-label="Close investment flow"
//         >
//           <X className="h-5 w-5" />
//         </button>
//       </div>

//       {/* Progress Indicator */}
//       <div className="mb-6">
//         <div className="flex items-center justify-between mb-2">
//           <span className="text-sm text-gray-600">Step {step} of 5</span>
//           <span className="text-sm text-gray-600">{(step / 5 * 100).toFixed(0)}%</span>
//         </div>
//         <Progress value={(step / 5) * 100} className="h-2" />
//       </div>

//       {/* Error Display */}
//       {error && (
//         <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700">
//           <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
//           <p className="text-sm">{error}</p>
//         </div>
//       )}

//       {/* Step Content */}
//       <div>
//         {/* Step 1: Calculate Investment */}
//         {step === 1 && (
//           <Step1Calculator
//             project={project}
//             calculation={calculation}
//             onUpdateTokens={updateTokenAmount}
//             onNext={nextStep}
//             formatCurrency={formatCurrency}
//           />
//         )}

//         {/* Step 2: Check Balances */}
//         {step === 2 && (
//           <Step2Balances
//             calculation={calculation}
//             walletBalance={walletBalance}
//             orangeMoneyBalance={orangeMoneyBalance}
//             loading={loading}
//             onCheckWallet={checkWalletBalance}
//             onCheckOrangeMoney={checkOrangeMoneyBalance}
//             onNext={nextStep}
//             onBack={prevStep}
//             formatCurrency={formatCurrency}
//           />
//         )}

//         {/* Step 3: Orange Money Payment */}
//         {step === 3 && (
//           <Step3Payment
//             calculation={calculation}
//             orangeMoneyBalance={orangeMoneyBalance}
//             loading={loading}
//             onProcessPayment={processOrangeMoneyPayment}
//             onNext={nextStep}
//             onBack={prevStep}
//             formatCurrency={formatCurrency}
//           />
//         )}

//         {/* Step 4: Purchase Tokens */}
//         {step === 4 && (
//           <Step4Purchase
//             project={project}
//             calculation={calculation}
//             loading={loading}
//             onPurchase={purchaseTokens}
//             onNext={nextStep}
//             onBack={prevStep}
//             formatCurrency={formatCurrency}
//           />
//         )}

//         {/* Step 5: Success */}
//         {step === 5 && (
//           <Step5Success
//             project={project}
//             calculation={calculation}
//             onClose={handleClose}
//             onSuccess={onSuccess}
//             formatCurrency={formatCurrency}
//           />
//         )}
//       </div>
//     </div>
//   );
// }

// // Step 1: Calculator component
// function Step1Calculator({ project, calculation, onUpdateTokens, onNext, formatCurrency }: any) {
//   const handleTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const tokens = parseFloat(e.target.value) || 0;
//     if (tokens >= 0.1 && tokens <= project.stockSupply) {
//       onUpdateTokens(tokens);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="text-center">
//         <Calculator className="h-12 w-12 text-blue-600 mx-auto mb-4" />
//         <h3 className="text-lg font-semibold mb-2">How many tokens do you want to buy?</h3>
//         <p className="text-gray-600">Available: {project.stockSupply} tokens</p>
//       </div>

//       <div className="space-y-4">
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Number of tokens (minimum 0.1)
//           </label>
//           <Input
//             type="number"
//             step="0.1"
//             min="0.1"
//             max={project.stockSupply}
//             value={calculation?.tokensDesired || 1}
//             onChange={handleTokensChange}
//             className="text-center text-lg"
//           />
//         </div>

//         {calculation && (
//           <Card>
//             <CardContent className="p-4">
//               <div className="space-y-2">
//                 <div className="flex justify-between">
//                   <span>Price per token:</span>
//                   <span className="font-medium">{formatCurrency(calculation.pricePerToken)}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Subtotal:</span>
//                   <span className="font-medium">{formatCurrency(calculation.totalCost)}</span>
//                 </div>
//                 <div className="flex justify-between text-sm text-gray-600">
//                   <span>Orange Money fee (2%):</span>
//                   <span>{formatCurrency(calculation.orangeMoneyFee)}</span>
//                 </div>
//                 <div className="flex justify-between text-lg font-bold border-t pt-2">
//                   <span>Total:</span>
//                   <span>{formatCurrency(calculation.finalTotal)}</span>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         )}
//       </div>

//       <Button
//         onClick={onNext}
//         className="w-full bg-[#123962] hover:bg-[#90A5FB] text-white"
//         disabled={!calculation || calculation.tokensDesired < 0.1}
//       >
//         Continue to Payment
//         <ArrowRight className="h-4 w-4 ml-2" />
//       </Button>
//     </div>
//   );
// }

// // Step 2: Balances component
// function Step2Balances({ calculation, walletBalance, orangeMoneyBalance, loading, onCheckWallet, onCheckOrangeMoney, onNext, onBack, formatCurrency }: any) {
//   const needsTopUp = calculation && walletBalance < calculation.finalTotal;

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
//               Check Balance
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
//         >
//           {needsTopUp ? 'Top Up Wallet' : 'Proceed to Purchase'}
//         </Button>
//       </div>
//     </div>
//   );
// }

// // Step 3: Orange Money Payment component
// function Step3Payment({ calculation, orangeMoneyBalance, loading, onProcessPayment, onNext, onBack, formatCurrency }: any) {
//   const handlePayment = async () => {
//     if (!calculation) return;

//     try {
//       await onProcessPayment(calculation.finalTotal);
//       onNext();
//     } catch (error) {
//       // Error handled by hook
//     }
//   };

//   const canPay = calculation && orangeMoneyBalance >= calculation.finalTotal;

//   return (
//     <div className="space-y-6">
//       <div className="text-center">
//         <CreditCard className="h-12 w-12 text-orange-600 mx-auto mb-4" />
//         <h3 className="text-lg font-semibold mb-2">Orange Money Payment</h3>
//         <p className="text-gray-600">Processing payment to your wallet</p>
//       </div>

//       {calculation && (
//         <Card>
//           <CardContent className="p-4">
//             <div className="space-y-2">
//               <div className="flex justify-between">
//                 <span>Orange Money Balance:</span>
//                 <span className="font-medium">{formatCurrency(orangeMoneyBalance)}</span>
//               </div>
//               <div className="flex justify-between">
//                 <span>Payment Amount:</span>
//                 <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
//               </div>
//               <div className="flex justify-between text-sm text-gray-600">
//                 <span>Remaining after payment:</span>
//                 <span>{formatCurrency(orangeMoneyBalance - calculation.finalTotal)}</span>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       {!canPay && (
//         <div className="p-3 bg-red-50 border border-red-200 rounded-md">
//           <div className="flex items-center">
//             <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
//             <p className="text-sm text-red-700">
//               Insufficient Orange Money balance. Please top up your Orange Money account.
//             </p>
//           </div>
//         </div>
//       )}

//       <div className="flex gap-3">
//         <Button variant="outline" onClick={onBack} className="flex-1" disabled={loading}>
//           Back
//         </Button>
//         <Button
//           onClick={handlePayment}
//           className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
//           disabled={loading || !canPay}
//         >
//           {loading ? 'Processing...' : 'Pay with Orange Money'}
//         </Button>
//       </div>
//     </div>
//   );
// }

// // Step 4: Purchase Tokens component
// function Step4Purchase({ project, calculation, loading, onPurchase, onNext, onBack, formatCurrency }: any) {
//   const handlePurchase = async () => {
//     try {
//       await onPurchase();
//       onNext();
//     } catch (error) {
//       // Error handled by hook
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="text-center">
//         <DollarSign className="h-12 w-12 text-green-600 mx-auto mb-4" />
//         <h3 className="text-lg font-semibold mb-2">Purchase Tokens</h3>
//         <p className="text-gray-600">Ready to complete your investment</p>
//       </div>

//       {calculation && (
//         <Card>
//           <CardContent className="p-4">
//             <h4 className="font-semibold mb-3">Investment Summary</h4>
//             <div className="space-y-2">
//               <div className="flex justify-between">
//                 <span>Project:</span>
//                 <span className="font-medium">{project.name}</span>
//               </div>
//               <div className="flex justify-between">
//                 <span>Tokens to purchase:</span>
//                 <span className="font-medium">{calculation.tokensDesired}</span>
//               </div>
//               <div className="flex justify-between">
//                 <span>Total cost:</span>
//                 <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       <div className="flex gap-3">
//         <Button variant="outline" onClick={onBack} className="flex-1" disabled={loading}>
//           Back
//         </Button>
//         <Button
//           onClick={handlePurchase}
//           className="flex-1 bg-[#123962] hover:bg-[#90A5FB] text-white"
//           disabled={loading}
//         >
//           {loading ? 'Purchasing...' : 'Complete Purchase'}
//         </Button>
//       </div>
//     </div>
//   );
// }

// // Step 5: Success component
// function Step5Success({ project, calculation, onClose, onSuccess, formatCurrency }: any) {
//   const handleFinish = () => {
//     onSuccess?.();
//     onClose();
//   };

//   return (
//     <div className="space-y-6 text-center">
//       <div>
//         <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
//         <h3 className="text-xl font-semibold text-green-600 mb-2">Investment Successful!</h3>
//         <p className="text-gray-600">Your tokens have been purchased and added to your portfolio</p>
//       </div>

//       {calculation && (
//         <Card>
//           <CardContent className="p-4">
//             <div className="space-y-2">
//               <div className="flex justify-between">
//                 <span>Tokens purchased:</span>
//                 <span className="font-bold text-green-600">{calculation.tokensDesired}</span>
//               </div>
//               <div className="flex justify-between">
//                 <span>Total invested:</span>
//                 <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       <Button
//         onClick={handleFinish}
//         className="w-full bg-[#123962] hover:bg-[#90A5FB] text-white"
//       >
//         View Portfolio
//       </Button>
//     </div>
//   );
// }

// // src/features/project/components/InvestmentFlow.tsx
// import { useEffect } from 'react';
// import { Progress } from '@/components/ui/progress';
// import { useInvestment } from '../hook/useInvestment';
// import { X } from 'lucide-react';
// import Step1Calculator from './investment/Step1Calculator';
// import Step2Balances from './investment/Step2Balances';
// import Step3Payment from './investment/Step3Payment';
// import Step4Purchase from './investment/Step4Purchase';
// import Step5Success from './investment/Step5Success';

// interface InvestmentFlowProps {
//   onClose: () => void;
//   project: {
//     projectId: string;
//     name: string;
//     pricePerStock: number;
//     stockSupply: number;
//     category: string;
//     coverImageUrl?: string;
//   };
//   onSuccess?: () => void;
// }

// export function InvestmentFlow({ onClose, project, onSuccess }: InvestmentFlowProps) {
//   const {
//     step,
//     error,
//     loading,
//     calculation,
//     walletBalance,
//     orangeMoneyBalance,
//     startInvestment,
//     resetInvestment,
//     updateTokenAmount,
//     nextStep,
//     prevStep,
//     checkWalletBalance,
//     checkOrangeMoneyBalance,
//     processOrangeMoneyPayment,
//     purchaseTokens,
//   } = useInvestment();

//   useEffect(() => {
//     startInvestment(project.projectId, project.name, project.pricePerStock);
//     return () => resetInvestment();
//   }, [project, startInvestment, resetInvestment]);

//   const handleClose = () => {
//     resetInvestment();
//     onClose();
//   };

//   const formatCurrency = (amount: number) =>
//     new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 2,
//     }).format(amount);

//   const getStepTitle = () => {
//     switch (step) {
//       case 1: return 'Calculate Investment';
//       case 2: return 'Check Balances';
//       case 3: return 'Orange Money Payment';
//       case 4: return 'Purchase Tokens';
//       case 5: return 'Investment Complete';
//       default: return 'Invest in Project';
//     }
//   };

//   return (
//     <div className="p-6 bg-white rounded-lg max-w-4xl mx-auto shadow-md">
//       {/* Header */}
//       <div className="flex items-center justify-between mb-6 border-b pb-3">
//         <div>
//           <h2 className="text-xl font-bold text-gray-900">{getStepTitle()}</h2>
//           <p className="text-sm text-gray-600">{project.name}</p>
//         </div>
//         <button
//           onClick={handleClose}
//           className="text-gray-500 hover:text-gray-700"
//           disabled={loading}
//           aria-label="Close investment flow"
//         >
//           <X className="h-5 w-5" />
//         </button>
//       </div>

//       {/* Progress Indicator */}
//       <div className="mb-6">
//         <div className="flex items-center justify-between mb-2">
//           <span className="text-sm text-gray-600">Step {step} of 5</span>
//           <span className="text-sm text-gray-600">{(step / 5 * 100).toFixed(0)}%</span>
//         </div>
//         <Progress value={(step / 5) * 100} className="h-2" />
//       </div>

//       {/* Error Display */}
//       {error && (
//         <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700" role="alert">
//           <p className="text-sm">{error}</p>
//         </div>
//       )}

//       {/* Step Components Rendering */}
//       {step === 1 && (
//         <Step1Calculator
//           project={project}
//           calculation={calculation}
//           onUpdateTokens={updateTokenAmount}
//           onNext={nextStep}
//           formatCurrency={formatCurrency}
//         />
//       )}

//       {step === 2 && (
//         <Step2Balances
//           calculation={calculation}
//           walletBalance={walletBalance}
//           orangeMoneyBalance={orangeMoneyBalance}
//           loading={loading}
//           onCheckWallet={checkWalletBalance}
//           onCheckOrangeMoney={checkOrangeMoneyBalance}
//           onNext={nextStep}
//           onBack={prevStep}
//           formatCurrency={formatCurrency}
//         />
//       )}

//       {step === 3 && (
//         <Step3Payment
//           calculation={calculation}
//           orangeMoneyBalance={orangeMoneyBalance}
//           loading={loading}
//           onProcessPayment={async (amount: number) => { await processOrangeMoneyPayment(amount); }}
//           onNext={nextStep}
//           onBack={prevStep}
//           formatCurrency={formatCurrency}
//         />
//       )}

//       {step === 4 && (
//         <Step4Purchase
//           project={project}
//           calculation={calculation}
//           loading={loading}
//           onPurchase={purchaseTokens}
//           onNext={nextStep}
//           onBack={prevStep}
//           formatCurrency={formatCurrency}
//         />
//       )}

//       {step === 5 && (
//         <Step5Success
//           project={project}
//           calculation={calculation}
//           onClose={handleClose}
//           onSuccess={onSuccess}
//           formatCurrency={formatCurrency}
//         />
//       )}
//     </div>
//   );
// }

// src/features/project/components/InvestmentFlow.tsx
import { useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { useInvestment } from '../hook/useInvestment';
import { X } from 'lucide-react';
import Step1Calculator from './investment/Step1Calculator';
import Step2Balances from './investment/Step2Balances'; // updated step 2 with integrated wallet/recharge
import Step3Payment from './investment/Step3Payment';
import Step4Purchase from './investment/Step4Purchase';
import Step5Success from './investment/Step5Success';
import { useWalletStore } from '@/features/wallet/store/walletStore';

interface InvestmentFlowProps {
  onClose: () => void;
  project: {
    projectId: string;
    name: string;
    pricePerStock: number;
    stockSupply: number;
    category: string;
    coverImageUrl?: string;
  };
  onSuccess?: () => void;
}

export function InvestmentFlow({
  onClose,
  project,
  onSuccess,
}: InvestmentFlowProps) {
  const {
    step,
    error,
    loading,
    calculation,
    walletBalance,
    orangeMoneyBalance,
    startInvestment,
    resetInvestment,
    updateTokenAmount,
    nextStep,
    prevStep,
    processOrangeMoneyPayment,
    purchaseTokens,
  } = useInvestment();

  const walletAddress = useWalletStore((state) => state.walletAddress);

  useEffect(() => {
    startInvestment(project.projectId, project.name, project.pricePerStock);
    return () => resetInvestment();
  }, [project, startInvestment, resetInvestment]);

  const handleClose = () => {
    resetInvestment();
    onClose();
  };

  const formatCurrency = (amount: number | null) =>
    amount === null
      ? '-'
      : new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
        }).format(amount);

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Calculate Investment';
      case 2:
        return 'Connect Wallet & Check Balances';
      case 3:
        return 'Summary & Vailidation';
      case 4:
        return 'Purchase Tokens';
      case 5:
        return 'Investment Complete';
      default:
        return 'Invest in Project';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg max-w-4xl mx-auto shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b pb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{getStepTitle()}</h2>
          <p className="text-sm text-gray-600">{project.name}</p>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-700"
          disabled={loading}
          aria-label="Close investment flow"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Step {step} of 5</span>
          <span className="text-sm text-gray-600">{(step / 5) * 100}%</span>
        </div>
        <Progress value={(step / 5) * 100} className="h-2" />
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700"
          role="alert"
        >
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Step Rendering */}
      {step === 1 && (
        <Step1Calculator
          project={project}
          calculation={calculation}
          onUpdateTokens={updateTokenAmount}
          onNext={nextStep}
          formatCurrency={formatCurrency}
        />
      )}

      {step === 2 && walletAddress && (
        <Step2Balances
          calculation={calculation}
          walletBalance={walletBalance}
          orangeMoneyBalance={orangeMoneyBalance}
          loading={loading}
          //onCheckWallet={checkWalletBalance}
          //onCheckOrangeMoney={checkOrangeMoneyBalance}
          onNext={nextStep}
          onBack={prevStep}
          formatCurrency={formatCurrency}
        />
      )}

      {step === 3 && (
        <Step3Payment
          calculation={calculation}
          project={project} // Make sure you pass the full project object here
          onNext={nextStep}
          onBack={prevStep}
          formatCurrency={formatCurrency}
        />
      )}

      {step === 4 && (
        <Step4Purchase
          project={project}
          calculation={calculation}
          loading={loading}
          onPurchase={purchaseTokens}
          onNext={nextStep}
          onBack={prevStep}
          formatCurrency={formatCurrency}
        />
      )}

      {step === 5 && (
        <Step5Success
          project={project}
          calculation={calculation}
          onClose={handleClose}
          onSuccess={onSuccess}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}
//
