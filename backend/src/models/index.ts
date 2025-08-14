// Data models for DynamoDB Single Table Design
// These interfaces define the structure of data stored in DynamoDB

// Export compliance models
export * from "./compliance";

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
  lastLoginAt?: string;
  emailVerified: boolean;

  // GSI1 attributes for KYC status queries
  GSI1PK: string; // KYC_STATUS#${kycStatus}
  GSI1SK: string; // ${createdAt}
}

export interface KYCDocument {
  PK: string; // USER#${userId}
  SK: string; // KYC#${documentId}
  documentId: string;
  userId: string;
  documentType: "national_id";
  s3Bucket: string;
  s3Key: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  status: "uploaded" | "pending" | "approved" | "rejected";
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewComments?: string;
  expiresAt?: string; // For document expiration

  // GSI2 attributes for document status queries
  GSI2PK: string; // DOCUMENT_STATUS#${status}
  GSI2SK: string; // ${uploadedAt}
}

export interface AuditLog {
  PK: string; // AUDIT#${date}
  SK: string; // ${timestamp}#${userId}#${action}
  userId: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  result: "success" | "failure";
  errorMessage?: string;
  details?: Record<string, any>;
}

// Helper types for creating new records
export interface CreateUserProfileInput {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType: "entrepreneur" | "investor";
  emailVerified: boolean;
}

export interface CreateKYCDocumentInput {
  userId: string;
  documentType: "national_id";
  s3Bucket: string;
  s3Key: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface CreateAuditLogInput {
  userId: string;
  action: string;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  result: "success" | "failure";
  errorMessage?: string;
  details?: Record<string, any>;
}

// Query result types
export interface QueryResult<T> {
  items: T[];
  lastEvaluatedKey?: Record<string, any>;
  count: number;
}

export interface PaginationOptions {
  limit?: number;
  exclusiveStartKey?: Record<string, any>;
}

// Update types
export interface UpdateUserProfileInput {
  userId: string;
  firstName?: string;
  lastName?: string;
  kycStatus?: "not_started" | "pending" | "approved" | "rejected";
  lastLoginAt?: string;
}

export interface UpdateKYCDocumentInput {
  userId: string;
  documentId: string;
  status?: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewComments?: string;
}
