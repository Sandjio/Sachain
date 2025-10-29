interface ConnectStepsProps {
  currentStep: number;
  totalSteps?: number;
}

const steps = [
  'Wallet detected',
  'Requesting connection...',
  'Verify account',
  'Complete setup',
];

export default function ConnectSteps({
  currentStep,
  totalSteps = steps.length,
}: ConnectStepsProps) {
  return (
    <div className="max-w-xs mx-auto text-left">
      {steps.slice(0, totalSteps).map((step, index) => {
        const completed = index < currentStep;
        return (
          <div
            key={index}
            className="flex items-center gap-4 py-3 border-b last:border-none border-gray-200"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                completed ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              {index + 1}
            </div>
            <div
              className={`text-sm ${completed ? 'text-green-600 font-semibold' : 'text-gray-500'}`}
            >
              {step}
            </div>
          </div>
        );
      })}
    </div>
  );
}
