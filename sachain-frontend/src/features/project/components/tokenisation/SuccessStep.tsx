import React from "react";
import { Button } from "@/components/ui/button";

interface SuccessStepProps {
  onFinish: () => void;
}

export function SuccessStep({ onFinish }: SuccessStepProps) {
  return (
    <>
      <h2 className="text-4xl font-extrabold mb-4">Tokens Created Successfully!</h2>
      <p className="text-gray-600 mb-8 leading-relaxed">
        Your project tokens have been successfully deployed to the Hedera blockchain and are ready to go live.
      </p>
      <Button onClick={onFinish}>Back to Project Details</Button>
    </>
  );
}
