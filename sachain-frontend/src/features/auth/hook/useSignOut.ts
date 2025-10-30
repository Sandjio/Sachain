


import { useState } from 'react';
import { cognitoSignOut } from '@/features/auth/core/cognitoProvider';

export function useSignOut() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    setLoading(true);
    setError(null);

    try {
      await cognitoSignOut();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to sign out');
        console.error('[useSignOut] Error:', err);
      } else {
        setError('Failed to sign out');
        console.error('[useSignOut] Unknown error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  return { signOut, loading, error };
}
