import { APIGatewayProxyEvent } from "aws-lambda";

export interface CognitoTokenPayload {
  sub: string; // User ID
  email?: string;
  email_verified?: boolean;
  aud: string; // Client ID
  iss: string; // Issuer
  exp: number; // Expiration time
  iat: number; // Issued at
  token_use: "id" | "access";
  auth_time: number;
  [key: string]: any;
}

export interface TokenExtractionResult {
  success: boolean;
  userId?: string;
  email?: string;
  error?: string;
  payload?: CognitoTokenPayload;
}

/**
 * Extracts and validates Cognito ID token from Authorization header
 * @param event API Gateway event
 * @returns Token extraction result with userId if successful
 */
export function extractUserIdFromToken(
  event: APIGatewayProxyEvent
): TokenExtractionResult {
  try {
    // Get Authorization header (case-insensitive)
    const authHeader =
      event.headers.Authorization ||
      event.headers.authorization ||
      event.headers["Authorization"];

    if (!authHeader) {
      return {
        success: false,
        error: "Missing Authorization header",
      };
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith("Bearer ")) {
      return {
        success: false,
        error: "Invalid Authorization header format. Expected 'Bearer <token>'",
      };
    }

    // Extract the token
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token) {
      return {
        success: false,
        error: "Empty token in Authorization header",
      };
    }

    // Decode JWT payload (without verification for now)
    // In production, you should verify the token signature
    const payload = decodeJWTPayload(token);

    if (!payload) {
      return {
        success: false,
        error: "Invalid JWT token format",
      };
    }

    // Validate required fields
    if (!payload.sub) {
      return {
        success: false,
        error: "Token missing user ID (sub claim)",
      };
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return {
        success: false,
        error: "Token has expired",
      };
    }

    // Validate token type (should be ID token for user info)
    if (payload.token_use && payload.token_use !== "id") {
      return {
        success: false,
        error: "Invalid token type. Expected ID token",
      };
    }

    return {
      success: true,
      userId: payload.sub,
      email: payload.email,
      payload,
    };
  } catch (error) {
    return {
      success: false,
      error: `Token extraction failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Decodes JWT payload without signature verification
 * Note: In production, you should verify the token signature against Cognito's public keys
 * @param token JWT token
 * @returns Decoded payload or null if invalid
 */
function decodeJWTPayload(token: string): CognitoTokenPayload | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];

    // Add padding if needed for base64 decoding
    const paddedPayload = payload + "=".repeat((4 - (payload.length % 4)) % 4);

    // Decode base64
    const decodedPayload = Buffer.from(paddedPayload, "base64").toString(
      "utf-8"
    );

    return JSON.parse(decodedPayload) as CognitoTokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Validates if the token belongs to the expected user
 * @param tokenUserId User ID from token
 * @param expectedUserId Expected user ID
 * @returns True if user IDs match
 */
export function validateTokenUser(
  tokenUserId: string,
  expectedUserId?: string
): boolean {
  if (!expectedUserId) {
    return true; // No validation needed if no expected user
  }

  // Clean up user IDs for comparison
  const cleanTokenUserId = tokenUserId.startsWith("USER#")
    ? tokenUserId.substring(5)
    : tokenUserId;
  const cleanExpectedUserId = expectedUserId.startsWith("USER#")
    ? expectedUserId.substring(5)
    : expectedUserId;

  return cleanTokenUserId === cleanExpectedUserId;
}
