/**
 * TypeScript interfaces for Cognito Post-Authentication Lambda trigger
 */

export interface PostAuthEvent {
  version: string;
  region: string;
  userPoolId: string;
  userName: string;
  callerContext: {
    awsSdkVersion: string;
    clientId: string;
  };
  triggerSource: string;
  request: {
    userAttributes: Record<string, string>;
    clientMetadata?: Record<string, string>;
  };
  response: {};
}

export interface UserReference {
  PK: string; // USER#${userId}
  SK: string; // PROFILE
  userId: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  kycStatus: "not_started" | "pending" | "approved" | "rejected";
  userType: "entrepreneur" | "investor";
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  lastLoginAt?: string;
}

export interface PostAuthResponse {
  version: string;
  region: string;
  userPoolId: string;
  userName: string;
  callerContext: {
    awsSdkVersion: string;
    clientId: string;
  };
  triggerSource: string;
  request: {
    userAttributes: Record<string, string>;
    clientMetadata?: Record<string, string>;
  };
  response: {};
}
