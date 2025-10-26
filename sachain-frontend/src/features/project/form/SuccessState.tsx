import React from "react";

interface SuccessStepProps {
  onDone: () => void;
}

export function SuccessStep({ onDone }: SuccessStepProps) {
  return (
<div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow">
        
      <p className="text-green-600 mb-6 text-center">
       🎉 Your project has been successfully created and saved.
      </p>
      <button
        onClick={onDone}
        className="px-6 py-2 bg-primary text-white rounded hover:bg-muted/50 hover:text-primary"
      >
        Back to Projects
      </button>

    </div>
  );
}
