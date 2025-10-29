// // src/features/project/components/investment-steps/Step1Calculator.tsx
// import { Calculator, ArrowRight } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Card, CardContent } from '@/components/ui/card';

// interface Step1Props {
//   project: { stockSupply: number };
//   calculation: {
//     tokensDesired: number;
//     pricePerToken: number;
//     totalCost: number;
//     orangeMoneyFee: number;
//     finalTotal: number;
//   } | null;
//   onUpdateTokens: (num: number) => void;
//   onNext: () => void;
//   formatCurrency: (n: number) => string;
// }

// export default function Step1Calculator({
//   project,
//   calculation,
//   onUpdateTokens,
//   onNext,
//   formatCurrency,
// }: Step1Props) {
//   const handleTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     let tokens = parseFloat(e.target.value);
//     if (isNaN(tokens)) tokens = 0;
//     tokens = Math.min(Math.max(tokens, 0.1), project.stockSupply);
//     onUpdateTokens(tokens);
//   };

//   const isContinueDisabled =
//     !calculation ||
//     calculation.tokensDesired < 0.1 ||
//     calculation.tokensDesired > project.stockSupply;

//   return (
//     <div className="space-y-6">
//       <div className="text-center">
//         <Calculator className="h-12 w-12 text-blue-600 mx-auto mb-4" />
//         <h3 className="text-lg font-semibold mb-2">How many tokens do you want to buy?</h3>
//         <p className="text-gray-600">Available: {project.stockSupply} tokens</p>
//       </div>

//       <div className="space-y-4">
//         <label htmlFor="tokens" className="block text-sm font-medium text-gray-700 mb-1">
//           Number of tokens (minimum 0.1)
//         </label>
//         <Input
//           id="tokens"
//           type="number"
//           step={0.1}
//           min={0.1}
//           max={project.stockSupply}
//           value={calculation?.tokensDesired ?? 1}
//           onChange={handleTokensChange}
//           aria-describedby="tokenInputHelp"
//           className="text-center text-lg"
//         />
//         <p id="tokenInputHelp" className="text-xs text-gray-500">
//           Enter a value between 0.1 and {project.stockSupply}.
//         </p>

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
//         disabled={isContinueDisabled}
//         aria-disabled={isContinueDisabled}
//       >
//         Continue to Payment
//         <ArrowRight className="h-4 w-4 ml-2" />
//       </Button>
//     </div>
//   );
// }

// src/features/project/components/investment-steps/Step1Calculator.tsx
// import {
//   Calculator,
//   ArrowRight,
//   DollarSign,
//   Coins,
//   Receipt,
//   Sparkles,
//   Info
// } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Card, CardContent } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';

// interface Step1Props {
//   project: { stockSupply: number };
//   calculation: {
//     tokensDesired: number;
//     pricePerToken: number;
//     totalCost: number;
//     orangeMoneyFee: number;
//     finalTotal: number;
//   } | null;
//   onUpdateTokens: (num: number) => void;
//   onNext: () => void;
//   formatCurrency: (n: number) => string;
// }

// export default function Step1Calculator({
//   project,
//   calculation,
//   onUpdateTokens,
//   onNext,
//   formatCurrency,
// }: Step1Props) {
//   const handleTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     let tokens = parseFloat(e.target.value);
//     if (isNaN(tokens)) tokens = 0;
//     tokens = Math.min(Math.max(tokens, 0.1), project.stockSupply);
//     onUpdateTokens(tokens);
//   };

//   const isContinueDisabled =
//     !calculation ||
//     calculation.tokensDesired < 0.1 ||
//     calculation.tokensDesired > project.stockSupply;

//   return (
//     <div className="space-y-6">
//       {/* Header Section with Light Aesthetic */}
//       <div className="text-center">
//         <div className="flex items-center justify-center mb-4">
//           <div className="w-16 h-16 bg-gradient-to-br from-[#123962] to-[#90A5FB] rounded-2xl flex items-center justify-center shadow-lg">
//             <Calculator className="h-8 w-8 text-white" />
//           </div>
//         </div>
//         <h3 className="text-xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent mb-2">
//           How many tokens do you want to buy?
//         </h3>
//         <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">
//           <Coins className="h-3 w-3 mr-1" />
//           Available: {project.stockSupply} tokens
//         </Badge>
//       </div>

