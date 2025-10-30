import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { useWalletStore } from '@/features/wallet/store/walletStore';
import { useInvestment } from '../hook/useInvestment';
import Step1Calculator from './investment/Step1Calculator';
import Step2Balances from './investment/Step2Balances';
import Step3Payment from './investment/Step3Payment';
import Step4Purchase from './investment/Step4Purchase';
import Step5Success from './investment/Step5Success';
import { X } from 'lucide-react';

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
  const walletAddress = useWalletStore((state) => state.walletAddress || '');

  const {
    step,
    error,
    loading,
    calculation,
    startInvestment,
    resetInvestment,
    updateTokenAmount,
    nextStep,
    prevStep,
    purchaseTokens,
  } = useInvestment(); // No notifications param

  const [privateKey, setPrivateKey] = useState<string>('');

  useEffect(() => {
    startInvestment(project.projectId, project.name, project.pricePerStock);
    return () => resetInvestment();
  }, [project, startInvestment, resetInvestment]);

  const handleClose = () => {
    resetInvestment();
    onClose();
  };

  // You can manually advance step here after private key entered
  const handlePrivateKeySubmit = (key: string) => {
    setPrivateKey(key);
    nextStep(); // now advance manually since no notifications
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
          walletBalance={null}
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
          onNext={handlePrivateKeySubmit}
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
          onNext={nextStep} // manual step advancement here as well
          onBack={prevStep}
          formatCurrency={formatCurrency}
          investorPrivateKey={privateKey}
          investorWalletAddress={walletAddress}
          step={step}
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

export default InvestmentFlow;
