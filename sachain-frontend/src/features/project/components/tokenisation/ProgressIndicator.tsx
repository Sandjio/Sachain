
//refactor

import React from 'react';

const RADIUS = 60;
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
  const strokeDashoffset =
    CIRCUMFERENCE - (progressPercent / 100) * CIRCUMFERENCE;

  return (
    <div className="relative w-[220px] h-[220px] mx-auto mb-10">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#90A5FB]/20 to-[#123962]/10 rounded-full blur-2xl" />

      <svg className="rotate-[-90deg] relative z-10" width="220" height="220">
        {/* Background circle */}
        <circle
          className="stroke-gray-100"
          strokeWidth="10"
          fill="transparent"
          r={RADIUS}
          cx="110"
          cy="110"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient
            id="progressGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#90A5FB" />
            <stop offset="100%" stopColor="#123962" />
          </linearGradient>
        </defs>

        {/* Progress circle with gradient */}
        <circle
          className="transition-[stroke-dashoffset] duration-700 ease-in-out"
          stroke="url(#progressGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="transparent"
          r={RADIUS}
          cx="110"
          cy="110"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          style={{
            filter: 'drop-shadow(0 0 6px rgba(144, 165, 251, 0.3))',
          }}
        />
      </svg>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        {/* Icon with gradient background */}

       

        {/* Step indicator with brand styling */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full border border-[#90A5FB]/20 shadow-sm">
          <div className="text-xs text-gray-600">Step</div>
          <div className="font-bold text-[#123962]">{currentStep}</div>
          <div className="text-xs text-gray-400">of</div>
          <div className="text-sm text-gray-600">{totalSteps}</div>
        </div>
      </div>
    </div>
  );
}
