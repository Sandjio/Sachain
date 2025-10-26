// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog';
// import WalletOption from './WalletOption';
// import ConnectSteps from './ConnectSteps';
// import SuccessState from './SuccessState';
// import ErrorState from './ErrorState';
// import WalletCreation from './WalletCreation';
// import ManualWalletConnect from './WalletConnection';
// import { useConnectWalletDialog } from '../hooks/useConnectWalletDialog';
// import { useWalletStore } from '@/features/wallet/store/walletStore';

// interface ConnectWalletDialogProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   onWalletConfirmed?: () => void; // Callback when wallet connection or creation is confirmed
// }

// export default function ConnectWalletDialog({
//   open,
//   onOpenChange,
//   onWalletConfirmed,
// }: ConnectWalletDialogProps) {
//   const connectWallet = useWalletStore((state) => state.connectWallet);

//   const {
//     state,
//     selectedWallet,
//     currentStep,
//     flow,
//     showManualConnect,
//     connectedAccount,
//     setFlow,
//     handleConnect,
//     handleAccountValidated,
//     handleWalletCreated,
//     handleRetry,
//     handleClose,
//   } = useConnectWalletDialog(open, onOpenChange);

//   return (
//     <Dialog open={open} onOpenChange={handleClose}>
//       <DialogContent className="max-w-lg rounded-2xl bg-white">
//         <DialogHeader>
//           <DialogTitle className="font-extrabold text-2xl">
//             {flow === 'create' ? 'Create Wallet' : 'Connect Your Wallet'}
//           </DialogTitle>
//           <DialogDescription className="text-gray-500 text-1xl">
//             {flow === 'connect' &&
//               state === 'selection' &&
//               !showManualConnect &&
//               'If you do not have a wallet, please create your  wallet first.'}
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

//         {!showManualConnect && state === 'selection' && flow !== 'create' && (
//           <div className="flex justify-center gap-4 py-4">
//             <button
//               className="px-4 py-2 rounded bg-gray-200 text-gray-700"
//               onClick={() => setFlow('create')}
//             >
//               Create Wallet
//             </button>
//           </div>
//         )}

//         {/* Connection flows */}
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
//           <ManualWalletConnect onValidated={handleAccountValidated} />
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

//         {flow === 'connect' && state === 'success' && connectedAccount && (
//           <SuccessState
//             walletName={selectedWallet ?? ''}
//             walletDetails={connectedAccount}
//             onContinue={() => {
//               connectWallet(connectedAccount.accountId);
//               if (onWalletConfirmed) onWalletConfirmed();
//               handleClose();
//             }}
//           />
//         )}

//         {flow === 'connect' && state === 'error' && (
//           <ErrorState onRetry={handleRetry} onClose={handleClose} />
//         )}

//         {flow === 'create' && state !== 'success' && (
//           <WalletCreation
//             onCreateSuccess={(
//               newAccountId: string,
//               publicKey?: string,
//               privateKey?: string
//             ) => {
//               handleWalletCreated(newAccountId, publicKey, privateKey);
//             }}
//             onClose={() => {
//               setFlow('connect');
//             }}
//           />
//         )}

//         {flow === 'create' && state === 'success' && connectedAccount && (
//           <SuccessState
//             walletName="Created Wallet"
//             walletDetails={connectedAccount}
//             onContinue={() => {
//               connectWallet(connectedAccount.accountId);
//               if (onWalletConfirmed) onWalletConfirmed();
//               handleClose();
//             }}
//             showCreatedWalletDetails={true}
//           />
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
import { useWalletStore } from '@/features/wallet/store/walletStore';

interface ConnectWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWalletConfirmed?: () => void; // Callback when wallet connection or creation is confirmed
}

