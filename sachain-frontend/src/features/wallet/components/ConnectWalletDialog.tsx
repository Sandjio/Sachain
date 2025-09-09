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
            {flow === 'create' ? 'Create Wallet' : 'Connect Your Wallet'}
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-1xl">
            {flow === 'connect' &&
              state === 'selection' &&
              !showManualConnect &&
              'If you do not have a wallet, please create your  wallet first.'}
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

        {!showManualConnect && state === 'selection' && flow !== 'create' && (
          <div className="flex justify-center gap-4 py-4">
            <button
              className="px-4 py-2 rounded bg-gray-200 text-gray-700"
              onClick={() => setFlow('create')}
            >
              Create Wallet
            </button>
          </div>
        )}

        {/* Connection flows */}
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
            walletName={selectedWallet ?? ''}
            walletDetails={connectedAccount}
            onContinue={handleClose}
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
              //handleContinueFromCreate();
              handleClose();
            }}
            showCreatedWalletDetails={true}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
