// src/features/project/components/investment-steps/Step2Balances.tsx
import { Wallet, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Step2Props {
  calculation: any;
  walletBalance: number;
  orangeMoneyBalance: number;
  loading: boolean;
  onCheckWallet: () => void;
  onCheckOrangeMoney: () => void;
  onNext: () => void;
  onBack: () => void;
  formatCurrency: (amount: number) => string;
}

export default function Step2Balances({
  calculation,
  walletBalance,
  orangeMoneyBalance,
  loading,
  onCheckWallet,
  onCheckOrangeMoney,
  onNext,
  onBack,
  formatCurrency,
}: Step2Props) {
  const needsTopUp = calculation && walletBalance < calculation.finalTotal;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Wallet className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Check Your Balances</h3>
        <p className="text-gray-600">Ensure you have sufficient funds for this investment</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Wallet className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Wallet Balance</p>
            <p className="text-xl font-bold">{formatCurrency(walletBalance)}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onCheckWallet}
              loading={loading}
              className="mt-2 w-full"
            >
              Check Balance
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <CreditCard className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Orange Money</p>
            <p className="text-xl font-bold">{formatCurrency(orangeMoneyBalance)}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onCheckOrangeMoney}
              loading={loading}
              className="mt-2 w-full"
            >
              Recharge
            </Button>
          </CardContent>
        </Card>
      </div>

      {calculation && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">Investment Summary</h4>
            <div className="flex justify-between">
              <span>Total needed:</span>
              <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {needsTopUp && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-700">
              Insufficient wallet balance. You'll need to top up via Orange Money.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={onNext} 
          className="flex-1 bg-[#123962] hover:bg-[#90A5FB] text-white"
        >
          {needsTopUp ? 'Top Up Wallet' : 'Proceed to Purchase'}
        </Button>
      </div>
    </div>
  );
}
