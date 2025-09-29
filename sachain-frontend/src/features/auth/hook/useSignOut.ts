// src/hooks/useSignOut.ts
import { useState } from "react";
import { cognitoSignOut } from "@/features/auth/core/cognitoProvider";

export function useSignOut() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    setLoading(true);
    setError(null);

    try {
      await cognitoSignOut();
    } catch (err: any) {
      setError(err.message || "Failed to sign out");
      console.error("[useSignOut] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return { signOut, loading, error };
}
