// // src/features/project/components/investment-steps/Step3Payment.tsx
// import { CreditCard, AlertTriangle } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent } from '@/components/ui/card';

// interface Step3Props {
//   calculation: { finalTotal: number } | null;
//   orangeMoneyBalance: number;
//   loading: boolean;
//   onProcessPayment: (amount: number) => Promise<void>;
//   onNext: () => void;
//   onBack: () => void;
//   formatCurrency: (amount: number) => string;
// }

// export default function Step3Payment({
//   calculation,
//   orangeMoneyBalance,
//   loading,
//   onProcessPayment,
//   onNext,
//   onBack,
//   formatCurrency,
// }: Step3Props) {
//   const handlePayment = async () => {
//     if (!calculation) return;
//     try {
//       await onProcessPayment(calculation.finalTotal);
//       onNext();
//     } catch {
//       // Handle errors via your hook
//     }
//   };

//   const canPay = calculation ? orangeMoneyBalance >= calculation.finalTotal : false;

//   return (
//     <div className="space-y-6" aria-live="polite">
//       <div className="text-center">
//         <CreditCard className="h-12 w-12 text-orange-600 mx-auto mb-4" />
//         <h3 className="text-lg font-semibold mb-2">Orange Money Payment</h3>
//         <p className="text-gray-600">Processing payment to your wallet</p>
//       </div>

//       {calculation && (
//         <Card>
//           <CardContent className="p-4">
//             <div className="space-y-2">
//               <div className="flex justify-between">
//                 <span>Orange Money Balance:</span>
//                 <span className="font-medium">{formatCurrency(orangeMoneyBalance)}</span>
//               </div>
//               <div className="flex justify-between">
//                 <span>Payment Amount:</span>
//                 <span className="font-bold">{formatCurrency(calculation.finalTotal)}</span>
//               </div>
//               <div className="flex justify-between text-sm text-gray-600">
//                 <span>Remaining after payment:</span>
//                 <span>{formatCurrency(orangeMoneyBalance - calculation.finalTotal)}</span>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       {!canPay && (
//         <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700">
//           <AlertTriangle className="h-4 w-4 mr-2" />
//           <p className="text-sm">
//             Insufficient Orange Money balance. Please top up your Orange Money account.
//           </p>
//         </div>
//       )}

//       <div className="flex gap-3">
//         <Button variant="outline" onClick={onBack} className="flex-1" disabled={loading} aria-label="Back to previous step">
//           Back
//         </Button>
//         <Button
//           onClick={handlePayment}
//           className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
//           disabled={loading || !canPay}
//           aria-disabled={loading || !canPay}
//         >
//           {loading ? 'Processing...' : 'Pay with Orange Money'}
//         </Button>
//       </div>
//     </div>
//   );
// }



import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Step3Props {
  calculation: { finalTotal: number; tokensDesired: number; pricePerToken: number } | null;
  project: {
    name: string;
    category: string;
    stockSupply: number;
    pricePerStock: number;
    coverImageUrl?: string;
    description: string;
  };
  onNext: () => void;
  onBack: () => void;
  formatCurrency: (amount: number) => string;
}

export default function Step3Payment({
  calculation,
  project,
  onNext,
  onBack,
  formatCurrency,
}: Step3Props) {
  const [infoConfirmed, setInfoConfirmed] = useState(false);

  if (!calculation) return null;

  return (
    <div className="space-y-6" aria-live="polite">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Confirm Your Investment Details</h2>
        <p className="text-gray-600 mb-4">Please review the information below before proceeding.</p>
      </div>

      <Card>
        <CardContent>
          <div className="mb-4 flex justify-center">
            {project?.coverImageUrl && (
              <img src={project.coverImageUrl} alt={project.name} className="h-32 w-32 object-cover rounded-md" />
            )}
          </div>
          <h3 className="text-xl font-bold text-center mb-2">{project?.name}</h3>
          <p className="text-center text-gray-700 mb-4">{project?.category}</p>
          <p className="text-center text-gray-700 mb-4">{project?.description}</p>

          <div className="space-y-2 text-center">
            <p>
              <strong>Number of Tokens:</strong> {calculation.tokensDesired}
            </p>
            <p>
              <strong>Price per Token:</strong> {formatCurrency(calculation.pricePerToken)}
            </p>
            <p className="text-lg font-semibold">
              <strong>Total Amount to Pay:</strong> {formatCurrency(calculation.finalTotal)}
            </p>
          </div>
        </CardContent>
      </Card>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={infoConfirmed}
          onChange={() => setInfoConfirmed((prev) => !prev)}
          className="cursor-pointer"
        />
        <span className="text-sm select-none">I have reviewed and confirm that the above information is correct.</span>
      </label>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 bg-[#123962] hover:bg-[#90A5FB] text-white"
          disabled={!infoConfirmed}
          aria-disabled={!infoConfirmed}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
}
