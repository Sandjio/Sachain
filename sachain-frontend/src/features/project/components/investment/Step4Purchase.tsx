import React, { useState } from 'react';
import { DollarSign, ArrowRight, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Step4Props {
  project: { name: string };
  calculation: { tokensDesired: number; finalTotal: number } | null;
  loading: boolean;
  onPurchase: () => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  formatCurrency: (amount: number) => string;
}

function Step4PurchaseAnimation() {
  return (
    <div className="text-center mb-6 space-y-2">
      <div className="flex items-center justify-center space-x-8">
        {/* HBAR Icon */}
        <div className="flex flex-col items-center">
          <DollarSign className="h-12 w-12 text-green-600 animate-bounce-slow" />
          <span className="mt-1 font-semibold">HBAR</span>
        </div>

        {/* Arrow with pulse animation */}
        <ArrowRight className="h-8 w-8 text-gray-500 animate-pulse" />

        {/* Tokens Icon */}
        <div className="flex flex-col items-center">
          <Box className="h-12 w-12 text-yellow-500 animate-bounce-slow delay-200" />
          <span className="mt-1 font-semibold">Tokens</span>
        </div>
      </div>

      <p className="text-gray-600 mt-4">Ready to complete your investment</p>

      <style jsx>{`
        @keyframes bounceSlow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounceSlow 2s ease-in-out infinite;
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
}: Step4Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePurchase = async () => {
    setErrorMessage(null);
    try {
      await onPurchase();
      onNext();
    } catch (err: any) {
      // Handle or display error message here
      setErrorMessage(err?.message || "Purchase failed. Please try again.");
    }
  };

  if (!calculation) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-600">No purchase details available.</p>
        <Button onClick={onBack}>Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Step4PurchaseAnimation />

      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold mb-3">Investment Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Project:</span>
              <span className="font-medium">{project.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Tokens to purchase:</span>
              <span className="font-medium">{calculation.tokensDesired}</span>
            </div>
            <div className="flex justify-between">
              <span>Total cost:</span>
              <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-center">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
          disabled={loading}
          aria-label="Back to previous step"
        >
          Back
        </Button>
        <Button
          onClick={handlePurchase}
          className="flex-1 bg-[#123962] hover:bg-[#90A5FB] text-white"
          disabled={loading}
          aria-disabled={loading}
        >
          {loading ? 'Purchasing...' : 'Complete Purchase'}
        </Button>
      </div>
    </div>
  );
}
