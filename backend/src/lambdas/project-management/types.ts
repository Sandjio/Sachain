import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export interface ProjectManagementEvent extends APIGatewayProxyEvent {
  body: string;
}

// Request types
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  category?: string;
  targetFundingGoal?: number;
  pricePerStock?: number;
  coverImageUrl?: string;
}

export interface ProjectStatusTransitionRequest {
  newStatus: "draft" | "minting" | "active" | "paused" | "completed";
  reason?: string;
}

// Response types
export interface UpdateProjectResponse {
  projectId: string;
  message: string;
  changes: string[];
}

export interface ProjectStatusTransitionResponse {
  projectId: string;
  message: string;
  previousStatus: string;
  newStatus: string;
}

export interface DeleteProjectResponse {
  projectId: string;
  message: string;
}

// Error handling
export class ProjectManagementError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = "ProjectManagementError";
  }
}

export const ErrorCodes = {
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
  INVALID_PROJECT_STATUS: "INVALID_PROJECT_STATUS",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  INVALID_PROJECT_DATA: "INVALID_PROJECT_DATA",
  CASCADE_DELETION_FAILED: "CASCADE_DELETION_FAILED",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Status transition validation
export interface ProjectStatusTransition {
  isValid: boolean;
  error?: string;
  allowedTransitions: string[];
}

// Event types for EventBridge
export interface ProjectUpdatedEventDetail {
  eventType: "PROJECT_UPDATED";
  projectId: string;
  entrepreneurId: string;
  changes: Record<string, any>;
  updatedAt: string;
}

export interface ProjectStatusChangedEventDetail {
  eventType: "PROJECT_STATUS_CHANGED";
  projectId: string;
  entrepreneurId: string;
  previousStatus: string;
  newStatus: string;
  changedAt: string;
}

export interface ProjectDeletedEventDetail {
  eventType: "PROJECT_DELETED";
  projectId: string;
  entrepreneurId: string;
  projectName: string;
  deletedAt: string;
}

// Validation result types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
