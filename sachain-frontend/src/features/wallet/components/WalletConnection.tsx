import React from 'react';
import { useManualWalletConnect } from '../hooks/useWalletConnect';

interface ManualWalletConnectProps {
  onValidated: (accountId: string, balance: string) => void;
  onCancel?: () => void;
}

export default function ManualWalletConnect({
  onValidated,
  onCancel,
}: ManualWalletConnectProps) {
  const { accountId, setAccountId, error, loading, startValidation } =
    useManualWalletConnect();

  const handleConnectClick = async () => {
    const balance = await startValidation();
    if (balance !== null) {
      onValidated(accountId.trim(), balance);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && accountId.trim()) {
      handleConnectClick();
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          Connect Existing Wallet
        </h3>
        <p className="text-sm text-gray-600">
          Enter your Hedera Account ID to verify and connect
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Hedera Account ID
        </label>
        <input
          type="text"
          placeholder="e.g. 0.0.12345"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          onKeyPress={handleKeyPress}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123962] focus:border-transparent"
          disabled={loading}
        />
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <svg
              className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={handleConnectClick}
          disabled={loading || !accountId.trim()}
          className="flex-1 px-4 py-3 bg-[#123962] text-white rounded-lg hover:bg-[#0f2b45] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          {loading ? 'Validating...' : 'Connect Wallet'}
        </button>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
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
          <div>
            <p className="text-sm font-medium text-blue-800">
              How to find your Account ID
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Your Account ID is displayed in your Hedera wallet app or can be
              found in your transaction history. It looks like "0.0.12345".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
