// src/features/project/components/investment-steps/Step5Success.tsx
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Step5Props {
  project: { name: string };
  calculation: { tokensDesired: number; finalTotal: number } | null;
  onClose: () => void;
  onSuccess?: () => void;
  formatCurrency: (amount: number) => string;
}

export default function Step5Success({
  project,
  calculation,
  onClose,
  onSuccess,
  formatCurrency,
}: Step5Props) {
  const handleFinish = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <div className="space-y-6 text-center">
      <div>
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-green-600 mb-2">Investment Successful!</h3>
        <p className="text-gray-600">Your tokens have been purchased and added to your portfolio</p>
      </div>

      {calculation && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Tokens purchased:</span>
                <span className="font-bold text-green-600">{calculation.tokensDesired}</span>
              </div>
              <div className="flex justify-between">
                <span>Total invested:</span>
                <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleFinish}
        className="w-full bg-[#123962] hover:bg-[#90A5FB] text-white"
        aria-label="Finish and view portfolio"
      >
        View Portfolio
      </Button>
    </div>
  );
}
