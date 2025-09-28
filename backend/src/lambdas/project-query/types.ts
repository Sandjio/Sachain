import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Project, ProjectStats, StockNFT } from "../../models/project";

export interface ProjectQueryEvent extends APIGatewayProxyEvent {
  pathParameters: {
    projectId?: string;
  };
  queryStringParameters: {
    status?: "draft" | "minting" | "active" | "paused" | "completed";
    entrepreneurId?: string;
    category?: string;
    limit?: string;
    exclusiveStartKey?: string;
    sortBy?: "createdAt" | "name" | "status";
    sortOrder?: "asc" | "desc";
    includeStats?: string;
  };
}

export interface GetProjectsRequest {
  status?: "draft" | "minting" | "active" | "paused" | "completed";
  entrepreneurId?: string;
  category?: string;
  limit?: number;
  exclusiveStartKey?: Record<string, any>;
  sortBy?: "createdAt" | "name" | "status";
  sortOrder?: "asc" | "desc";
  includeStats?: boolean;
}

export interface GetProjectResponse {
  project: ProjectWithStats;
}

export interface GetProjectsResponse {
  projects: ProjectWithStats[];
  pagination: {
    limit: number;
    count: number;
    lastEvaluatedKey?: Record<string, any>;
    hasMore: boolean;
  };
  aggregations?: {
    totalProjects: number;
    projectsByStatus: Record<string, number>;
    projectsByCategory: Record<string, number>;
  };
}

export interface ProjectWithStats extends Project {
  stats?: ProjectStats;
  stocksCount?: number;
  recentActivity?: {
    lastMintedAt?: string;
    lastUpdatedAt: string;
  };
}

export interface ProjectAggregations {
  totalProjects: number;
  projectsByStatus: Record<string, number>;
  projectsByCategory: Record<string, number>;
}

export class ProjectQueryError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = "ProjectQueryError";
  }
}

export const ErrorCodes = {
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  INVALID_QUERY_PARAMETERS: "INVALID_QUERY_PARAMETERS",
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
  DATABASE_ERROR: "DATABASE_ERROR",
  CACHE_ERROR: "CACHE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Cache-related types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface ProjectStatsCache {
  [projectId: string]: CacheEntry<ProjectStats>;
}

export interface AggregationsCache {
  global: CacheEntry<ProjectAggregations>;
  byStartup: {
    [startupId: string]: CacheEntry<ProjectAggregations>;
  };
}

// Query optimization types
export interface QueryMetrics {
  queryType: "gsi" | "scan" | "query";
  indexUsed?: string;
  itemsScanned: number;
  itemsReturned: number;
  duration: number;
  cacheHit?: boolean;
}

export interface OptimizedQueryResult<T> {
  items: T[];
  lastEvaluatedKey?: Record<string, any>;
  count: number;
  metrics: QueryMetrics;
}

// Validation types
export interface QueryValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedParams?: GetProjectsRequest;
}
