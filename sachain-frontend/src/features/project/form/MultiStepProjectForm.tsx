import React, { useState } from 'react';
import { Step1ProjectDetails } from './Step1ProjectDetails';
import { Step2ShareOffering } from './Step2ShareOffering';
import { Step3ReviewPublish } from './Step3ReviewPublish';
import { SuccessStep } from './SuccessState';
import { useCreateProject } from '../hook/useCreateProject';

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
  name: '',
  description: '',
  category: '',
  coverImageUrl: '',
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
      setStep(4);
    } catch (err) {
      console.error('❌ Project creation failed:', err);
    }
  };

  return (
    <div className="max-w-full max-h-[90vh] mx-auto p-4 bg-white rounded-lg shadow-lg overflow-auto">
      {/* Back button */}
      {step !== 4 && (
        <button
          onClick={onCancel}
          className="h-9 sm:h-11 px-4 sm:px-8 w-full sm:w-auto bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#0d2630] hover:to-[#7088e8] text-white border-0 shadow-lg rounded-lg shadow-[#90A5FB]/30 transition-all hover:scale-105 active:scale-95"
        >
          Back to Projects
        </button>
      )}

      {/* Step content */}
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