//       {/* Token Input Section */}
//       <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
//         <CardContent className="p-6 space-y-4">
//           <div className="flex items-center gap-2 mb-3">
//             <div className="w-8 h-8 bg-[#90A5FB]/10 rounded-lg flex items-center justify-center">
//               <Coins className="h-4 w-4 text-[#90A5FB]" />
//             </div>
//             <label htmlFor="tokens" className="font-medium text-gray-900">
//               Number of tokens
//             </label>
//           </div>

//           <Input
//             id="tokens"
//             type="number"
//             step={0.1}
//             min={0.1}
//             max={project.stockSupply}
//             value={calculation?.tokensDesired ?? 1}
//             onChange={handleTokensChange}
//             aria-describedby="tokenInputHelp"
//             className="text-center text-xl h-14 border-gray-200 focus:border-[#90A5FB] focus:ring-[#90A5FB]/20"
//           />

//           <div className="flex items-center gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
//             <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
//             <p id="tokenInputHelp" className="text-sm text-gray-600">
//               Enter a value between 0.1 and {project.stockSupply} tokens
//             </p>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Calculation Breakdown */}
//       {calculation && (
//         <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-xl shadow-sm">
//           <CardContent className="p-6">
//             <div className="flex items-center gap-2 mb-4">
//               <div className="w-8 h-8 bg-[#123962]/10 rounded-lg flex items-center justify-center">
//                 <Receipt className="h-4 w-4 text-[#123962]" />
//               </div>
//               <h4 className="font-semibold text-gray-900">Investment Breakdown</h4>
//             </div>

//             <div className="space-y-3">
//               {/* Price per token */}
//               <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
//                 <div className="flex items-center gap-2">
//                   <div className="w-6 h-6 bg-emerald-500/10 rounded flex items-center justify-center">
//                     <DollarSign className="h-3 w-3 text-emerald-600" />
//                   </div>
//                   <span className="text-sm text-gray-700">Price per token</span>
//                 </div>
//                 <span className="font-semibold text-gray-900">
//                   {formatCurrency(calculation.pricePerToken)}
//                 </span>
//               </div>

//               {/* Subtotal */}
//               <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
//                 <div className="flex items-center gap-2">
//                   <div className="w-6 h-6 bg-blue-500/10 rounded flex items-center justify-center">
//                     <Calculator className="h-3 w-3 text-blue-600" />
//                   </div>
//                   <span className="text-sm text-gray-700">Subtotal</span>
//                 </div>
//                 <span className="font-semibold text-gray-900">
//                   {formatCurrency(calculation.totalCost)}
//                 </span>
//               </div>

//               {/* Orange Money fee */}
//               <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
//                 <div className="flex items-center gap-2">
//                   <div className="w-6 h-6 bg-orange-500/10 rounded flex items-center justify-center">
//                     <Receipt className="h-3 w-3 text-orange-600" />
//                   </div>
//                   <span className="text-sm text-gray-600">Orange Money fee (2%)</span>
//                 </div>
//                 <span className="text-sm text-gray-700">
//                   {formatCurrency(calculation.orangeMoneyFee)}
//                 </span>
//               </div>

//               {/* Total */}
//               <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50/50 to-green-50/30 border border-emerald-200 rounded-lg mt-3">
//                 <div className="flex items-center gap-2">
//                   <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center">
//                     <Sparkles className="h-4 w-4 text-emerald-600" />
//                   </div>
//                   <span className="font-semibold text-gray-900">Total Amount</span>
//                 </div>
//                 <span className="text-xl font-semibold text-emerald-600">
//                   {formatCurrency(calculation.finalTotal)}
//                 </span>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       {/* Continue Button */}
//       <Button
//         onClick={onNext}
//         className="w-full bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#123962]/90 hover:to-[#90A5FB]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12"
//         disabled={isContinueDisabled}
//         aria-disabled={isContinueDisabled}
//       >
//         <Sparkles className="h-4 w-4 mr-2" />
//         Continue to Payment
//         <ArrowRight className="h-4 w-4 ml-2" />
//       </Button>
//     </div>
//   );
// }

