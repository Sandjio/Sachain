// Types for Admin Review Lambda function

export interface AdminReviewRequest {
  userId: string;
  documentId: string;
  comments?: string;
}

export interface AdminReviewResponse {
  message: string;
  documentId: string;
  status: "approved" | "rejected";
  reviewedBy: string;
  reviewedAt: string;
  comments?: string;
}

// Base event interface for all KYC events
export interface BaseKYCEvent {
  eventId: string;
  userId: string;
  documentId: string;
  timestamp: string;
  source: "sachain.kyc";
  version: "1.0";
}

// KYC Status Change Event - published when document status changes
export interface KYCStatusChangeEvent extends BaseKYCEvent {
  eventType: "KYC_STATUS_CHANGED";
  previousStatus: "not_started" | "pending" | "approved" | "rejected";
  newStatus: "not_started" | "pending" | "approved" | "rejected";
  reviewedBy: string;
  reviewComments?: string;
  documentType: "national_id";
  userType: "entrepreneur" | "investor";
}

// KYC Document Uploaded Event - published when user uploads a document
export interface KYCDocumentUploadedEvent extends BaseKYCEvent {
  eventType: "KYC_DOCUMENT_UPLOADED";
  documentType: "national_id";
  fileSize: number;
  mimeType: string;
  s3Key: string;
  userType: "entrepreneur" | "investor";
}

// KYC Review Started Event - published when admin starts reviewing
export interface KYCReviewStartedEvent extends BaseKYCEvent {
  eventType: "KYC_REVIEW_STARTED";
  reviewedBy: string;
  documentType: "national_id";
}

// KYC Review Completed Event - published when admin completes review
export interface KYCReviewCompletedEvent extends BaseKYCEvent {
  eventType: "KYC_REVIEW_COMPLETED";
  reviewedBy: string;
  reviewResult: "approved" | "rejected";
  reviewComments?: string;
  documentType: "national_id";
  processingTimeMs: number;
}

// Union type for all KYC events
export type KYCEvent =
  | KYCStatusChangeEvent
  | KYCDocumentUploadedEvent
  | KYCReviewStartedEvent
  | KYCReviewCompletedEvent;

// Event schema validation interfaces
export interface EventSchema {
  eventType: string;
  version: string;
  requiredFields: string[];
  optionalFields: string[];
}

export const KYC_EVENT_SCHEMAS: Record<string, EventSchema> = {
  KYC_STATUS_CHANGED: {
    eventType: "KYC_STATUS_CHANGED",
    version: "1.0",
    requiredFields: [
      "eventId",
      "userId",
      "documentId",
      "timestamp",
      "source",
      "version",
      "eventType",
      "previousStatus",
      "newStatus",
      "reviewedBy",
      "documentType",
      "userType",
    ],
    optionalFields: ["reviewComments"],
  },
  KYC_DOCUMENT_UPLOADED: {
    eventType: "KYC_DOCUMENT_UPLOADED",
    version: "1.0",
    requiredFields: [
      "eventId",
      "userId",
      "documentId",
      "timestamp",
      "source",
      "version",
      "eventType",
      "documentType",
      "fileSize",
      "mimeType",
      "s3Key",
      "userType",
    ],
    optionalFields: [],
  },
  KYC_REVIEW_STARTED: {
    eventType: "KYC_REVIEW_STARTED",
    version: "1.0",
    requiredFields: [
      "eventId",
      "userId",
      "documentId",
      "timestamp",
      "source",
      "version",
      "eventType",
      "reviewedBy",
      "documentType",
    ],
    optionalFields: [],
  },
  KYC_REVIEW_COMPLETED: {
    eventType: "KYC_REVIEW_COMPLETED",
    version: "1.0",
    requiredFields: [
      "eventId",
      "userId",
      "documentId",
      "timestamp",
      "source",
      "version",
      "eventType",
      "reviewedBy",
      "reviewResult",
      "documentType",
      "processingTimeMs",
    ],
    optionalFields: ["reviewComments"],
  },
};

export type AdminAction = "approve" | "reject" | "get_documents";

export interface GetDocumentsRequest {
  status?: "pending" | "approved" | "rejected";
  limit?: number;
  lastEvaluatedKey?: Record<string, any>;
}

export interface GetDocumentsResponse {
  documents: any[];
  count: number;
  lastEvaluatedKey?: Record<string, any>;
}
