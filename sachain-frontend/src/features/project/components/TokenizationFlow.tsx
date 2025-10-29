// import React, { useState, useEffect } from 'react';
// import { Dialog, DialogContent } from '@/components/ui/dialog';
// import { ProgressIndicator } from './tokenisation/ProgressIndicator';
// import { ConnectWalletStep } from './tokenisation/ConnectWalletStep';
// import { MintingStep } from './tokenisation/MintingStep';
// import { SuccessStep } from './tokenisation/SuccessStep';
// import { Button } from '@/components/ui/button';
// import { useWalletStore } from '@/features/wallet/store/walletStore';
// import { VerificationStep } from './tokenisation/VerificationStep';
// import { PrivateKeyInput } from './tokenisation/PrivateKeyInput';

// interface TokenizationFlowProps {
//   project: {
//     projectId: string;
//     name: string;
//     tokenSymbol: string;
//     tokenSupply: number;
//     tokenPrice: number;
//     equityOffered: string;
//     fundingTarget: number;
//   };
//   onBack: () => void;
//   onMintSuccess: () => void;
//   walletAddress?: string | null;
// }

// const REQUIRED_MINT_FEE_HBAR = 2; //to change later

// export function TokenizationFlow({
//   project,
//   onBack,
//   onMintSuccess,
// }: TokenizationFlowProps) {
//   const walletAddress = useWalletStore((state) => state.walletAddress);
//   const [currentStep, setCurrentStep] = useState(1);
//   const [progressPercent, setProgressPercent] = useState(0);
//   const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [privateKey, setPrivateKey] = useState<string | null>(null);

//   useEffect(() => {
//     setProgressPercent(0);
//     if ([1, 2, 4].includes(currentStep)) {
//       const timer = setTimeout(() => setProgressPercent(100), 1200);
//       return () => clearTimeout(timer);
//     }
//   }, [currentStep]);

//   const handleConnectSuccess = () => {
//     setError(null);
//     setCurrentStep(2);
//   };

//   const handlePrivateKeySubmit = (key: string) => {
//     setError(null);
//     setPrivateKey(key);
//     setCurrentStep(4);
//   };

//   const handleVerificationProceed = () => {
//     setError(null);
//     setCurrentStep(3);
//   };

//   const handleVerificationRecharge = () => {
//     alert('Please recharge your wallet and try again.');
//   };

//   const handleMintSuccess = () => {
//     setError(null);
//     setCurrentStep(5);
//     setIsSuccessModalOpen(true);
//   };

//   return (
//     <div className="bg-gray-50 min-h-screen flex items-center justify-center p-5">
//       <div className="bg-white rounded-[25px] p-12 shadow-xl max-w-lg w-full text-center relative">
//         <ProgressIndicator
//           currentStep={currentStep}
//           totalSteps={5}
//           progressPercent={progressPercent}
//           label={
//             currentStep === 1
//               ? 'Connect Wallet'
//               : currentStep === 2
//                 ? 'Verify Balance'
//                 : currentStep === 3
//                   ? 'Enter Private Key'
//                   : currentStep === 4
//                     ? 'Minting Tokens'
//                     : 'Complete!'
//           }
//           icon={
//             currentStep === 1
//               ? '👛'
//               : currentStep === 2
//                 ? '🧐'
//                 : currentStep === 3
//                   ? '🔑'
//                   : currentStep === 4
//                     ? '🪙'
//                     : '✅'
//           }
//         />
//         {currentStep === 1 && (
//           <ConnectWalletStep onNext={handleConnectSuccess} onBack={onBack} />
//         )}

//         {currentStep === 2 && walletAddress && (
//           <VerificationStep
//             walletAddress={walletAddress}
//             requiredFeeHbar={REQUIRED_MINT_FEE_HBAR}
//             onProceed={handleVerificationProceed}
//             onRecharge={handleVerificationRecharge}
//             onCancel={onBack}
//           />
//         )}

//         {currentStep === 3 && (
//           <PrivateKeyInput
//             onSubmit={handlePrivateKeySubmit}
//             loading={false}
//             error={error}
//           />
//         )}

//         {currentStep === 4 && walletAddress && privateKey && (
//           <MintingStep
//             projectId={project.projectId}
//             walletAddress={walletAddress}
//             privateKey={privateKey}
//             onNext={handleMintSuccess}
//             onBack={onBack}
//             onError={(msg) => setError(msg)}
//           />
//         )}

//         {currentStep === 5 && (
//           <SuccessStep
//             onFinish={() => {
//               setIsSuccessModalOpen(false);
//               onMintSuccess();
//             }}
//           />
//         )}

//         {error && (
//           <div className="text-red-600 text-sm mt-4 font-semibold">{error}</div>
//         )}

