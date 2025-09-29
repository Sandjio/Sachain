import { RechargeRequest, RechargeResponse } from './rechargeTypes';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const apiBase =
  process.env.NODE_ENV === "development"
    ? "/api"
    : API_URL; // to avoid CORS issues in development

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