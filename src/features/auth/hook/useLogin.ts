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
