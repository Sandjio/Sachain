

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SignupStep1 from "./SignupStep1";
import SignupStep2 from "./SignupStep2";
import SignupStep3 from "./SignupStep3";
import Step4Success from "./Step4Success";
import { useSignup } from "@/features/auth/hook/useSignup";
import { useAuthStore } from "@/store/authStore";

export type SignupData = {
  givenName?: string;
  familyName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  code?: string;
};

export default function SignupFormWizard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState<SignupData>({});
  const { signup, confirm, loading, error } = useSignup();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  if (!user?.role) {
    return <p>Please select your role before signing up.</p>;
  }

  const role = user.role;
  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const stepTitles: Record<number, string> = {
    1: "Personal Information",
    2: "Verify Your Email",
    3: role === "investor" ? "Upload ID Document" : "Upload Business Documents",
    4: "Welcome to Sachain!",
  };

  // --- Handlers ---
  const handleStep1Next = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    setFormData({ ...formData, ...data });
    try {
      await signup({
        email: data.email,
        password: data.password,
        givenName: data.firstName,
        familyName: data.lastName,
        role
      });

      setUser({
        givenName: data.firstName,
        familyName: data.lastName,
        email: data.email,
        role,
      });
      setStep(2);

      console.log("User signed up successfully:", {
        givenName: data.firstName,
        familyName: data.lastName,
        email: data.email,
        role,
      });
    } catch (err) {
      console.error("Signup failed:", err);
    }
  };

  const handleStep2Verify = async ({ code }: { code: string }) => {
    try {
      await confirm({ email: formData.email!, code });
      setStep(3);
    } catch (err) {
      console.error("Confirmation failed:", err);
    }
  };

  const handleStep3Next = () => setStep(4);

  const handleClose = () => {
    setFormData({});
    setStep(1);
  };

  // --- Step Renderer ---
  const renderStep = () => {
    switch (step) {
      case 1:
        return <SignupStep1 onNext={handleStep1Next} loading={loading} />;
      case 2:
        return (
          <SignupStep2
            onVerify={handleStep2Verify}
            onBack={() => setStep(1)}
            loading={loading}
          />
        );
      case 3:
        return (
          <SignupStep3
            role={role}
            onBack={() => setStep(2)}
            onNext={handleStep3Next}
          />
        );
      case 4:
        return <Step4Success onClose={handleClose} />;
      default:
        return null;
    }
  };

  // --- Layout ---
  return (
    <Card className="max-w-lg w-full mx-auto shadow-xl">
      <CardHeader>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle>Create Account</CardTitle>
            <span className="text-sm text-muted-foreground">
              Step {step} of {totalSteps}
            </span>
          </div>
          <CardDescription>{stepTitles[step]}</CardDescription>
          <Progress value={progress} className="w-full" />
        </div>
      </CardHeader>
      <CardContent>{renderStep()}</CardContent>
      {error && <p className="text-red-500 px-6 pb-4">{error}</p>}
    </Card>
  );
}
