
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { hydrate } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Restore authentication state from localStorage
        await hydrate();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Could add error reporting here
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [hydrate]);


  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}

