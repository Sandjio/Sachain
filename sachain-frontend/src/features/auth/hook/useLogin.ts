import { useState } from 'react';
import { cognitoSignIn } from '@/features/auth/core/cognitoProvider';
import type { AuthUser } from '../types/authTypes';
import { useAuthStore } from '@/store/authStore';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResult {
  ok: boolean;
  tokens: unknown;
}

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
  return 'Login failed';
}

// Helper to decode JWT and parse ID token payload
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const loginToStore = useAuthStore((s) => s.login);

  const login = async ({
    email,
    password,
  }: LoginCredentials): Promise<LoginResult> => {
    setLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const tokens = await cognitoSignIn({ email, password });
      console.log('Cognito tokens:', tokens.idToken);

      // Decode ID token to extract user info including role
      const idTokenPayload = parseJwt(tokens.idToken);

      console.log('User ID:', idTokenPayload?.sub); // Cognito user ID to display

      // Extract role from token payload; fallback safe default or throw error
      const userRole =
        idTokenPayload?.['custom:userType'] ||
        (Array.isArray(idTokenPayload?.['cognito:groups'])
          ? idTokenPayload['cognito:groups'][0]
          : undefined) ||
        idTokenPayload?.role;

      if (!userRole) {
        throw new Error('User role not found in token.');
      }

      const user: AuthUser = {
        email,
        givenName: idTokenPayload?.given_name || '',
        familyName: idTokenPayload?.family_name || '',
        role: userRole,
      };

      loginToStore(user, tokens);

      setIsSuccess(true);

      return { ok: true, tokens };
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetStates = () => {
    setError(null);
    setIsSuccess(false);
  };

  return { login, loading, error, isSuccess, resetStates };
}
