import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export interface KYCUploadEvent extends APIGatewayProxyEvent {
  body: string;
}

export interface UploadRequest {
  documentType: "passport" | "driver_license" | "national_id" | "utility_bill";
  fileName: string;
  fileSize: number;
  contentType: string;
  userId: string;
}

export interface PresignedUrlRequest {
  documentType: "passport" | "driver_license" | "national_id" | "utility_bill";
  fileName: string;
  contentType: string;
  userId: string;
}

export interface UploadResponse {
  documentId: string;
  uploadUrl?: string;
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

export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png", 
  "application/pdf"
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const DOCUMENT_TYPES = [
  "passport",
  "driver_license", 
  "national_id",
  "utility_bill"
] as const;