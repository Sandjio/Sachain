
import React, { useState } from "react";
import { Step1ProjectDetails } from "./Step1ProjectDetails";
import { Step2ShareOffering } from "./Step2ShareOffering";
import { Step3ReviewPublish } from "./Step3ReviewPublish";
import { SuccessStep } from "./SuccessState";
import { useCreateProject } from "../hook/useCreateProject";

type FormData = {
  name: string;
  description: string;
  category: string;
  coverImageUrl: string;
  stockSupply: number;
  pricePerStock: number;
  targetFundingGoal: number;
};

const initialData: FormData = {
  name: "",
  description: "",
  category: "",
  coverImageUrl: "",
  stockSupply: 1,
  pricePerStock: 0,
  targetFundingGoal: 0,
};

interface MultiStepProjectFormProps {
  onCancel: () => void; // callback to go back to projects tab
}

export function MultiStepProjectForm({ onCancel }: MultiStepProjectFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialData);

  const { submitProject, loading, error } = useCreateProject();

  const handleChange = (fields: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    try {
      await submitProject(formData);
      setStep(4); // ✅ move to success screen
    } catch (err) {
      console.error("❌ Project creation failed:", err);
    }
  };

  return (
    <div>
      {step !== 4 && (
        <button
          onClick={onCancel}
          className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Back to Projects
        </button>
      )}

      {step === 1 && (
        <Step1ProjectDetails
          data={formData}
          onChange={handleChange}
          onNext={nextStep}
        />
      )}
      {step === 2 && (
        <Step2ShareOffering
          data={formData}
          onChange={handleChange}
          onNext={nextStep}
          onPrev={prevStep}
        />
      )}
      {step === 3 && (
        <Step3ReviewPublish
          data={formData}
          onPrev={prevStep}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      )}
      {step === 4 && <SuccessStep onDone={onCancel} />}
    </div>
  );
}
