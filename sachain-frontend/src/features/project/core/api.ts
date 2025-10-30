import { useAuthStore } from '@/store/authStore';
import { MintStocksStatus } from './types';

const API_URL = process.env.NEXT_PUBLIC_KYC_API_BASE;

function decodeHtmlEntities(str: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

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

export async function getProjects() {
  const tokens = useAuthStore.getState().tokens;

  if (!tokens?.idToken) {
    throw new Error('No token available — user is not authenticated.');
  }

  const res = await fetch(`${API_URL}/projects`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.idToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error: ${res.status} - ${errorText}`);
  }

  const json = await res.json();
  console.log('Fetched projects:', json);

  if (!Array.isArray(json.projects)) return [];

  // Decode coverImageUrl for each project
  return json.projects.map((project: any) => ({
    ...project,
    coverImageUrl: project.coverImageUrl
      ? decodeHtmlEntities(project.coverImageUrl)
      : undefined,
  }));
}

export async function getProjectById(projectId: string) {
  const tokens = useAuthStore.getState().tokens;

  if (!tokens?.idToken) {
    throw new Error('No token available — user is not authenticated.');
  }

  const res = await fetch(`${API_URL}/projects/${projectId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.idToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error: ${res.status} - ${errorText}`);
  }

  return res.json();
}

export async function updateProject(projectId: string, payload: any) {
  const tokens = useAuthStore.getState().tokens;

  if (!tokens?.idToken) {
    throw new Error('No token available — user is not authenticated.');
  }

  const res = await fetch(`${API_URL}/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.idToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error: ${res.status} - ${errorText}`);
  }

  return res.json();
}

export async function deleteProject(projectId: string) {
  const tokens = useAuthStore.getState().tokens;

  if (!tokens?.idToken) {
    throw new Error('No token available — user is not authenticated.');
  }

  const res = await fetch(`${API_URL}/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.idToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error: ${res.status} - ${errorText}`);
  }

  return true;
}

export async function mintStocks(
  projectId: string,
  walletAddress: string,
  privateKey: string
) {
  const tokens = useAuthStore.getState().tokens;

  if (!tokens?.idToken) {
    throw new Error('No token available — user is not authenticated.');
  }

  //const apiBase = process.env.NODE_ENV === 'development' ? '/api' : API_URL;

  const res = await fetch(`${API_URL}/projects/${projectId}/mint-stocks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.idToken}`,
    },
    body: JSON.stringify({ walletAddress, privateKey }),
  });

  console.log('Minting request payload:', { walletAddress });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error: ${res.status} - ${errorText}`);
  }

  return res.json(); // expected to match your backend's success response format
}

export async function getMintStocksStatus(
  projectId: string
): Promise<MintStocksStatus> {
  const tokens = useAuthStore.getState().tokens;
  if (!tokens?.idToken) {
    throw new Error('No token available — user not authenticated.');
  }

  // Use /api proxy in development, direct AWS in production
  //const apiBase = process.env.NODE_ENV === 'development' ? '/api' : API_URL;

  const res = await fetch(
    `${API_URL}/projects/${projectId}/mint-stocks/status`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.idToken}`,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status} - ${text}`);
  }

  return res.json() as Promise<MintStocksStatus>;
}

export async function buyProjectShares(
  projectId: string,
  investorPrivateKey: string,
  sharesRequested: number,
  investorWalletAddress: string
) {
  const tokens = useAuthStore.getState().tokens;

  if (!tokens?.idToken) {
    throw new Error('No token available — user not authenticated.');
  }

  //const apiBase = process.env.NODE_ENV === 'development' ? '/api' : API_URL;

  const res = await fetch(`${API_URL}/projects/${projectId}/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.idToken}`,
    },
    body: JSON.stringify({
      investorPrivateKey,
      sharesRequested,
      investorWalletAddress,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error: ${res.status} - ${errorText}`);
  }

  return res.json();
}
