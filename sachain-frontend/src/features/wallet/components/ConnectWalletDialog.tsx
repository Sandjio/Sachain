// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog';
// import WalletOption from './WalletOption';
// import { useEffect, useState } from 'react';
// import ConnectSteps from './ConnectSteps';
// import SuccessState from './SuccessState';
// import ErrorState from './ErrorState';
// import WalletCreation from './WalletCreation';
// import ManualWalletConnect from './WalletConnection';

// interface ConnectWalletDialogProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
// }

// type WalletFlow = 'connect' | 'create';

// export default function ConnectWalletDialog({
//   open,
//   onOpenChange,
// }: ConnectWalletDialogProps) {
//   const [state, setState] = useState<
//     'selection' | 'connecting' | 'success' | 'error'
//   >('selection');
//   const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
//   const [currentStep, setCurrentStep] = useState(0);
//   const [flow, setFlow] = useState<WalletFlow>('connect');

//   // New state to control manual connection UI visibility
//   const [showManualConnect, setShowManualConnect] = useState(false);

//   // Store connected account details
//   const [connectedAccount, setConnectedAccount] = useState<{
//     accountId: string;
//     balance: string;
//   } | null>(null);

//   // Reset state when switching to 'create' flow
//   useEffect(() => {
//     if (flow === 'create') {
//       setState('selection');
//       setSelectedWallet(null);
//       setShowManualConnect(false);
//     }
//   }, [flow]);

//   // Reset modal state when closed
//   useEffect(() => {
//     if (!open) {
//       setState('selection');
//       setSelectedWallet(null);
//       setFlow('connect');
//       setShowManualConnect(false);
//       setConnectedAccount(null);
//     }
//   }, [open]);

//   useEffect(() => {
//     let stepTimer: NodeJS.Timeout;
//     if (state === 'connecting') {
//       if (currentStep < 4) {
//         stepTimer = setTimeout(() => {
//           setCurrentStep((prev) => prev + 1);
//         }, 1500);
//       } else {
//         const resultTimer = setTimeout(() => {
//           // Simulate success randomly for demo; replace with real logic later
//           if (Math.random() > 0.5) {
//             setState('success');
//           } else {
//             setState('error');
//           }
//           setCurrentStep(0);
//         }, 1000);
//         return () => clearTimeout(resultTimer);
//       }
//     }
//     return () => clearTimeout(stepTimer);
//   }, [state, currentStep]);

//   // When user clicks Hedera Wallet card
//   const handleConnect = (walletType: string) => {
//     setSelectedWallet(walletType);
//     setShowManualConnect(true);
//   };

//   // When manual wallet connect succeeds
//   const handleManualConnectSuccess = (accountId: string, balance: string) => {
//     setConnectedAccount({ accountId, balance });
//     setState('success');
//     setShowManualConnect(false);
//     setSelectedWallet('Hedera Wallet');
//   };

//   // When wallet creation succeeds
//   const handleWalletCreated = (publicKey: string) => {
//     setFlow('connect');
//     setSelectedWallet(publicKey);
//     setState('success');
//   };

//   const handleRetry = () => {
//     setState('selection');
//     setSelectedWallet(null);
//     setShowManualConnect(false);
//   };

//   const handleClose = () => {
//     onOpenChange(false);
//     setState('selection');
//     setSelectedWallet(null);
//     setFlow('connect');
//     setShowManualConnect(false);
//     setConnectedAccount(null);
//   };

//   return (
//     <Dialog open={open} onOpenChange={handleClose}>
//       <DialogContent className="max-w-lg rounded-2xl bg-white">
//         <DialogHeader>
//           <DialogTitle className="font-extrabold text-2xl">
//             Connect Your Wallet
//           </DialogTitle>
//           <DialogDescription className="text-gray-500 text-sm">
//             {flow === 'connect' &&
//               state === 'selection' &&
//               !showManualConnect &&
//               'Please select your wallet to connect'}
//             {flow === 'connect' &&
//               showManualConnect &&
//               'Enter your Hedera Account ID to connect'}
//             {flow === 'connect' &&
//               state === 'connecting' &&
//               `Connecting to ${selectedWallet}`}
//             {flow === 'connect' && state === 'success' && 'Wallet Connected!'}
//             {flow === 'connect' && state === 'error' && 'Connection Failed'}
//             {flow === 'create' && 'Create a new Hedera wallet'}
//           </DialogDescription>
//         </DialogHeader>

//         {/* Create Wallet Button */}
// {!showManualConnect && (
//   <div className="flex justify-center gap-4 py-4">
//     <button
//       className={`px-4 py-2 rounded ${
//         flow === 'create'
//           ? 'bg-[#123962] text-white'
//           : 'bg-gray-200 text-gray-700'
//       }`}
//       onClick={() => setFlow('create')}
//     >
//       Create Wallet
//     </button>
//   </div>
// )}

