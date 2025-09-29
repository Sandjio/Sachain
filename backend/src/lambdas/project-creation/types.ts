import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export interface ProjectCreationEvent extends APIGatewayProxyEvent {
  body: string;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  category: string;
  stockSupply: number;
  targetFundingGoal?: number;
  pricePerStock?: number;
  coverImageUrl?: string;
}

export interface CreateProjectResponse {
  projectId: string;
  message: string;
  project: {
    id: string;
    name: string;
    description: string;
    category: string;
    stockSupply: number;
    targetFundingGoal?: number;
    pricePerStock?: number;
    status: string;
    createdAt: string;
  };
}

export class ProjectCreationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = "ProjectCreationError";
  }
}

export const ErrorCodes = {
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  INVALID_REQUEST_FORMAT: "INVALID_REQUEST_FORMAT",
  INVALID_PROJECT_DATA: "INVALID_PROJECT_DATA",
  KYC_NOT_VERIFIED: "KYC_NOT_VERIFIED",
  KYC_VALIDATION_ERROR: "KYC_VALIDATION_ERROR",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  PROJECT_NAME_EXISTS: "PROJECT_NAME_EXISTS",
  DATABASE_ERROR: "DATABASE_ERROR",
  EVENT_PUBLISHING_ERROR: "EVENT_PUBLISHING_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Event types for EventBridge
export interface ProjectCreatedEventDetail {
  eventType: "PROJECT_CREATED";
  projectId: string;
  entrepreneurId: string;
  projectName: string;
  category: string;
  stockSupply: number;
  status: string;
  createdAt: string;
}

// Validation result types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// KYC validation types
export interface KYCValidationResult {
  isValid: boolean;
  kycStatus: "not_started" | "pending" | "approved" | "rejected";
  error?: string;
}

// Business rule validation types
export interface BusinessRuleValidationResult {
  isValid: boolean;
  error?: string;
  details?: any;
}
