// src/features/auth/types/authTypes.ts

// Payload we send to signup
export interface SignupPayload {
  email: string;
  password: string;
  givenName: string;
  familyName: string;
  role: "startup" | "investor";
}

// Payload for confirming signup
export interface ConfirmSignupPayload {
  email: string;
  code: string;
}

// Payload for login
export interface LoginPayload {
  email: string;
  password: string;
}

// Representation of a logged in user (from Cognito attributes)
export interface AuthUser {
  email: string;
  givenName: string;
  familyName: string;
  role: "startup" | "investor";
}