//         {/* Connect Flow UI */}
//         {flow === 'connect' && state === 'selection' && !showManualConnect && (
//           <div className="p-6 space-y-4">
//             <WalletOption
//               icon={<span>🌿</span>}
//               name="Hedera Wallet"
//               description="Native Hedera HBAR wallet for fast transactions"
//               status="available"
//               recommended
//               onClick={() => handleConnect('Hedera')}
//             />
//           </div>
//         )}

//         {flow === 'connect' && showManualConnect && (
//           <ManualWalletConnect onConnectSuccess={handleManualConnectSuccess} />
//         )}

//         {flow === 'connect' && state === 'connecting' && (
//           <div className="p-6 text-center">
//             <div className="mx-auto w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-6"></div>
//             <p className="mb-4">
//               Please check your wallet and approve the connection
//             </p>
//             <ConnectSteps currentStep={currentStep} />
//             <button className="btn mt-4" onClick={handleClose}>
//               Cancel
//             </button>
//           </div>
//         )}

//         {flow === 'connect' && state === 'success' && (
//           <SuccessState
//             walletName={selectedWallet}
//             walletDetails={connectedAccount}
//             onContinue={handleClose}
//           />
//         )}

//         {flow === 'connect' && state === 'error' && (
//           <ErrorState onRetry={handleRetry} onClose={handleClose} />
//         )}

//         {/* Create Wallet Flow */}
//         {flow === 'create' && (
//           <WalletCreation onCreateSuccess={handleWalletCreated} />
//         )}
//       </DialogContent>
//     </Dialog>
//   );
// }

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import WalletOption from './WalletOption';
import ConnectSteps from './ConnectSteps';
import SuccessState from './SuccessState';
import ErrorState from './ErrorState';
import WalletCreation from './WalletCreation';
import ManualWalletConnect from './WalletConnection';
import { useConnectWalletDialog } from '../hooks/useConnectWalletDialog';

interface ConnectWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ConnectWalletDialog({
  open,
  onOpenChange,
}: ConnectWalletDialogProps) {
  const {
    state,
    selectedWallet,
    currentStep,
    flow,
    showManualConnect,
    connectedAccount,
    setFlow,
    handleConnect,
    handleAccountValidated,
    handleWalletCreated,
    handleRetry,
    handleClose,
  } = useConnectWalletDialog(open, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg rounded-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="font-extrabold text-2xl">
            Connect Your Wallet
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-sm">
            {flow === 'connect' &&
              state === 'selection' &&
              !showManualConnect &&
              'Please select your wallet to connect'}
            {flow === 'connect' &&
              showManualConnect &&
              'Enter your Hedera Account ID to connect'}
            {flow === 'connect' &&
              state === 'connecting' &&
              `Connecting to ${selectedWallet}`}
            {flow === 'connect' && state === 'success' && 'Wallet Connected!'}
            {flow === 'connect' && state === 'error' && 'Connection Failed'}
            {flow === 'create' && 'Create a new Hedera wallet'}
          </DialogDescription>
        </DialogHeader>

        {/* Create Wallet Button */}
        {!showManualConnect && state === 'selection' && (
          <div className="flex justify-center gap-4 py-4">
            <button
              className={`px-4 py-2 rounded ${
                flow === 'create'
                  ? 'bg-[#123962] text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
              onClick={() => setFlow('create')}
            >
              Create Wallet
            </button>
          </div>
        )}

        {/* Connect Flow */}
        {flow === 'connect' && state === 'selection' && !showManualConnect && (
          <div className="p-6 space-y-4">
            <WalletOption
              icon={<span>🌿</span>}
              name="Hedera Wallet"
              description="Native Hedera HBAR wallet for fast transactions"
              status="available"
              recommended
              onClick={() => handleConnect('Hedera')}
            />
          </div>
        )}

        {flow === 'connect' && showManualConnect && (
          <ManualWalletConnect onValidated={handleAccountValidated} />
        )}

        {flow === 'connect' && state === 'connecting' && (
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-6"></div>
            <p className="mb-4">
              Please check your wallet and approve the connection
            </p>
            <ConnectSteps currentStep={currentStep} />
            <button className="btn mt-4" onClick={handleClose}>
              Cancel
            </button>
          </div>
        )}

        {flow === 'connect' && state === 'success' && connectedAccount && (
          <SuccessState
            walletName={selectedWallet}
            walletDetails={connectedAccount}
            onContinue={handleClose}
          />
        )}

        {flow === 'connect' && state === 'error' && (
          <ErrorState onRetry={handleRetry} onClose={handleClose} />
        )}

        {/* Create Wallet Flow */}
        {flow === 'create' && (
          <WalletCreation onCreateSuccess={handleWalletCreated} />
        )}
      </DialogContent>
    </Dialog>
  );
}
