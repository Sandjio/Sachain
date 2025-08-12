// TypeScript interfaces for Sachain API integration

export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
}

// Authentication types
export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

export interface UserSession {
  userId: string;
  email: string;
  userType: 'entrepreneur' | 'investor';
  kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected';
  tokens: AuthTokens;
}

// KYC Upload types
export interface PresignedUrlRequest {
  userId: string;
  documentType: 'passport' | 'driver_license' | 'national_id' | 'utility_bill';
  fileName: string;
  contentType: 'image/jpeg' | 'image/png' | 'application/pdf';
}

export interface DirectUploadRequest extends PresignedUrlRequest {
  fileContent: string; // base64 encoded
}

export interface UploadProcessingRequest {
  documentId: string;
  userId: string;
  s3Key: string;
  fileSize: number;
}

export interface UploadResponse {
  documentId: string;
  uploadUrl?: string;
  message: string;
}

// Admin Review types
export interface AdminReviewRequest {
  userId: string;
  documentId: string;
  comments?: string;
}

export interface AdminReviewResponse {
  message: string;
  documentId: string;
  status: 'approved' | 'rejected';
  reviewedBy: string;
  reviewedAt: string;
  comments?: string;
}

export interface GetDocumentsRequest {
  status?: 'pending' | 'approved' | 'rejected';
  limit?: number;
  lastEvaluatedKey?: Record<string, any>;
}

export interface GetDocumentsResponse {
  documents: KYCDocument[];
  count: number;
  lastEvaluatedKey?: Record<string, any>;
}

// Data models
export interface KYCDocument {
  documentId: string;
  userId: string;
  documentType: 'national_id';
  originalFileName: string;
  fileSize: number;
  mimeType: 'image/jpeg' | 'image/png' | 'application/pdf';
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewComments?: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType: 'entrepreneur' | 'investor';
  kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  emailVerified: boolean;
}

// Error types
export interface ApiError {
  message: string;
  requestId?: string;
  details?: {
    field?: string;
    code?: string;
    [key: string]: any;
  };
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  fileInfo?: {
    size: number;
    mimeType: string;
    extension: string;
  };
}

// SDK method options
export interface UploadOptions {
  onProgress?: (progress: number) => void;
  usePresignedUrl?: boolean;
  validateFile?: boolean;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

// Event types for EventBridge integration
export interface KYCStatusChangeEvent {
  eventId: string;
  userId: string;
  documentId: string;
  timestamp: string;
  source: 'sachain.kyc';
  version: '1.0';
  eventType: 'KYC_STATUS_CHANGED';
  previousStatus: 'not_started' | 'pending' | 'approved' | 'rejected';
  newStatus: 'not_started' | 'pending' | 'approved' | 'rejected';
  reviewedBy: string;
  reviewComments?: string;
  documentType: 'national_id';
  userType: 'entrepreneur' | 'investor';
}

export interface KYCDocumentUploadedEvent {
  eventId: string;
  userId: string;
  documentId: string;
  timestamp: string;
  source: 'sachain.kyc';
  version: '1.0';
  eventType: 'KYC_DOCUMENT_UPLOADED';
  documentType: 'national_id';
  fileSize: number;
  mimeType: string;
  s3Key: string;
  userType: 'entrepreneur' | 'investor';
}

// Utility types
export type DocumentType = 'passport' | 'driver_license' | 'national_id' | 'utility_bill';
export type ContentType = 'image/jpeg' | 'image/png' | 'application/pdf';
export type KYCStatus = 'not_started' | 'pending' | 'approved' | 'rejected';
export type UserType = 'entrepreneur' | 'investor';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';

// Constants
export const ALLOWED_FILE_TYPES: ContentType[] = [
  'image/jpeg',
  'image/png',
  'application/pdf'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const DOCUMENT_TYPES: DocumentType[] = [
  'passport',
  'driver_license',
  'national_id',
  'utility_bill'
];

export const FILE_EXTENSIONS: Record<ContentType, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf']
};

// HTTP method types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Request configuration
export interface RequestConfig {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

// Response wrapper
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  requestId?: string;
}