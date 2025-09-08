interface SuccessStateProps {
  walletName: string | null;
  onContinue: () => void;
}

export default function SuccessState({ walletName, onContinue }: SuccessStateProps) {
  return (
    <div className="p-6 text-center">
      <div className="mx-auto mb-6 w-24 h-24 rounded-full bg-green-500 flex items-center justify-center text-white text-6xl animate-bounce">
        ✓
      </div>
      <h3 className="text-2xl font-extrabold mb-4">Wallet Connected!</h3>
      <p className="mb-6 text-gray-600">Your {walletName ?? "wallet"} has been successfully connected.</p>
      <button className="btn btn-primary px-8 py-3 font-semibold" onClick={onContinue}>
        Continue to Dashboard
      </button>
    </div>
  );
}
