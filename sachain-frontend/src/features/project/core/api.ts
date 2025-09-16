// import { useAuthStore } from '@/store/authStore';

// const API_URL = process.env.NEXT_PUBLIC_KYC_API_BASE;

// export async function createProject(payload: any) {
//   const tokens = useAuthStore.getState().tokens;

//   if (!tokens?.idToken) {
//     throw new Error('No token available — user is not authenticated.');
//   }

//   const res = await fetch(`${API_URL}/projects`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${tokens.idToken}`,
//     },
//     body: JSON.stringify(payload),
//   });

//   console.log(payload);

//   if (!res.ok) {
//     const errorText = await res.text();
//     throw new Error(`API error: ${res.status} - ${errorText}`);
//   }

//   return res.json();
// }
// export async function getProjects() {
//   const tokens = useAuthStore.getState().tokens;

//   if (!tokens?.idToken) {
//     throw new Error('No token available — user is not authenticated.');
//   }

//   const res = await fetch(`${API_URL}/projects`, {
//     method: 'GET',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${tokens.idToken}`,
//     },
//   });

//   if (!res.ok) {
//     const errorText = await res.text();
//     throw new Error(`API error: ${res.status} - ${errorText}`);
//   }

//   const json = await res.json();
//   console.log("Fetched projects:", json);

//   // Return the array of projects, not the wrapper object
//   return Array.isArray(json.projects) ? json.projects : [];
//   console
// }




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
  console.log("Fetched projects:", json);
  
  // Return the array of projects, not the wrapper object
  return Array.isArray(json.projects) ? json.projects : [];
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
  
  return true; // DELETE typically returns success status
}


export async function mintStocks(projectId: string, walletAddress: string) {
  const tokens = useAuthStore.getState().tokens;

  if (!tokens?.idToken) {
    throw new Error("No token available — user is not authenticated.");
  }

  // Use relative path for Next.js proxy in development
  const apiBase = process.env.NODE_ENV === 'development'
    ? '/api'
    : API_URL;

  const res = await fetch(`${apiBase}/projects/${projectId}/mint-stocks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.idToken}`,
    },
    body: JSON.stringify({ walletAddress }),
  });

  console.log("Minting request payload:", { walletAddress });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error: ${res.status} - ${errorText}`);
  }

  return res.json(); // expected to match your backend's success response format
}
