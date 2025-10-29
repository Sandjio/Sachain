interface ErrorStateProps {
  onRetry: () => void;
  onClose: () => void;
}

export default function ErrorState({ onRetry, onClose }: ErrorStateProps) {
  return (
    <div className="p-6 text-center">
      <div className="mx-auto mb-6 w-24 h-24 rounded-full bg-red-500 flex items-center justify-center text-white text-6xl">
        ⚠
      </div>
      <h3 className="text-xl font-semibold mb-4 text-red-600">
        Connection Failed
      </h3>
      <p className="mb-6 text-gray-600">
        We couldn't connect to your wallet. Please try again.
      </p>
      <div className="flex justify-center gap-4">
        <button className="btn" onClick={onRetry}>
          Try Again
        </button>
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
