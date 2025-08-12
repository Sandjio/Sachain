// API Response Types for Sachain Frontend SDK

export interface UserProfile {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType: "entrepreneur" | "investor";
  kycStatus: "not_started" | "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  emailVerified: boolean;
}

export interface KYCDocument {
  documentId: string;
  userId: string;
  documentType: "passport" | "driver_license" | "national_id" | "utility_bill";
  fileName: string;
  fileSize: number;
  contentType: string;
  status: "uploaded" | "pending_review" | "approved" | "rejected";
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface UploadRequest {
  documentType: "passport" | "driver_license" | "national_id" | "utility_bill";
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface UploadResponse {
  documentId: string;
  uploadUrl?: string;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  count: number;
  lastEvaluatedKey?: Record<string, any>;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}