import { RechargeRequest, RechargeResponse } from './rechargeTypes';
import { useAuthStore } from '@/store/authStore';

//const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_URL = process.env.NEXT_PUBLIC_KYC_API_BASE || "";
//const apiBase = API_URL;

const apiBase =
  process.env.NODE_ENV === "development"
    ? "/api/om-payments"
    : API_URL; 

export async function initiateRecharge(
  request: RechargeRequest
): Promise<RechargeResponse> {
  const tokens = useAuthStore.getState().tokens;

  const response = await fetch(`${apiBase}/om-payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens?.idToken}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorText: string;
    try {
      errorText = (await response.json()).message;
    } catch {
      errorText = await response.text();
    }
    throw new Error(errorText || "Recharge request failed");
  }

  return response.json() as Promise<RechargeResponse>;
}



// import { RechargeRequest, RechargeResponse } from './rechargeTypes';
// import { useAuthStore } from '@/store/authStore';

// const API_URL = process.env.NEXT_PUBLIC_KYC_API_BASE || "";

// // Use relative path in development to bypass CORS via Next.js rewrites
// const apiBase =
//   process.env.NODE_ENV === "development"
//     ? "/api" // This will be rewritten by Next.js
//     : API_URL; // Use direct URL in production

// export async function initiateRecharge(
//   request: RechargeRequest
// ): Promise<RechargeResponse> {
//   const tokens = useAuthStore.getState().tokens;

//   const response = await fetch(`${apiBase}/om-payments`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       ...(tokens?.idToken && { Authorization: `Bearer ${tokens.idToken}` }),
//     },
//     body: JSON.stringify(request),
//   });

//   if (!response.ok) {
//     let errorText: string;
//     try {
//       const errorData = await response.json();
//       errorText = errorData.message || errorData.error || "Recharge request failed";
//     } catch {
//       errorText = await response.text();
//     }
//     throw new Error(errorText || "Recharge request failed");
//   }

//   return response.json() as Promise<RechargeResponse>;
// }
