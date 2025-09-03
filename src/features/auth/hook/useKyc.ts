// import { useState } from "react";
// import { uploadKycDocument } from "../core/kycService";

// export function useKyc(idToken: string | null) {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const upload = async (file: File, documentType?: string) => {
//     if (!idToken) throw new Error("No ID token available");

//     setLoading(true);
//     setError(null);

//     try {
//       const res = await uploadKycDocument({
//   idToken,
//   file,
//   documentType: documentType as "national_id" | "passport" | "driver_license",
// });

//       return res;
//     } catch (err: any) {
//       setError(err.message || "Upload failed");
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   };

//   return { upload, loading, error };
// }


// src/features/auth/hook/useKyc.ts
// import { useState } from "react";

// export type DocumentType = "national_id" | "passport" | "driver_license";

// interface UploadKycParams {
//   idToken: string;
//   file: File;
//   documentType?: DocumentType;
// }

// export function useKyc() {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const uploadDocument = async ({ idToken, file, documentType = "national_id" }: UploadKycParams) => {
//     setLoading(true);
//     setError(null);

//     try {
//       // convert file to base64
//       const fileContent = await toBase64(file);

//       const res = await fetch(`${process.env.NEXT_PUBLIC_KYC_BASE_URL}/kyc/upload`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${idToken}`,
//         },
//         body: JSON.stringify({
//           documentType,
//           fileName: file.name,
//           contentType: file.type,
//           fileContent,
//         }),
//       });

//       if (!res.ok) {
//         throw new Error("Failed to upload document");
//       }

//       return await res.json();
//     } catch (err: any) {
//       setError(err.message || "Upload failed");
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   };

//   return { uploadDocument, loading, error };
// }

// // helper to convert file to base64
// function toBase64(file: File): Promise<string> {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.readAsDataURL(file);
//     reader.onload = () => {
//       const result = reader.result as string;
//       resolve(result.split(",")[1]); // remove `data:*/*;base64,`
//     };
//     reader.onerror = (error) => reject(error);
//   });
// }

// // src/features/auth/hook/useKyc.ts
// import { useState } from "react";

// export type DocumentType = "national_id" | "passport" | "driver_license";

// interface UploadDocumentParams {
//   idToken: string;
//   file: File;
//   documentType: DocumentType;
// }

// export function useKyc() {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const uploadDocument = async ({ idToken, file, documentType }: UploadDocumentParams) => {
//     setLoading(true);
//     setError(null);

//     try {
//       // Convert file to Base64
//       const fileContent = await new Promise<string>((resolve, reject) => {
//         const reader = new FileReader();
//         reader.readAsDataURL(file);
//         reader.onload = () => {
//           const base64String = (reader.result as string).split(",")[1]; // remove data:*/*;base64,
//           resolve(base64String);
//         };
//         reader.onerror = (err) => reject(err);
//       });

//       const response = await fetch(`${process.env.NEXT_PUBLIC_KYC_BASE_URL}/kyc/upload`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${idToken}`,
//         },
//         body: JSON.stringify({
//           documentType,
//           fileName: file.name,
//           contentType: file.type,
//           fileContent,
//         }),
//       });

//       if (!response.ok) {
//         const errText = await response.text();
//         throw new Error(errText || "Failed to upload KYC document");
//       }

//       return { ok: true };
//     } catch (err: any) {
//       setError(err.message || "Upload failed");
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   };

//   return { uploadDocument, loading, error };
// }


// import { useState } from "react";
// import { uploadKycDocument } from "@/features/auth/core/kycService";

// export type DocumentType = "national_id" | "passport" | "driver_license";

// interface UploadDocumentParams {
//   idToken: string;
//   file: File;
//   documentType: DocumentType;
// }

// export function useKyc() {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const uploadDocument = async ({ idToken, file, documentType }: UploadDocumentParams) => {
//     setLoading(true);
//     setError(null);

//     try {
//       const res = await uploadKycDocument({
//         idToken,
//         file,
//         documentType,
//       });

//       return res;
//     } catch (err: any) {
//       setError(err.message || "Upload failed");
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   };

//   return { uploadDocument, loading, error };
// }


// src/features/auth/hook/useKyc.ts
import { useState } from "react";
import { uploadKycDocument } from "@/features/auth/core/kycService";
import { useAuthStore } from "@/store/authStore";

export type DocumentType = "national_id" | "passport" | "driver_license";

interface UploadDocumentParams {
  file: File;
  documentType: DocumentType;
  idToken: string;
}

export function useKyc() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get tokens from auth store
  const tokens = useAuthStore((state) => state.tokens);

  const uploadDocument = async ({ file, documentType, idToken }: UploadDocumentParams) => {
    setLoading(true);
    setError(null);

    try {
      // Check if we have tokens
      if (!tokens?.idToken) {
        
        throw new Error("No authentication token available. Please login first.");
      }
console.log("Using ID Token:", tokens.idToken); // Debug log to verify token presence
      const res = await uploadKycDocument({
        idToken: tokens.idToken,
        file,
        documentType,
      });

      return res;
    } catch (err: any) {
      setError(err.message || "Upload failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    uploadDocument, 
    loading, 
    error,
    hasToken: !!tokens?.idToken // Helper to check if token is available
  };
}