export default function ConnectWalletDialog({
  open,
  onOpenChange,
  onWalletConfirmed,
}: ConnectWalletDialogProps) {
  const connectWallet = useWalletStore((state) => state.connectWallet);

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
      <DialogContent className="max-w-2xl rounded-3xl bg-white border-0 shadow-2xl overflow-hidden p-0">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-[#123962] to-[#90A5FB] p-8 text-white relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <DialogHeader>
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                  <svg
                    className="w-7 h-7"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                  </svg>
                </div>
                <div>
                  <DialogTitle className="text-2xl text-white mb-1">
                    {flow === 'create'
                      ? 'Create Wallet'
                      : 'Connect Your Wallet'}
                  </DialogTitle>
                  <DialogDescription className="text-white/90">
                    {flow === 'connect' &&
                      state === 'selection' &&
                      !showManualConnect &&
                      'Securely connect to the Hedera network'}
                    {flow === 'connect' &&
                      showManualConnect &&
                      'Enter your Hedera Account ID to connect'}
                    {flow === 'connect' &&
                      state === 'connecting' &&
                      `Connecting to ${selectedWallet}`}
                    {flow === 'connect' &&
                      state === 'success' &&
                      'Successfully connected to your wallet!'}
                    {flow === 'connect' &&
                      state === 'error' &&
                      'Unable to connect. Please try again.'}
                    {flow === 'create' &&
                      'Create a new Hedera wallet in seconds'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
          {!showManualConnect && state === 'selection' && flow !== 'create' && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-xl border border-blue-100">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[#123962]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-medium">
                    First time here?
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    If you don't have a wallet, create one below.
                  </p>
                </div>
              </div>

              <div className="flex justify-center mt-5">
                <button
                  className="group px-6 py-3 rounded-xl bg-gradient-to-r from-[#90A5FB] to-[#123962] text-white font-medium shadow-lg shadow-[#90A5FB]/30 hover:shadow-xl hover:shadow-[#90A5FB]/40 transition-all duration-300 hover:scale-105"
                  onClick={() => setFlow('create')}
                >
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create New Wallet
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Connection flows */}
          {flow === 'connect' &&
            state === 'selection' &&
            !showManualConnect && (
              <div className="space-y-4">
                <WalletOption
                  icon={
                    <span style={{ fontFamily: 'serif', fontWeight: 'bold'}}>
                      ℏ
                    </span>
                  }
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
            <div className="text-center space-y-6">
              {/* Enhanced Loading Spinner */}
              <div className="relative mx-auto w-20 h-20">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
                {/* Animated gradient ring */}
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#90A5FB] border-r-[#123962] animate-spin"></div>
                {/* Inner glow */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#90A5FB]/10 to-[#123962]/10"></div>
              </div>

              <div className="space-y-3">
                <p className="text-gray-900 font-medium">
                  Connecting to your wallet...
                </p>
                <p className="text-sm text-gray-600">
                  Please check your wallet and approve the connection
                </p>
              </div>

              <div className="pt-2">
                <ConnectSteps currentStep={currentStep} />
              </div>

              <button
                className="mt-6 px-5 py-2.5 rounded-lg border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
                onClick={handleClose}
              >
                Cancel
              </button>
            </div>
          )}

          {flow === 'connect' && state === 'success' && connectedAccount && (
            <SuccessState
              walletName={selectedWallet ?? ''}
              walletDetails={connectedAccount}
              onContinue={() => {
                connectWallet(connectedAccount.accountId);
                if (onWalletConfirmed) onWalletConfirmed();
                handleClose();
              }}
            />
          )}

          {flow === 'connect' && state === 'error' && (
            <ErrorState onRetry={handleRetry} onClose={handleClose} />
          )}

          {flow === 'create' && state !== 'success' && (
            <WalletCreation
              onCreateSuccess={(
                newAccountId: string,
                publicKey?: string,
                privateKey?: string
              ) => {
                handleWalletCreated(newAccountId, publicKey, privateKey);
              }}
              onClose={() => {
                setFlow('connect');
              }}
            />
          )}

          {flow === 'create' && state === 'success' && connectedAccount && (
            <SuccessState
              walletName="Created Wallet"
              walletDetails={connectedAccount}
              onContinue={() => {
                connectWallet(connectedAccount.accountId);
                if (onWalletConfirmed) onWalletConfirmed();
                handleClose();
              }}
              showCreatedWalletDetails={true}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
