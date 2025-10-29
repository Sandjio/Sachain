import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ApprovalSuccessProps {
  projectName: string;
  calculation: { tokensDesired: number; finalTotal: number };
  formatCurrency: (amount: number) => string;
  onFinish: () => void;
}

export default function ApprovalSuccess({
  projectName,
  calculation,
  formatCurrency,
  onFinish,
}: ApprovalSuccessProps) {
  return (
    <div className="text-center space-y-6">
      <CheckCircle className="mx-auto h-16 w-16 text-green-600 animate-bounce" />
      <h3 className="text-xl font-semibold text-green-600">
        Investment Approved!
      </h3>
      <p>Your investment has been approved and tokens transferred.</p>

      <Card>
        <CardContent>
          <div className="flex justify-between">
            <span>Tokens purchased:</span>
            <span className="font-bold text-green-600">
              {calculation.tokensDesired}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Total invested:</span>
            <span className="font-bold">
              {formatCurrency(calculation.finalTotal)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Project:</span>
            <span>{projectName}</span>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={onFinish}
        className="w-full bg-[#123962] hover:bg-[#90A5FB] text-white"
      >
        View Portfolio
      </Button>
    </div>
  );
}
