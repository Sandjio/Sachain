
// src/features/auth/hook/useSignup.ts
import { useState } from "react";
import { cognitoSignUp, cognitoConfirmSignUp } from "@/features/auth/core/cognitoProvider";
import type { SignupPayload, ConfirmSignupPayload } from "../types/authTypes";

export function useSignup(role: "startup" | "investor") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailForFlow, setEmailForFlow] = useState<string | null>(null);

  // Step 1: Sign up
  const signup = async (params: SignupPayload) => {
    setLoading(true);
    setError(null);
    try {
      await cognitoSignUp({
        email: params.email,
        password: params.password,
        givenName: params.givenName,
        familyName: params.familyName,
        role
      });

      setEmailForFlow(params.email);
      return { ok: true };
    } catch (err: any) {
      setError(err.message || "Signup failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm signup
  const confirm = async ({ email, code }: ConfirmSignupPayload) => {
    setLoading(true);
    setError(null);
    try {
      await cognitoConfirmSignUp({ email, code });
      return { ok: true };
    } catch (err: any) {
      setError(err.message || "Confirmation failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { signup, confirm, loading, error, emailForFlow };
}
