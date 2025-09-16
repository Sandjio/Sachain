// import React, { useState } from 'react';
// import ConnectWalletDialog from '@/features/wallet/components/ConnectWalletDialog';
// import { useWalletStore } from '@/features/wallet/store/walletStore';
// import { Button } from '@/components/ui/button';

// interface TokenizationFlowProps {
//   project: {
//     projectId: string;
//     name: string;
//   };
//   onBack: () => void;
// }

// const TokenizationFlow: React.FC<TokenizationFlowProps> = ({ project, onBack }) => {
//   const walletAddress = useWalletStore((state) => state.walletAddress);
//   const isConnected = useWalletStore((state) => state.isConnected);

//   const [step, setStep] = useState<'connectWallet' | 'minting' | 'success' | 'error'>('connectWallet');
//   const [walletModalOpen, setWalletModalOpen] = useState(false);
//   const [minting, setMinting] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // Called after wallet connection or creation success
//   const onWalletConfirmed = () => {
//     setWalletModalOpen(false);
//     setStep('minting');
//   };

//   const startMinting = async () => {
//     setError(null);
//     setMinting(true);

//     try {
//       // TODO: replace with actual mint API call, example:
//       // await mintTokens(project.projectId, walletAddress);

//       // Simulate API delay
//       await new Promise((res) => setTimeout(res, 2000));

//       setStep('success');
//     } catch (e: any) {
//       setError(e.message || 'Minting failed, please try again.');
//       setStep('error');
//     } finally {
//       setMinting(false);
//     }
//   };

//   return (
//     <div className="max-w-3xl mx-auto p-6">
//       <h1 className="text-2xl font-bold mb-6">Tokenization - {project.name}</h1>

//       {step === 'connectWallet' && (
//         <>
//           {!isConnected ? (
//             <>
//               <span className="mb-4">Please connect or create your wallet to proceed.</span>
//               <Button onClick={() => setWalletModalOpen(true)} className="mb-4">
//                 Connect / Create Wallet
//               </Button>
//               <ConnectWalletDialog
//                 open={walletModalOpen}
//                 onOpenChange={setWalletModalOpen}
//                 onWalletConfirmed={onWalletConfirmed}
//               />
//             </>
//           ) : (
//             <>
//               <p className="mb-4">Wallet connected: <span className="font-mono">{walletAddress}</span></p>
//               <Button onClick={() => setStep('minting')} className="mb-4">
//                 Continue to Minting
//               </Button>
//             </>
//           )}
//           <Button variant="outline" onClick={onBack}>Cancel</Button>
//         </>
//       )}

//       {step === 'minting' && (
//         <>
//           <p className="mb-4">{minting ? 'Minting tokens, please wait...' : 'Ready to mint your shares.'}</p>
//           {error && <p className="mb-4 text-red-600">{error}</p>}
//           <div className="flex gap-4">
//             <Button onClick={startMinting} disabled={minting}>
//               {minting ? 'Minting...' : 'Start Minting'}
//             </Button>
//             <Button variant="outline" onClick={onBack} disabled={minting}>
//               Cancel
//             </Button>
//           </div>
//         </>
//       )}

//       {step === 'success' && (
//         <>
//           <p className="mb-6 text-green-700 font-semibold">Tokenization successful! Your project is now live.</p>
//           <Button onClick={onBack}>Back to Project Details</Button>
//         </>
//       )}

//       {step === 'error' && (
//         <>
//           <p className="mb-4 text-red-600 font-semibold">Error: {error}</p>
//           <div className="flex gap-4">
//             <Button onClick={() => setStep('minting')}>Retry Minting</Button>
//             <Button variant="outline" onClick={onBack}>Cancel</Button>
//           </div>
//         </>
//       )}
//     </div>
//   );
// };




import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProgressIndicator } from "./tokenisation/ProgressIndicator";
import { ConnectWalletStep } from "./tokenisation/ConnectWalletStep";
import { MintingStep } from "./tokenisation/MintingStep";
import { SuccessStep } from "./tokenisation/SuccessStep";
import { Button } from "@/components/ui/button";
import { useWalletStore } from '@/features/wallet/store/walletStore';
//import { VerificationStep } from "./tokenisation/VerificationStep";

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
}

export function TokenizationFlow({
  project,
  onBack,
  onMintSuccess,
}: TokenizationFlowProps) {
  const walletAddress = useWalletStore((state) => state.walletAddress);
  const [currentStep, setCurrentStep] = useState(1); // 1=connect, 2=mint, 3=success
  const [progressPercent, setProgressPercent] = useState(0);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate progress for Connect Wallet and Minting steps
  useEffect(() => {
    setProgressPercent(0);

    if (currentStep === 1) {
      const timer = setTimeout(() => setProgressPercent(100), 1800);
      return () => clearTimeout(timer);
    }

    if (currentStep === 2) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setProgressPercent(progress);
        if (progress >= 100) {
          clearInterval(interval);
          // Do not auto proceed to success here - MintingStep manages that
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [currentStep]);

  // Called when wallet connects successfully
  const handleConnectSuccess = () => {
    setError(null);
    setCurrentStep(2);
  };

  // Called when minting is successful
  const handleMintSuccess = () => {
    setError(null);
    setCurrentStep(3);
    setIsSuccessModalOpen(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center p-5">
      <div className="bg-white rounded-[25px] p-12 shadow-xl max-w-lg w-full text-center relative">
        <ProgressIndicator
          currentStep={currentStep}
          totalSteps={3}
          progressPercent={progressPercent}
          label={
            currentStep === 1
              ? "Connect Wallet"
              : currentStep === 2
              ? "Minting Tokens"
              : "Complete!"
          }
          icon={currentStep === 1 ? "👛" : currentStep === 2 ? "🪙" : "✅"}
        />

        {currentStep === 1 && (
          <ConnectWalletStep onNext={handleConnectSuccess} onBack={onBack} />
        )}

        {currentStep === 2 && (
          <MintingStep
            projectId={project.projectId}
            walletAddress={walletAddress}
            onNext={handleMintSuccess}
            onBack={onBack}
            onError={(msg) => setError(msg)}
          />
        )}

        {currentStep === 3 && (
          <SuccessStep
            onFinish={() => {
              setIsSuccessModalOpen(false);
              onMintSuccess();
            }}
          />
        )}

        {error && (
          <div className="text-red-600 text-sm mt-4 font-semibold">{error}</div>
        )}

        <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
          <DialogContent className="bg-white rounded-[25px] p-16 max-w-md mx-auto text-center space-y-8">
            <div className="w-24 h-24 mx-auto flex items-center justify-center rounded-full bg-green-500 text-black text-5xl animate-[successBounce_0.6s_ease-out]">
              🎉
            </div>
            <h2 className="text-4xl font-extrabold">Project is Now Live!</h2>
            <p className="text-gray-600 leading-relaxed">
              Congratulations! Your tokens have been successfully deployed.
            </p>
            <Button
              onClick={() => {
                setIsSuccessModalOpen(false);
                onMintSuccess();
              }}
              className="w-full py-6 text-2xl font-extrabold rounded-xl bg-black text-white hover:bg-gray-900 transition-all"
            >
              Go to My Project
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
