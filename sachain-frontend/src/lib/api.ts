// // lib/api.ts
// import { useAuthStore } from "@/store/authStore";

// const baseUrl = process.env.NEXT_PUBLIC_KYC_API_BASE;

// async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
//   // Get tokens from auth store
//   const tokens = useAuthStore.getState().tokens;
  
//   console.log("🔍 API Debug Info:");
//   console.log("- Base URL:", baseUrl);
//   console.log("- Full URL:", baseUrl + url);
//   console.log("- Tokens available:", !!tokens);
//   console.log("- Access token:", tokens?.accessToken ? "Present" : "Missing");
  
//   const headers: Record<string, string> = {
//     "Content-Type": "application/json",
//   };

//   // Add Authorization header if tokens are available
//   if (tokens?.accessToken) {
//     headers.Authorization = `Bearer ${tokens.accessToken}`;
//     console.log("✅ Authorization header added");
//   } else {
//     console.log("❌ No access token - request will be unauthorized");
//   }

//   console.log("📤 Request headers:", headers);
//   console.log("📤 Request options:", options);

//   try {
//     const res = await fetch(baseUrl + url, {
//       ...options,
//       headers: {
//         ...headers,
//         ...(options?.headers || {}),
//       },
//     });

//     console.log("📥 Response status:", res.status);
//     console.log("📥 Response headers:", Object.fromEntries(res.headers.entries()));

//     if (!res.ok) {
//       // Handle 401 Unauthorized specifically
//       if (res.status === 401) {
//         console.log("🚫 401 Unauthorized - logging out user");
//         useAuthStore.getState().logout();
//         throw new Error("Authentication failed. Please log in again.");
//       }

//       const errorData = await res.json().catch(() => null);
//       console.log("❌ Error response data:", errorData);
//       throw new Error(
//         errorData?.message || `API request failed with status ${res.status}`
//       );
//     }

//     console.log("✅ Request successful");
//     return res.json();
//   } catch (error) {
//     console.log("💥 Request failed:", error);
//     throw error;
//   }
// }

// export default apiFetch;


// lib/api.ts - TEMPORARY VERSION FOR TESTING
import { useAuthStore } from "@/store/authStore";

const baseUrl = process.env.NEXT_PUBLIC_KYC_API_BASE;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const tokens = useAuthStore.getState().tokens;
  
  console.log("🔍 API Debug Info:");
  console.log("- Base URL:", baseUrl);
  console.log("- Full URL:", baseUrl + url);
  console.log("- Tokens available:", !!tokens);
  console.log("- Access token:", tokens?.accessToken ? "Present" : "Missing");
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add Authorization header if tokens are available
  if (tokens?.accessToken) {
    headers.Authorization = `Bearer ${tokens.accessToken}`;
    console.log("✅ Authorization header added");
  } else {
    console.log("❌ No access token - request will be unauthorized");
  }

  console.log("📤 Request headers:", headers);
  console.log("📤 Request options:", options);

  try {
    const res = await fetch(baseUrl + url, {
      ...options,
      mode: 'cors', // Explicitly set CORS mode
      headers: {
        ...headers,
        ...(options?.headers || {}),
      },
    });

    console.log("📥 Response status:", res.status);
    console.log("📥 Response headers:", Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      // Try to get response text for debugging
      let errorData;
      const contentType = res.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await res.json();
        } catch (e) {
          errorData = await res.text();
        }
      } else {
        errorData = await res.text();
      }
      
      console.log("❌ Error response data:", errorData);
      console.log("❌ Error status:", res.status);
      console.log("❌ Error statusText:", res.statusText);

      // Handle 401 Unauthorized specifically
      if (res.status === 401) {
        console.log("🚫 401 Unauthorized - logging out user");
        useAuthStore.getState().logout();
        throw new Error("Authentication failed. Please log in again.");
      }

      throw new Error(
        typeof errorData === 'string' ? errorData : 
        errorData?.message || 
        `API request failed with status ${res.status}`
      );
    }

    console.log("✅ Request successful");
    return res.json();
  } catch (error) {
    console.log("💥 Request failed:", error);
    
    // Check if it's a CORS error specifically
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.log("🚫 This appears to be a CORS error - check your API Gateway CORS configuration");
      throw new Error("CORS error: API Gateway needs CORS configuration for localhost:3001");
    }
    
    throw error;
  }
}

export default apiFetch;