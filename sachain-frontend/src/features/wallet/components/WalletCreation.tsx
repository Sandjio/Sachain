import { useState } from "react";

export default function WalletCreation({ onCreateSuccess }: { onCreateSuccess: (publicKey: string) => void }) {
  // Mock keypair data
  const [privateKey, setPrivateKey] = useState("302e020100300506032b657004220420abc123...mockPrivateKey");
  const [publicKey, setPublicKey] = useState("0xabcdef1234567890...mockPublicKey");

  // UI states
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fake create wallet handler
  const handleCreateWallet = async () => {
    setIsCreating(true);
    setError(null);

    // Simulate async operation delay
    setTimeout(() => {
      // Simulate success - call back with public key
      setIsCreating(false);
      onCreateSuccess(publicKey);
    }, 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-md mx-auto bg-white rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold text-center">Create New Hedera Wallet</h2>

      <p className="text-gray-600">
        Please save your private key securely. If you lose it, you will lose access to your wallet.
      </p>

      <div>
        <label className="block font-semibold mb-1">Public Key</label>
        <textarea
          readOnly
          className="w-full p-3 border border-gray-300 rounded resize-none bg-gray-100"
          rows={2}
          value={publicKey}
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">Private Key</label>
        <textarea
          readOnly
          className="w-full p-3 border border-red-400 rounded resize-none bg-gray-100 text-red-700 font-mono"
          rows={4}
          value={privateKey}
        />
      </div>

      {error && <p className="text-red-600 font-semibold text-center">{error}</p>}

      <button
        onClick={handleCreateWallet}
        disabled={isCreating}
        className="w-full py-3 bg-[#123962] text-white rounded-lg font-semibold transition disabled:opacity-50"
      >
        {isCreating ? "Creating Wallet..." : "Create Wallet"}
      </button>
    </div>
  );
}
