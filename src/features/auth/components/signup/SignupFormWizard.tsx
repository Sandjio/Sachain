
import { useState } from "react";
import SignupStep1 from "./SignupStep1";
import SignupStep2 from "./SignupStep2";
import Step4Success from "./Step4Success";
import { useSignup } from "@/features/auth/hook/useSignup";

export type SignupData = {
  givenName?: string;
  familyName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  code?: string;
  role?: "startup" | "investor";
};

interface SignupFormWizardProps {
  role: "startup" | "investor";
}

export default function SignupFormWizard({ role }: SignupFormWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState<SignupData>({});
  const { signup, confirm, loading, error } = useSignup(role);

  // Step 1 → Step 2
  const handleStep1Next = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    setFormData({ ...formData, ...data, role }); // store role from modal
    try {
      await signup({
        password: data.password,
        email: data.email,
        givenName: data.firstName,
        familyName: data.lastName,
        role: role,
      });
      setStep(2);
    } catch (err) {
      console.error("Signup failed:", err);
    }
  };

  // Step 2 → Step 3
  const handleStep2Verify = async ({ code }: { code: string }) => {
    try {
      await confirm({ email: formData.email!, code });
      setStep(3);
    } catch (err) {
      console.error("Confirmation failed:", err);
    }
  };

  // Step 3 → Step 4 (now just success, no ID upload)
  const handleStep3Next = () => {
    setStep(4);
  };

  const handleClose = () => {
    setFormData({});
    setStep(1);
  };

  return (
    <div>
      {step === 1 && <SignupStep1 onNext={handleStep1Next} loading={loading} />}
      {step === 2 && (
        <SignupStep2
          onVerify={handleStep2Verify}
          onBack={() => setStep(1)}
          loading={loading}
        />
      )}
      {step === 3 && (
        <div className="flex flex-col items-center gap-3 mt-4">
          <p>All done! Click next to continue.</p>
          <button
            onClick={handleStep3Next}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Next
          </button>
        </div>
      )}
      {step === 4 && <Step4Success role={role} onClose={handleClose} />}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
