import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_KYC_API_BASE;

export async function createProject(payload: any) {
  const tokens = useAuthStore.getState().tokens;

  if (!tokens?.idToken) {
    throw new Error('No token available — user is not authenticated.');
  }

  const res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.idToken}`,
    },
    body: JSON.stringify(payload),
  });

  console.log(payload);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error: ${res.status} - ${errorText}`);
  }

  return res.json();
}
