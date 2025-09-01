// import { useState } from "react";
// import { cognitoLogin } from "@/features/auth/core/cognitoProvider";
// import { LoginPayload } from "../types/authTypes";
// import { useAuthStore } from "@/store/authStore";

// export function useLogin() {
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const { login: saveToStore } = useAuthStore();

//   const login = async (params: LoginPayload) => {
//     setIsLoading(true);
//     setError(null);
//     try {
//       const { user, tokens } = await cognitoLogin(params);

//       // save user and tokens
//       saveToStore(user, tokens);

//       return { ok: true, user, tokens };
//     } catch (err: any) {
//       setError(err.message || "Login failed");
//       throw err;
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return { login, isLoading, error };
// }

import { useState } from "react";
import { cognitoSignIn } from "@/features/auth/core/cognitoProvider";
import type { AuthUser } from "../types/authTypes";
import { useAuthStore } from "@/store/authStore";

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginToStore = useAuthStore((s) => s.login);

  const login = async ({ email, password }: { email: string; password: string }) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Call Cognito sign in
      const tokens = await cognitoSignIn({ email, password });

      // 2. Get minimal user object (you might extend this)
      const user: AuthUser = {
        email,
        givenName: "", // optional, can be fetched from Cognito attributes
        familyName: "",
        role: "startup", // TODO: fetch role attribute from Cognito
      };

      // 3. Save user + tokens to global store
      loginToStore(user, tokens);

      return { ok: true, tokens };
    } catch (err: any) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}
