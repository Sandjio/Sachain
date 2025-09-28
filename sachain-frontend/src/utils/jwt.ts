// src/utils/jwt.ts
// export function decodeJwt(token: string): any {
//   try {
//     const payload = token.split(".")[1];
//     return JSON.parse(atob(payload));
//   } catch {
//     return null;
//   }
// }


// jwt.ts
export interface JwtPayload {
  // Standard JWT claims
  sub?: string;           // Subject (user ID)
  iss?: string;           // Issuer
  aud?: string | string[]; // Audience
  exp?: number;           // Expiration time
  iat?: number;           // Issued at
  nbf?: number;           // Not before
  jti?: string;           // JWT ID

  // Common custom claims (adjust based on your actual JWT structure)
  email?: string;
  username?: string;
  role?: string;
  permissions?: string[];
  
  // AWS Cognito specific claims (if you're using Cognito)
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  email_verified?: boolean;
  
  // Add any other custom claims your JWT contains
  [key: string]: unknown; // For any additional custom claims
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }
    const decoded = JSON.parse(atob(payload)) as JwtPayload;
    
    // Ensure we return null if decoded is not a valid object
    if (!decoded || typeof decoded !== 'object') {
      return null;
    }
    
    return decoded;
  } catch {
    return null;
  }
}