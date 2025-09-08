interface SuccessStateProps {
  walletName: string | null;
  walletDetails?: { accountId: string; balance: string } | null;
  onContinue: () => void;
}

export default function SuccessState({ walletName, walletDetails, onContinue }: SuccessStateProps) {
  return (
    <div className="text-center p-6">
      <h3 className="text-xl font-semibold">Successfully connected {walletName}</h3>
      {walletDetails && (
        <p className="mt-2">Account: {walletDetails.accountId} <br /> Balance: {walletDetails.balance} HBAR</p>
      )}
      <button onClick={onContinue} className="mt-6 px-4 py-2 bg-[#123962] text-white rounded">
        Continue
      </button>
    </div>
  );
}
