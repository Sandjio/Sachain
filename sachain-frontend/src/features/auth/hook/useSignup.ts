


// src/features/auth/hook/useSignup.ts
// import { useState } from "react";
// import {
//   cognitoSignUp,
//   cognitoConfirmSignUp,
//   cognitoSignIn,
// } from "@/features/auth/core/cognitoProvider";
// import type { SignupPayload, ConfirmSignupPayload, AuthUser } from "../types/authTypes";
// import { useAuthStore } from "@/store/authStore";

// export function useSignup(role: "startup" | "investor") {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // Save user + password temporarily between steps
//   const [userForFlow, setUserForFlow] = useState<AuthUser | null>(null);
//   const [passwordForFlow, setPasswordForFlow] = useState<string | null>(null);

//   const loginToStore = useAuthStore((s) => s.login);

//   // Step 1: Sign up
//   const signup = async (params: SignupPayload) => {
//     setLoading(true);
//     setError(null);
//     try {
//       await cognitoSignUp({
//         email: params.email,
//         password: params.password,
//         givenName: params.givenName,
//         familyName: params.familyName,
//         role,
//       });

//       // Save for later use in confirm step
//       setUserForFlow({
//         email: params.email,
//         givenName: params.givenName,
//         familyName: params.familyName,
//         role,
//       });
//       setPasswordForFlow(params.password);

//       return { ok: true };
//     } catch (err: any) {
//       setError(err.message || "Signup failed");
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Step 2: Confirm signup + auto-login
//   const confirm = async ({ email, code }: ConfirmSignupPayload) => {
//     if (!userForFlow || !passwordForFlow) {
//       throw new Error("User info not available for auto-login");
//     }

//     setLoading(true);
//     setError(null);
//     try {
//       // Confirm the verification code
//       await cognitoConfirmSignUp({ email, code });

//       // Auto-login
//       const tokens = await cognitoSignIn({
//         email,
//         password: passwordForFlow,
//       });

//       // Save user + tokens to global store
//       loginToStore(userForFlow, tokens);

//       console.log("User signed up and logged in:", tokens.idToken);
//       console.log("User information:", userForFlow);

//       return { ok: true, tokens };
//     } catch (err: any) {
//       setError(err.message || "Confirmation or login failed");
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   };

//   return {
//     signup,
//     confirm,
//     loading,
//     error,
//     emailForFlow: userForFlow?.email || null,
//   };
// }


// src/features/auth/hook/useSignup.ts
import { useState } from "react";
import {
  cognitoSignUp,
  cognitoConfirmSignUp,
  cognitoSignIn,
} from "@/features/auth/core/cognitoProvider";
import type { SignupPayload, ConfirmSignupPayload, AuthUser } from "../types/authTypes";
import { useAuthStore } from "@/store/authStore";

// Define interfaces for better type safety
interface SignupResult {
  ok: boolean;
}

interface ConfirmResult {
  ok: boolean;
  tokens: unknown; // Can be made more specific with proper tokens interface
}

// Helper function to safely extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return "An unknown error occurred";
}

export function useSignup(role: "startup" | "investor") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save user + password temporarily between steps
  const [userForFlow, setUserForFlow] = useState<AuthUser | null>(null);
  const [passwordForFlow, setPasswordForFlow] = useState<string | null>(null);

  const loginToStore = useAuthStore((s) => s.login);

  // Step 1: Sign up
  const signup = async (params: SignupPayload): Promise<SignupResult> => {
    setLoading(true);
    setError(null);
    try {
      await cognitoSignUp({
        email: params.email,
        password: params.password,
        givenName: params.givenName,
        familyName: params.familyName,
        role,
      });

      // Save for later use in confirm step
      setUserForFlow({
        email: params.email,
        givenName: params.givenName,
        familyName: params.familyName,
        role,
      });
      setPasswordForFlow(params.password);

      return { ok: true };
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage || "Signup failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm signup + auto-login
  const confirm = async ({ email, code }: ConfirmSignupPayload): Promise<ConfirmResult> => {
    if (!userForFlow || !passwordForFlow) {
      throw new Error("User info not available for auto-login");
    }

    setLoading(true);
    setError(null);
    try {
      // Confirm the verification code
      await cognitoConfirmSignUp({ email, code });

      // Auto-login
      const tokens = await cognitoSignIn({
        email,
        password: passwordForFlow,
      });

      // Save user + tokens to global store
      loginToStore(userForFlow, tokens);

      console.log("User signed up and logged in:", tokens.idToken);
      console.log("User information:", userForFlow);

      return { ok: true, tokens };
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage || "Confirmation or login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    signup,
    confirm,
    loading,
    error,
    emailForFlow: userForFlow?.email || null,
  };
}