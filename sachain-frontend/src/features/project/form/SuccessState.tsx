import React from "react";

interface SuccessStepProps {
  onDone: () => void;
}

export function SuccessStep({ onDone }: SuccessStepProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-green-600 mb-4">🎉 Project Created!</h2>
      <p className="text-gray-600 mb-6 text-center">
        Your project has been successfully created and saved.
      </p>
      <button
        onClick={onDone}
        className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Back to Projects
      </button>
    </div>
  );
}
