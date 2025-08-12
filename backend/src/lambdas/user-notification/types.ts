/**
 * Type definitions for User Notification Lambda
 */

export interface KYCStatusChangeEvent {
  eventType: "KYC_STATUS_CHANGED";
  userId: string;
  documentId: string;
  newStatus: "approved" | "rejected";
  oldStatus?: string;
  reviewedBy: string;
  reviewComments?: string;
  timestamp: string;
}

export interface UserProfile {
  PK: string; // USER#${userId}
  SK: string; // PROFILE
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType: "entrepreneur" | "investor";
  kycStatus: "not_started" | "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  notificationPreferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  kycUpdates: boolean;
  marketingEmails: boolean;
}

export interface EmailNotification {
  email: string;
  subject: string;
  message: string;
  timestamp: string;
  notificationType: "kyc_approval" | "kyc_rejection" | "kyc_update";
  userId: string;
  documentId?: string;
}

export interface NotificationMetrics {
  metricName: string;
  value: number;
  dimensions: Record<string, string>;
  timestamp: string;
}

export interface LambdaResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

export interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  requestId?: string;
}