//         <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
//           <DialogContent className="bg-white rounded-[25px] p-16 max-w-md mx-auto text-center space-y-8">
//             <div className="w-24 h-24 mx-auto flex items-center justify-center rounded-full bg-green-500 text-black text-5xl animate-[successBounce_0.6s_ease-out]">
//               🎉
//             </div>
//             <h2 className="text-4xl font-extrabold">Project is Now Live!</h2>
//             <p className="text-gray-600 leading-relaxed">
//               Congratulations! Your tokens have been successfully deployed.
//             </p>
//             <Button
//               onClick={() => {
//                 setIsSuccessModalOpen(false);
//                 onMintSuccess();
//               }}
//               className="w-full py-6 text-2xl font-extrabold rounded-xl bg-black text-white hover:bg-gray-900 transition-all"
//             >
//               Go to My Project
//             </Button>
//           </DialogContent>
//         </Dialog>
//       </div>
//     </div>
//   );
// }



import React, { useState, useEffect } from 'react';
import { ProgressIndicator } from './tokenisation/ProgressIndicator';
import { ConnectWalletStep } from './tokenisation/ConnectWalletStep';
import { MintingStep } from './tokenisation/MintingStep';
import { SuccessStep } from './tokenisation/SuccessStep';
import { Button } from '@/components/ui/button';
import { useWalletStore } from '@/features/wallet/store/walletStore';
import { VerificationStep } from './tokenisation/VerificationStep';
import { PrivateKeyInput } from './tokenisation/PrivateKeyInput';

interface TokenizationFlowProps {
  project: {
    projectId: string;
    name: string;
    tokenSymbol: string;
    tokenSupply: number;
    tokenPrice: number;
    equityOffered: string;
    fundingTarget: number;
  };
  onBack: () => void;
  onMintSuccess: () => void;
  walletAddress?: string | null;
}

const REQUIRED_MINT_FEE_HBAR = 2; //to change later

export function TokenizationFlow({
  project,
  onBack,
  onMintSuccess,
}: TokenizationFlowProps) {
  const walletAddress = useWalletStore((state) => state.walletAddress);
  const [currentStep, setCurrentStep] = useState(1);
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  useEffect(() => {
    setProgressPercent(0);
    if ([1, 2, 4].includes(currentStep)) {
      const timer = setTimeout(() => setProgressPercent(100), 1200);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  const handleConnectSuccess = () => {
    setError(null);
    setCurrentStep(2);
  };

  const handlePrivateKeySubmit = (key: string) => {
    setError(null);
    setPrivateKey(key);
    setCurrentStep(4);
  };

  const handleVerificationProceed = () => {
    setError(null);
    setCurrentStep(3);
  };

  const handleVerificationRecharge = () => {
    alert('Please recharge your wallet and try again.');
  };

  const handleMintSuccess = () => {
    setError(null);
    setCurrentStep(5);
    // Removed: setIsSuccessModalOpen(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center p-5">
      <div className="bg-white rounded-[25px] p-12 shadow-xl max-w-lg w-full text-center relative">
        <ProgressIndicator
          currentStep={currentStep}
          totalSteps={5}
          progressPercent={progressPercent}
          label={
            currentStep === 1
              ? 'Connect Wallet'
              : currentStep === 2
              ? 'Verify Balance'
              : currentStep === 3
              ? 'Enter Private Key'
              : currentStep === 4
              ? 'Minting Tokens'
              : 'Complete!'
          }
          icon={
            currentStep === 1
              ? '👛'
              : currentStep === 2
              ? '🧐'
              : currentStep === 3
              ? '🔑'
              : currentStep === 4
              ? '🪙'
              : '✅'
          }
        />
        {currentStep === 1 && (
          <ConnectWalletStep onNext={handleConnectSuccess} onBack={onBack} />
        )}

        {currentStep === 2 && walletAddress && (
          <VerificationStep
            walletAddress={walletAddress}
            requiredFeeHbar={REQUIRED_MINT_FEE_HBAR}
            onProceed={handleVerificationProceed}
            onRecharge={handleVerificationRecharge}
            onCancel={onBack}
          />
        )}

        {currentStep === 3 && (
          <PrivateKeyInput
            onSubmit={handlePrivateKeySubmit}
            loading={false}
            error={error}
          />
        )}

        {currentStep === 4 && walletAddress && privateKey && (
          <MintingStep
            projectId={project.projectId}
            walletAddress={walletAddress}
            privateKey={privateKey}
            onNext={handleMintSuccess}
            onBack={onBack}
            onError={(msg) => setError(msg)}
          />
        )}

        {currentStep === 5 && (
          <SuccessStep
            onFinish={() => {
              onMintSuccess();
            }}
          />
        )}

        {error && (
          <div className="text-red-600 text-sm mt-4 font-semibold">{error}</div>
        )}
      </div>
    </div>
  );
}
