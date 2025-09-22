// src/features/project/components/investment-steps/Step3Payment.tsx
import { CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Step3Props {
  calculation: { finalTotal: number } | null;
  orangeMoneyBalance: number;
  loading: boolean;
  onProcessPayment: (amount: number) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  formatCurrency: (amount: number) => string;
}

export default function Step3Payment({
  calculation,
  orangeMoneyBalance,
  loading,
  onProcessPayment,
  onNext,
  onBack,
  formatCurrency,
}: Step3Props) {
  const handlePayment = async () => {
    if (!calculation) return;
    try {
      await onProcessPayment(calculation.finalTotal);
      onNext();
    } catch {
      // Handle errors via your hook
    }
  };

  const canPay = calculation ? orangeMoneyBalance >= calculation.finalTotal : false;

  return (
    <div className="space-y-6" aria-live="polite">
      <div className="text-center">
        <CreditCard className="h-12 w-12 text-orange-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Orange Money Payment</h3>
        <p className="text-gray-600">Processing payment to your wallet</p>
      </div>

      {calculation && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Orange Money Balance:</span>
                <span className="font-medium">{formatCurrency(orangeMoneyBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Amount:</span>
                <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Remaining after payment:</span>
                <span>{formatCurrency(orangeMoneyBalance - calculation.finalTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!canPay && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <p className="text-sm">
            Insufficient Orange Money balance. Please top up your Orange Money account.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={loading} aria-label="Back to previous step">
          Back
        </Button>
        <Button
          onClick={handlePayment}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          disabled={loading || !canPay}
          aria-disabled={loading || !canPay}
        >
          {loading ? 'Processing...' : 'Pay with Orange Money'}
        </Button>
      </div>
    </div>
  );
}
