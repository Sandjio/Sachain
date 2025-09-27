


// // src/features/project/components/InvestmentFlow.tsx
// import { useEffect } from 'react';
// import { Progress } from '@/components/ui/progress';
// import { useInvestment } from '../hook/useInvestment';
// import { X } from 'lucide-react';
// import Step1Calculator from './investment/Step1Calculator';
// import Step2Balances from './investment/Step2Balances'; // updated step 2 with integrated wallet/recharge
// import Step3Payment from './investment/Step3Payment';
// import Step4Purchase from './investment/Step4Purchase';
// import Step5Success from './investment/Step5Success';
// import { useWalletStore } from '@/features/wallet/store/walletStore';

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

// export function InvestmentFlow({
//   onClose,
//   project,
//   onSuccess,
// }: InvestmentFlowProps) {
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
//     processOrangeMoneyPayment,
//     purchaseTokens,
//   } = useInvestment();

//   const walletAddress = useWalletStore((state) => state.walletAddress);

//   useEffect(() => {
//     startInvestment(project.projectId, project.name, project.pricePerStock);
//     return () => resetInvestment();
//   }, [project, startInvestment, resetInvestment]);

//   const handleClose = () => {
//     resetInvestment();
//     onClose();
//   };

//   const formatCurrency = (amount: number | null) =>
//     amount === null
//       ? '-'
//       : new Intl.NumberFormat('en-US', {
//           style: 'currency',
//           currency: 'USD',
//           minimumFractionDigits: 2,
//         }).format(amount);

//   const getStepTitle = () => {
//     switch (step) {
//       case 1:
//         return 'Calculate Investment';
//       case 2:
//         return 'Connect Wallet & Check Balances';
//       case 3:
//         return 'Summary & Vailidation';
//       case 4:
//         return 'Purchase Tokens';
//       case 5:
//         return 'Investment Complete';
//       default:
//         return 'Invest in Project';
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
//           <span className="text-sm text-gray-600">{(step / 5) * 100}%</span>
//         </div>
//         <Progress value={(step / 5) * 100} className="h-2" />
//       </div>

//       {/* Error Display */}
//       {error && (
//         <div
//           className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700"
//           role="alert"
//         >
//           <p className="text-sm">{error}</p>
//         </div>
//       )}

//       {/* Step Rendering */}
//       {step === 1 && (
//         <Step1Calculator
//           project={project}
//           calculation={calculation}
//           onUpdateTokens={updateTokenAmount}
//           onNext={nextStep}
//           formatCurrency={formatCurrency}
//         />
//       )}

//       {step === 2 && walletAddress && (
//         <Step2Balances
//           calculation={calculation}
//           walletBalance={walletBalance}
//           orangeMoneyBalance={orangeMoneyBalance}
//           loading={loading}
//           //onCheckWallet={checkWalletBalance}
//           //onCheckOrangeMoney={checkOrangeMoneyBalance}
//           onNext={nextStep}
//           onBack={prevStep}
//           formatCurrency={formatCurrency}
//         />
//       )}

//       {step === 3 && (
//         <Step3Payment
//           calculation={calculation}
//           project={project} // Make sure you pass the full project object here
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
// 


// src/features/project/components/InvestmentFlow.tsx
import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { useInvestment } from '../hook/useInvestment';
import { X } from 'lucide-react';
import Step1Calculator from './investment/Step1Calculator';
import Step2Balances from './investment/Step2Balances';
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
    startInvestment,
    resetInvestment,
    updateTokenAmount,
    nextStep,
    prevStep,
    purchaseTokens,
  } = useInvestment();

  const walletAddress = useWalletStore((state) => state.walletAddress);

  // Store private key obtained from Step3Payment
  const [privateKey, setPrivateKey] = useState<string>('');

  useEffect(() => {
    startInvestment(project.projectId, project.name, project.pricePerStock);
    return () => resetInvestment();
  }, [project, startInvestment, resetInvestment]);

  const handleClose = () => {
    resetInvestment();
    onClose();
  };

  // This function will be passed to Step3Payment,
  // receives the privateKey input when user enters it
  const handlePrivateKeySubmit = (key: string) => {
    setPrivateKey(key);
    nextStep(); // move to Step 4 after private key supplied
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
        return 'Summary & Validation';
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
          loading={loading}
          onNext={nextStep}
          onBack={prevStep}
          formatCurrency={formatCurrency}
        />
      )}

      {step === 3 && (
        <Step3Payment
          calculation={calculation}
          project={project}
          onNext={handlePrivateKeySubmit} // receive private key here before next step
          onBack={prevStep}
          formatCurrency={formatCurrency}
        />
      )}

      {step === 4 && privateKey && walletAddress && (
        <Step4Purchase
          project={project}
          calculation={calculation}
          loading={loading}
          onPurchase={(privKey, walletAddr) =>
            purchaseTokens(privKey, walletAddr)
          }
          onNext={nextStep}
          onBack={prevStep}
          formatCurrency={formatCurrency}
          investorPrivateKey={privateKey}
          investorWalletAddress={walletAddress}
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
