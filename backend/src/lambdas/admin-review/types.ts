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

export interface KYCStatusChangeEvent {
  userId: string;
  documentId: string;
  previousStatus: "pending" | "approved" | "rejected";
  newStatus: "pending" | "approved" | "rejected";
  reviewedBy: string;
  reviewComments?: string;
  timestamp: string;
}

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