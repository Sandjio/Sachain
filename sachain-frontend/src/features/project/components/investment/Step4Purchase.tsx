// src/features/project/components/investment-steps/Step4Purchase.tsx
import { DollarSign } from 'lucide-react';
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

export default function Step4Purchase({
  project,
  calculation,
  loading,
  onPurchase,
  onNext,
  onBack,
  formatCurrency,
}: Step4Props) {
  const handlePurchase = async () => {
    try {
      await onPurchase();
      onNext();
    } catch {
      // handle errors via hook
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <DollarSign className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Purchase Tokens</h3>
        <p className="text-gray-600">Ready to complete your investment</p>
      </div>

      {calculation && (
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
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={loading} aria-label="Back to previous step">
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
