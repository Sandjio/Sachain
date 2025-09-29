// src/features/project/components/investment-steps/Step1Calculator.tsx
import { Calculator, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface Step1Props {
  project: { stockSupply: number };
  calculation: {
    tokensDesired: number;
    pricePerToken: number;
    totalCost: number;
    orangeMoneyFee: number;
    finalTotal: number;
  } | null;
  onUpdateTokens: (num: number) => void;
  onNext: () => void;
  formatCurrency: (n: number) => string;
}

export default function Step1Calculator({
  project,
  calculation,
  onUpdateTokens,
  onNext,
  formatCurrency,
}: Step1Props) {
  const handleTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let tokens = parseFloat(e.target.value);
    if (isNaN(tokens)) tokens = 0;
    tokens = Math.min(Math.max(tokens, 0.1), project.stockSupply);
    onUpdateTokens(tokens);
  };

  const isContinueDisabled =
    !calculation ||
    calculation.tokensDesired < 0.1 ||
    calculation.tokensDesired > project.stockSupply;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Calculator className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">How many tokens do you want to buy?</h3>
        <p className="text-gray-600">Available: {project.stockSupply} tokens</p>
      </div>

      <div className="space-y-4">
        <label htmlFor="tokens" className="block text-sm font-medium text-gray-700 mb-1">
          Number of tokens (minimum 0.1)
        </label>
        <Input
          id="tokens"
          type="number"
          step={0.1}
          min={0.1}
          max={project.stockSupply}
          value={calculation?.tokensDesired ?? 1}
          onChange={handleTokensChange}
          aria-describedby="tokenInputHelp"
          className="text-center text-lg"
        />
        <p id="tokenInputHelp" className="text-xs text-gray-500">
          Enter a value between 0.1 and {project.stockSupply}.
        </p>

        {calculation && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Price per token:</span>
                  <span className="font-medium">{formatCurrency(calculation.pricePerToken)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(calculation.totalCost)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Orange Money fee (2%):</span>
                  <span>{formatCurrency(calculation.orangeMoneyFee)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(calculation.finalTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Button
        onClick={onNext}
        className="w-full bg-[#123962] hover:bg-[#90A5FB] text-white"
        disabled={isContinueDisabled}
        aria-disabled={isContinueDisabled}
      >
        Continue to Payment
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
