import React from "react";

const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ProgressIndicatorProps {
  currentStep: number; 
  totalSteps: number;
  progressPercent: number;
  label: string;
  icon: React.ReactNode;
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  progressPercent,
  label,
  icon,
}: ProgressIndicatorProps) {
  const strokeDashoffset = CIRCUMFERENCE - (progressPercent / 100) * CIRCUMFERENCE;

  return (
    <div className="relative w-[200px] h-[200px] mx-auto mb-10">
      <svg className="rotate-[-90deg]" width="200" height="200" >
        <circle
          className="stroke-gray-100"
          strokeWidth="8"
          fill="transparent"
          r={RADIUS}
          cx="100"
          cy="100"
        />
        <circle
          className="stroke-green-500 stroke-linecap-round transition-[stroke-dashoffset] duration-700 ease-in-out"
          strokeWidth="8"
          fill="transparent"
          r={RADIUS}
          cx="100"
          cy="100"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="text-5xl mb-2 animate-pulse">{icon}</div>
        <div className="font-bold text-lg text-black">{label}</div>
        <div className="text-sm text-gray-500 mt-1">
          Step {currentStep} of {totalSteps}
        </div>
      </div>
    </div>
  );
}