// src/features/project/components/investment-steps/Step1Calculator.tsx
import {
  Calculator,
  ArrowRight,
  DollarSign,
  Coins,
  Receipt,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    // Parse as integer only
    let tokens = parseInt(e.target.value, 10);

    // Handle invalid input
    if (isNaN(tokens) || tokens < 1) {
      tokens = 1;
    }

    // Ensure tokens don't exceed available supply
    tokens = Math.min(tokens, project.stockSupply);

    onUpdateTokens(tokens);
  };

  const isContinueDisabled =
    !calculation ||
    calculation.tokensDesired < 1 ||
    calculation.tokensDesired > project.stockSupply;

  return (
    <div className="space-y-6">
      {/* Header Section with Light Aesthetic */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#123962] to-[#90A5FB] rounded-2xl flex items-center justify-center shadow-lg">
            <Calculator className="h-8 w-8 text-white" />
          </div>
        </div>
        <h3 className="text-xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent mb-2">
          How many tokens do you want to buy?
        </h3>
        <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">
          <Coins className="h-3 w-3 mr-1" />
          Available: {project.stockSupply} tokens
        </Badge>
      </div>

      {/* Token Input Section */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-[#90A5FB]/10 rounded-lg flex items-center justify-center">
              <Coins className="h-4 w-4 text-[#90A5FB]" />
            </div>
            <label htmlFor="tokens" className="font-medium text-gray-900">
              Number of tokens
            </label>
          </div>

          <Input
            id="tokens"
            type="number"
            step={1}
            min={1}
            max={project.stockSupply}
            value={calculation?.tokensDesired ?? 1}
            onChange={handleTokensChange}
            aria-describedby="tokenInputHelp"
            className="text-center text-xl h-14 border-gray-200 focus:border-[#90A5FB] focus:ring-[#90A5FB]/20"
          />

          <div className="flex items-center gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <p id="tokenInputHelp" className="text-sm text-gray-600">
              Enter a whole number between 1 and {project.stockSupply} tokens
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Breakdown */}
      {calculation && (
        <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#123962]/10 rounded-lg flex items-center justify-center">
                <Receipt className="h-4 w-4 text-[#123962]" />
              </div>
              <h4 className="font-semibold text-gray-900">
                Investment Breakdown
              </h4>
            </div>

            <div className="space-y-3">
              {/* Tokens quantity */}
              <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500/10 rounded flex items-center justify-center">
                    <Coins className="h-3 w-3 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-700">Tokens</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {calculation.tokensDesired}
                </span>
              </div>

              {/* Price per token */}
              <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-emerald-500/10 rounded flex items-center justify-center">
                    <DollarSign className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span className="text-sm text-gray-700">Price per token</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(calculation.pricePerToken)}
                </span>
              </div>

              {/* Subtotal */}
              <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500/10 rounded flex items-center justify-center">
                    <Calculator className="h-3 w-3 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">Subtotal</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(calculation.totalCost)}
                </span>
              </div>

              {/* Orange Money fee */}
              <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-orange-500/10 rounded flex items-center justify-center">
                    <Receipt className="h-3 w-3 text-orange-600" />
                  </div>
                  <span className="text-sm text-gray-600">
                    Orange Money fee (2%)
                  </span>
                </div>
                <span className="text-sm text-gray-700">
                  {formatCurrency(calculation.orangeMoneyFee)}
                </span>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50/50 to-green-50/30 border border-emerald-200 rounded-lg mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="font-semibold text-gray-900">
                    Total Amount
                  </span>
                </div>
                <span className="text-xl font-semibold text-emerald-600">
                  {formatCurrency(calculation.finalTotal)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <Button
        onClick={onNext}
        className="w-full bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#123962]/90 hover:to-[#90A5FB]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12"
        disabled={isContinueDisabled}
        aria-disabled={isContinueDisabled}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Continue to Payment
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
