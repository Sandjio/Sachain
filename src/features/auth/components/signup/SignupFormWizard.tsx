import { useState } from "react";
import SignupStep1 from "./SignupStep1";
import SignupStep2 from "./SignupStep2";
import SignupStep3 from "./SignupStep3";
import Step4Success from "./Step4Success";
import { set } from "zod";

export type SignupData = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  code?: string;
};

interface SignupFormWizardProps {
  role: "startup" | "investor";
}

export default function SignupFormWizard({ role }: SignupFormWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState<SignupData>({});

  // Step 1 -> Step 2
  const handleStep1Next = (data: Omit<SignupData, "code">) => {
    setFormData((prev) => ({ ...prev, ...data }));
    // TODO: call backend to send email verification
    setStep(2);
  };

  // Step 2 -> Done (for now just log it)
  const handleStep2Verify = (data: { code: string }) => {
    setFormData((prev) => ({ ...prev, ...data })); // Log the full data for now
    // This would be where you handle the verification code
    console.log("Full signup data:", { ...formData, ...data, role });
    // TODO: call backend verify code, then move to Step 3
    setStep(3);
  };

  const handleStep3Next = (data: { file: File }) => {
    setFormData((prev) => ({ ...prev, ...data })); // Log the full data for now
    // This would be where you handle the file upload
    console.log("Full signup data with file:", { ...formData, ...data, role });
    // TODO: send to backend -> Step 4
    setStep(4);
  };

  const handleClose = () => {
    // reset wizard if needed
    setFormData({});
    setStep(1);
  };

 return (
     <div>
      {step === 1 && <SignupStep1 onNext={handleStep1Next} />}
      {step === 2 && <SignupStep2 onVerify={handleStep2Verify} onBack={() => setStep(1)} />}
      {step === 3 && <SignupStep3 role={role} onNext={handleStep3Next} onBack={() => setStep(2)} />}
      {step === 4 && <Step4Success role={role} onClose={handleClose} />}
    </div>
  );
}
