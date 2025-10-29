// src/features/auth/hook/useKyc.ts
import { useState } from 'react';
import { uploadKycDocument } from '@/features/auth/core/kycService';
import { useAuthStore } from '@/store/authStore';

export type DocumentType = 'national_id' | 'passport' | 'driver_license';

interface UploadDocumentParams {
  file: File;
  documentType: DocumentType;
  idToken: string;
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
  return 'Upload failed';
}

export function useKyc() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get tokens from auth store
  const tokens = useAuthStore((state) => state.tokens);

  const uploadDocument = async ({
    file,
    documentType,
    idToken,
  }: UploadDocumentParams) => {
    setLoading(true);
    setError(null);

    try {
      // Check if we have tokens
      if (!tokens?.idToken) {
        throw new Error(
          'No authentication token available. Please login first.'
        );
      }

      console.log('Using ID Token:', tokens.idToken);

      const res = await uploadKycDocument({
        idToken: tokens.idToken,
        file,
        documentType,
      });

      return res;
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    uploadDocument,
    loading,
    error,
    hasToken: !!tokens?.idToken,
  };
}
