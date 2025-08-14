import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export interface KYCUploadEvent extends APIGatewayProxyEvent {
  body: string;
}

export interface DirectUploadRequest {
  documentType: "passport" | "driver_license" | "national_id" | "utility_bill";
  fileName: string;
  contentType: string;
  userId: string;
  fileContent: string; // base64 encoded file content
}

export interface UploadResponse {
  documentId: string;
  message: string;
}

export interface KYCDocument {
  PK: string; // USER#userId
  SK: string; // DOCUMENT#documentId
  GSI1PK: string; // KYC#status
  GSI1SK: string; // timestamp
  GSI2PK: string; // DOCUMENT#documentType
  GSI2SK: string; // timestamp
  documentId: string;
  userId: string;
  documentType: "passport" | "driver_license" | "national_id" | "utility_bill";
  fileName: string;
  fileSize: number;
  contentType: string;
  s3Key: string;
  status: "uploaded" | "pending_review" | "approved" | "rejected";
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  metadata?: Record<string, any>;
}

// Legacy constants - moved to file-validation.ts
// Kept for backward compatibility if needed elsewhere
