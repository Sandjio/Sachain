// project-lambda/index.ts
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { createProjectLogger } from "../../utils/structured-logger";
import { ErrorClassifier } from "../../utils/error-handler";
import {
  ProjectEventPublisher,
  createProjectEventPublisher,
} from "../../utils/project-event-publisher";
import { extractUserIdFromToken } from "../../utils/jwt-utils";
import { ProjectRepository } from "../../repositories/project-repository";
import { UserRepository } from "../../repositories/user-repository";
import {
  validateUpdateProjectInput,
  sanitizeProjectInput,
} from "../../utils/project-validation";

//
// Types: adjust imports to point to your existing types files
//
import {
  ProjectQueryEvent,
  GetProjectsRequest,
  GetProjectResponse,
  GetProjectsResponse,
  ProjectQueryError,
  ErrorCodes as QueryErrorCodes,
  ProjectWithStats,
  ProjectAggregations,
  QueryValidationResult,
  OptimizedQueryResult,
  QueryMetrics,
  CacheEntry,
  ProjectStatsCache,
  AggregationsCache,
} from "../project-query/types";

import {
  UpdateProjectRequest,
  UpdateProjectResponse,
  DeleteProjectResponse,
  ProjectStatusTransitionRequest,
  ProjectStatusTransitionResponse,
  ProjectManagementError,
  ErrorCodes as ManagementErrorCodes,
  ProjectStatusTransition,
  ValidationResult,
} from "./types";

import {
  Project,
  ProjectStats,
  UpdateProjectInput,
  ProjectQueryOptions,
} from "../../models/project";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || "default";
const ENVIRONMENT = process.env.ENVIRONMENT!;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

// Cache configuration (from project-query)
const CACHE_TTL_SECONDS = 300; // 5 minutes
const AGGREGATIONS_CACHE_TTL_SECONDS = 600; // 10 minutes

// Logger
const logger = createProjectLogger();

// Repositories & publisher (lazily created for easier testing)
let projectRepository: ProjectRepository | undefined;
let userRepository: UserRepository | undefined;
let projectEventPublisher: ProjectEventPublisher | undefined;

function getProjectRepository(): ProjectRepository {
  if (!projectRepository) {
    projectRepository = new ProjectRepository({
      tableName: TABLE_NAME,
      region: AWS_REGION,
    });
  }
  return projectRepository;
}

export function setProjectRepository(repo: ProjectRepository) {
  projectRepository = repo;
}

function getUserRepository(): UserRepository {
  if (!userRepository) {
    userRepository = new UserRepository({
      tableName: TABLE_NAME,
      region: AWS_REGION,
    });
  }
  return userRepository;
}

export function setUserRepository(repo: UserRepository) {
  userRepository = repo;
}

function getProjectEventPublisher(): ProjectEventPublisher {
  if (!projectEventPublisher) {
    projectEventPublisher = createProjectEventPublisher({
      eventBusName: EVENT_BUS_NAME,
      region: AWS_REGION,
    });
  }
  return projectEventPublisher;
}

export function setProjectEventPublisher(publisher: ProjectEventPublisher) {
  projectEventPublisher = publisher;
}

// In-memory caches (keep from project-query; consider Redis for prod)
let projectStatsCache: ProjectStatsCache = {};
let aggregationsCache: AggregationsCache = {
  global: {
    data: { totalProjects: 0, projectsByStatus: {}, projectsByCategory: {} },
    timestamp: 0,
    ttl: 0,
  },
  byEntrepreneur: {},
};

// Allowed origins helper (keeps previous list)
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3001",
  "https://frontend-sachain-5bda0gd76-joanchacha01gmailcoms-projects.vercel.app",
];
const DEFAULT_ORIGIN = "http://localhost:5173";

const getAllowedOrigin = (event: APIGatewayProxyEvent): string => {
  const origin = event.headers.origin ?? event.headers.Origin ?? "";
  return ALLOWED_ORIGINS.includes(origin) ? origin : DEFAULT_ORIGIN;
};

// ----------------------
// Exported Lambda handler
// ----------------------
export const handler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;
  const allowedOrigin = getAllowedOrigin(event);

  logger.info("Project Lambda triggered", {
    operation: "LambdaInvocation",
    requestId,
    path: event.path,
    httpMethod: event.httpMethod,
    queryStringParameters: event.queryStringParameters,
    pathParameters: event.pathParameters,
  });

  try {
    // Route GET requests (query) separately, otherwise handle management routes
    const method = event.httpMethod?.toUpperCase() || "";
    if (
      method === "GET" ||
      (method === "OPTIONS" &&
        (event.path.includes("/projects") || event.path.includes("/projects/")))
    ) {
      // delegate to combined query handler that also handles OPTIONS
      const result = await handleProjectQuery(event as ProjectQueryEvent);
      const duration = Date.now() - startTime;
      logger.info("Project Lambda completed (query)", {
        operation: "LambdaInvocation",
        requestId,
        duration,
        statusCode: result.statusCode,
      });
      return result;
    } else {
      // management (PUT/DELETE/OPTIONS)
      const result = await routeManagementRequest(event);
      const duration = Date.now() - startTime;
      logger.info("Project Lambda completed (management)", {
        operation: "LambdaInvocation",
        requestId,
        duration,
        statusCode: result.statusCode,
      });
      return result;
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    // Handle known business errors for query or management explicitly
    if (error instanceof ProjectManagementError) {
      logger.warn("Project Management Lambda business logic error", {
        operation: "LambdaInvocation",
        requestId,
        duration,
        errorCode: error.code,
      });

      return {
        statusCode: error.statusCode,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({
          message: error.message,
          code: error.code,
          details: error.details,
          requestId,
        }),
      };
    }

    if (error instanceof ProjectQueryError) {
      logger.warn("Project Query Lambda business logic error", {
        operation: "LambdaInvocation",
        requestId,
        duration,
        errorCode: error.code,
      });

      return {
        statusCode: error.statusCode,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({
          message: error.message,
          code: error.code,
          details: error.details,
          requestId,
        }),
      };
    }

    // Unexpected errors: classify and return
    const errorDetails = ErrorClassifier.classify(error as Error, {
      operation: "LambdaInvocation",
      requestId,
      duration,
    });

    logger.error(
      "Project Lambda failed",
      {
        operation: "LambdaInvocation",
        requestId,
        duration,
        errorCategory: errorDetails.category,
        errorCode: errorDetails.errorCode,
      },
      error as Error
    );

    return {
      statusCode: errorDetails.httpStatusCode || 500,
      headers: corsHeaders(allowedOrigin),
      body: JSON.stringify({
        message: errorDetails.userMessage,
        requestId,
      }),
    };
  }
};

// small helper to keep CORS headers consistent
function corsHeaders(allowedOrigin: string) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
    "Access-Control-Max-Age": "86400",
  };
}

// ----------------------
// Query (GET) handlers (copied/adapted from project-query)
// ----------------------
async function handleProjectQuery(event: ProjectQueryEvent): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;
  const path = event.path;
  const allowedOrigin = getAllowedOrigin(event);

  logger.info("Project query started", {
    operation: "ProjectQuery",
    requestId,
    path,
    httpMethod: event.httpMethod,
  });

  // Handle OPTIONS preflight requests first, before authentication
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(allowedOrigin),
      body: "",
    };
  }

  try {
    // Auth - only for non-OPTIONS requests
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      const duration = Date.now() - startTime;
      logger.warn("Authentication failed", {
        operation: "ProjectQuery",
        requestId,
        error: tokenResult.error,
        duration,
      });

      throw new ProjectQueryError(
        "Authentication failed",
        QueryErrorCodes.AUTHENTICATION_FAILED,
        401,
        { error: tokenResult.error }
      );
    }

    const userId = tokenResult.userId!;

    // Route: single project or list
    if (path.includes("/projects/") && event.pathParameters?.projectId) {
      return await handleGetProject(
        event.pathParameters.projectId,
        userId,
        requestId
      );
    } else {
      return await handleGetProjects(event, userId, requestId);
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof ProjectQueryError) {
      logger.warn("Project query business logic error", {
        operation: "ProjectQuery",
        requestId,
        errorCode: error.code,
        duration,
      });

      return {
        statusCode: error.statusCode,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({
          message: error.message,
          code: error.code,
          details: error.details,
          requestId,
        }),
      };
    }

    // Unexpected errors - rethrow to let outer handler classify them
    throw error;
  }
}

async function handleGetProject(
  projectId: string,
  userId: string,
  requestId: string
): Promise<any> {
  const startTime = Date.now();

  logger.info("Getting single project", {
    operation: "GetProject",
    requestId,
    projectId,
    userId,
  });

  try {
    const project = await getProjectRepository().getProject(projectId);

    if (!project) {
      const duration = Date.now() - startTime;
      logger.warn("Project not found", {
        operation: "GetProject",
        requestId,
        projectId,
        duration,
      });

      throw new ProjectQueryError(
        "Project not found",
        QueryErrorCodes.PROJECT_NOT_FOUND,
        404,
        { projectId }
      );
    }

    const userProfile = await getUserRepository().getUserProfile(userId);
    const canAccess = await checkProjectAccess(
      project,
      userId,
      userProfile?.userType
    );

    if (!canAccess) {
      const duration = Date.now() - startTime;
      logger.warn("Unauthorized project access", {
        operation: "GetProject",
        requestId,
        projectId,
        userId,
        userType: userProfile?.userType,
        duration,
      });

      throw new ProjectQueryError(
        "Unauthorized access to project",
        QueryErrorCodes.UNAUTHORIZED_ACCESS,
        403,
        { projectId, userId }
      );
    }

    const projectWithStats = await enrichProjectWithStats(project, requestId);

    const duration = Date.now() - startTime;
    logger.info("Project retrieved successfully", {
      operation: "GetProject",
      requestId,
      projectId,
      duration,
    });

    const response: GetProjectResponse = { project: projectWithStats };

    const etag = `"${Buffer.from(
      JSON.stringify({
        id: project.projectId,
        updated: project.updatedAt,
        stats: projectWithStats.stats?.lastUpdated,
      })
    ).toString("base64")}"`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        ETag: etag,
        "Last-Modified": new Date(project.updatedAt).toUTCString(),
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof ProjectQueryError) {
      throw error;
    }

    logger.error(
      "Unexpected error during project retrieval",
      {
        operation: "GetProject",
        requestId,
        projectId,
        duration,
      },
      error as Error
    );

    throw new ProjectQueryError(
      "Unable to retrieve project at this time",
      QueryErrorCodes.DATABASE_ERROR,
      503,
      { projectId }
    );
  }
}

async function handleGetProjects(
  event: ProjectQueryEvent,
  userId: string,
  requestId: string
): Promise<any> {
  const startTime = Date.now();
  const allowedOrigin = getAllowedOrigin(event);

  logger.info("Getting projects list", {
    operation: "GetProjects",
    requestId,
    userId,
    queryParams: event.queryStringParameters,
  });

  try {
    const validation = validateQueryParameters(
      event.queryStringParameters || {}
    );
    if (!validation.isValid) {
      const duration = Date.now() - startTime;
      logger.warn("Invalid query parameters", {
        operation: "GetProjects",
        requestId,
        errors: validation.errors,
        duration,
      });

      throw new ProjectQueryError(
        "Invalid query parameters",
        QueryErrorCodes.INVALID_QUERY_PARAMETERS,
        400,
        { errors: validation.errors }
      );
    }

    const queryParams = validation.sanitizedParams!;

    const userProfile = await getUserRepository().getUserProfile(userId);
    const filteredParams = await applyAccessControlFilters(
      queryParams,
      userId,
      userProfile?.userType
    );

    const queryResult = await executeOptimizedQuery(filteredParams, requestId);

    const enrichedProjects = await enrichProjectsWithStats(
      queryResult.items,
      queryParams.includeStats || false,
      requestId
    );

    let aggregations: ProjectAggregations | undefined;
    if (!queryParams.exclusiveStartKey || queryParams.includeStats) {
      aggregations = await getProjectAggregations(
        userId,
        userProfile?.userType,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    logger.info("Projects retrieved successfully", {
      operation: "GetProjects",
      requestId,
      projectsCount: queryResult.count,
      queryType: queryResult.metrics.queryType,
      indexUsed: queryResult.metrics.indexUsed,
      cacheHit: queryResult.metrics.cacheHit,
      duration,
    });

    const response: GetProjectsResponse = {
      projects: enrichedProjects,
      pagination: {
        limit: queryParams.limit || 20,
        count: queryResult.count,
        lastEvaluatedKey: queryResult.lastEvaluatedKey,
        hasMore: !!queryResult.lastEvaluatedKey,
      },
      aggregations,
    };

    const etag = `"${Buffer.from(
      JSON.stringify({
        params: queryParams,
        count: queryResult.count,
        lastUpdate: enrichedProjects[0]?.updatedAt || new Date().toISOString(),
      })
    ).toString("base64")}"`;

    const cacheMaxAge = queryParams.status === "active" ? 300 : 60;
    const staleWhileRevalidate = cacheMaxAge * 2;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": `public, max-age=${cacheMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
        ETag: etag,
        "X-Query-Type": queryResult.metrics.queryType,
        "X-Index-Used": queryResult.metrics.indexUsed || "none",
        "X-Cache-Hit": queryResult.metrics.cacheHit ? "true" : "false",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof ProjectQueryError) {
      throw error;
    }

    logger.error(
      "Unexpected error during projects retrieval",
      {
        operation: "GetProjects",
        requestId,
        duration,
      },
      error as Error
    );

    throw new ProjectQueryError(
      "Unable to retrieve projects at this time",
      QueryErrorCodes.DATABASE_ERROR,
      503,
      { userId }
    );
  }
}

// ----------
// Query helpers (validate, executeOptimizedQuery, caches, enrichers)
// (Mostly taken unchanged from original project-query file)
// ----------
function validateQueryParameters(
  params: Record<string, string>
): QueryValidationResult {
  const errors: string[] = [];
  const sanitized: GetProjectsRequest = {};

  if (params.status) {
    const validStatuses = ["draft", "minting", "active", "paused", "completed"];
    if (validStatuses.includes(params.status)) {
      sanitized.status = params.status as any;
    } else {
      errors.push(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }
  }

  if (params.limit) {
    const limit = parseInt(params.limit, 10);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push("Limit must be a number between 1 and 100");
    } else {
      sanitized.limit = limit;
    }
  }

  if (params.sortBy) {
    const validSortFields = ["createdAt", "name", "status"];
    if (validSortFields.includes(params.sortBy)) {
      sanitized.sortBy = params.sortBy as any;
    } else {
      errors.push(
        `Invalid sortBy. Must be one of: ${validSortFields.join(", ")}`
      );
    }
  }

  if (params.sortOrder) {
    const validSortOrders = ["asc", "desc"];
    if (validSortOrders.includes(params.sortOrder)) {
      sanitized.sortOrder = params.sortOrder as any;
    } else {
      errors.push(
        `Invalid sortOrder. Must be one of: ${validSortOrders.join(", ")}`
      );
    }
  }

  if (params.exclusiveStartKey) {
    try {
      sanitized.exclusiveStartKey = JSON.parse(
        decodeURIComponent(params.exclusiveStartKey)
      );
    } catch (error) {
      errors.push("Invalid exclusiveStartKey format");
    }
  }

  if (params.includeStats) {
    sanitized.includeStats = params.includeStats.toLowerCase() === "true";
  }

  if (params.entrepreneurId) {
    sanitized.entrepreneurId = params.entrepreneurId;
  }
  if (params.category) {
    sanitized.category = params.category;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedParams: errors.length === 0 ? sanitized : undefined,
  };
}

async function applyAccessControlFilters(
  params: GetProjectsRequest,
  userId: string,
  userType?: string
): Promise<GetProjectsRequest> {
  const filteredParams = { ...params };

  if (userType === "startup") {
    if (!filteredParams.entrepreneurId) {
      filteredParams.entrepreneurId = userId;
    } else if (filteredParams.entrepreneurId !== userId) {
      filteredParams.status = "active";
    }
  } else if (userType === "investor") {
    filteredParams.status = "active";
  }

  return filteredParams;
}

async function executeOptimizedQuery(
  params: GetProjectsRequest,
  requestId: string
): Promise<OptimizedQueryResult<Project>> {
  const startTime = Date.now();
  let queryType: "gsi" | "scan" | "query" = "scan";
  let indexUsed: string | undefined;

  logger.info("Executing optimized project query", {
    operation: "OptimizedQuery",
    requestId,
    params,
  });

  try {
    let result;

    if (params.status) {
      queryType = "gsi";
      indexUsed = "GSI3";
      result = await getProjectRepository().getProjectsByStatus(params.status, {
        limit: params.limit,
        exclusiveStartKey: params.exclusiveStartKey,
      });
    } else if (params.entrepreneurId) {
      queryType = "scan";
      result = await getProjectRepository().getProjectsByEntrepreneur(
        params.entrepreneurId,
        {
          limit: params.limit,
          exclusiveStartKey: params.exclusiveStartKey,
        }
      );
    } else {
      queryType = "scan";
      result = await getProjectRepository().getProjects({
        limit: params.limit,
        exclusiveStartKey: params.exclusiveStartKey,
      });
    }

    let filteredItems = result.items;
    if (params.category) {
      filteredItems = result.items.filter(
        (project) => project.category === params.category
      );
    }

    if (params.sortBy && params.sortBy !== "createdAt") {
      filteredItems = sortProjects(
        filteredItems,
        params.sortBy,
        params.sortOrder || "desc"
      );
    }

    const duration = Date.now() - startTime;
    const metrics: QueryMetrics = {
      queryType,
      indexUsed,
      itemsScanned: result.count,
      itemsReturned: filteredItems.length,
      duration,
      cacheHit: false,
    };

    logger.info("Optimized query completed", {
      operation: "OptimizedQuery",
      requestId,
      metrics,
    });

    return {
      items: filteredItems,
      lastEvaluatedKey: result.lastEvaluatedKey,
      count: filteredItems.length,
      metrics,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      "Optimized query failed",
      {
        operation: "OptimizedQuery",
        requestId,
        params,
        duration,
      },
      error as Error
    );
    throw error;
  }
}

function sortProjects(
  projects: Project[],
  sortBy: "createdAt" | "name" | "status",
  sortOrder: "asc" | "desc"
): Project[] {
  return projects.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "createdAt":
      default:
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }
    return sortOrder === "desc" ? -comparison : comparison;
  });
}

async function checkProjectAccess(
  project: Project,
  userId: string,
  userType?: string
): Promise<boolean> {
  if (userType === "startup" && project.entrepreneurId === userId) {
    return true;
  }
  if (project.status === "active") {
    return true;
  }
  return false;
}

async function enrichProjectWithStats(
  project: Project,
  requestId: string
): Promise<ProjectWithStats> {
  const startTime = Date.now();

  try {
    const cached = getCachedProjectStats(project.projectId);
    let stats: ProjectStats | undefined;

    if (cached) {
      stats = cached;
      logger.debug("Project stats cache hit", {
        operation: "EnrichProject",
        requestId,
        projectId: project.projectId,
      });
    } else {
      stats =
        (await getProjectRepository().getProjectStats(project.projectId)) ||
        undefined;
      if (stats) {
        setCachedProjectStats(project.projectId, stats);
      }
      logger.debug("Project stats fetched from database", {
        operation: "EnrichProject",
        requestId,
        projectId: project.projectId,
      });
    }

    const duration = Date.now() - startTime;
    logger.debug("Project enriched with stats", {
      operation: "EnrichProject",
      requestId,
      projectId: project.projectId,
      hasStats: !!stats,
      duration,
    });

    return {
      ...project,
      stats,
      recentActivity: { lastUpdatedAt: project.updatedAt },
    };
  } catch (error) {
    logger.warn(
      "Failed to enrich project with stats",
      { operation: "EnrichProject", requestId, projectId: project.projectId },
      error as Error
    );
    return { ...project, recentActivity: { lastUpdatedAt: project.updatedAt } };
  }
}

async function enrichProjectsWithStats(
  projects: Project[],
  includeStats: boolean,
  requestId: string
): Promise<ProjectWithStats[]> {
  if (!includeStats || projects.length === 0) {
    return projects.map((project) => ({
      ...project,
      recentActivity: { lastUpdatedAt: project.updatedAt },
    }));
  }

  const startTime = Date.now();
  try {
    const enrichedProjects = await Promise.all(
      projects.map((p) => enrichProjectWithStats(p, requestId))
    );
    const duration = Date.now() - startTime;
    logger.info("Projects enriched with stats", {
      operation: "EnrichProjects",
      requestId,
      projectsCount: projects.length,
      duration,
    });
    return enrichedProjects;
  } catch (error) {
    logger.warn(
      "Failed to enrich projects with stats",
      {
        operation: "EnrichProjects",
        requestId,
        projectsCount: projects.length,
      },
      error as Error
    );
    return projects.map((project) => ({
      ...project,
      recentActivity: { lastUpdatedAt: project.updatedAt },
    }));
  }
}

async function getProjectAggregations(
  userId: string,
  userType?: string,
  requestId?: string
): Promise<ProjectAggregations> {
  const startTime = Date.now();
  try {
    const cacheKey = userType === "startup" ? userId : "global";
    const cached = getCachedAggregations(cacheKey);
    if (cached) {
      logger.debug("Aggregations cache hit", {
        operation: "GetAggregations",
        requestId,
        cacheKey,
      });
      return cached;
    }

    const aggregations: ProjectAggregations = {
      totalProjects: 0,
      projectsByStatus: {},
      projectsByCategory: {},
    };

    let allProjects: Project[] = [];
    if (userType === "startup") {
      const result = await getProjectRepository().getProjectsByEntrepreneur(
        userId,
        { limit: 1000 }
      );
      allProjects = result.items;
    } else {
      const result = await getProjectRepository().getProjectsByStatus(
        "active",
        { limit: 1000 }
      );
      allProjects = result.items;
    }

    aggregations.totalProjects = allProjects.length;
    allProjects.forEach((project) => {
      aggregations.projectsByStatus[project.status] =
        (aggregations.projectsByStatus[project.status] || 0) + 1;
      aggregations.projectsByCategory[project.category] =
        (aggregations.projectsByCategory[project.category] || 0) + 1;
    });

    setCachedAggregations(cacheKey, aggregations);

    const duration = Date.now() - startTime;
    logger.info("Aggregations calculated", {
      operation: "GetAggregations",
      requestId,
      cacheKey,
      totalProjects: aggregations.totalProjects,
      duration,
    });

    return aggregations;
  } catch (error) {
    logger.warn(
      "Failed to get project aggregations",
      { operation: "GetAggregations", requestId, userId, userType },
      error as Error
    );
    return { totalProjects: 0, projectsByStatus: {}, projectsByCategory: {} };
  }
}

// Cache management for project-query
function getCachedProjectStats(projectId: string): ProjectStats | null {
  const cached = projectStatsCache[projectId];
  if (!cached) return null;
  const now = Date.now();
  if (now > cached.timestamp + cached.ttl * 1000) {
    delete projectStatsCache[projectId];
    return null;
  }
  return cached.data;
}

function setCachedProjectStats(projectId: string, stats: ProjectStats): void {
  projectStatsCache[projectId] = {
    data: stats,
    timestamp: Date.now(),
    ttl: CACHE_TTL_SECONDS,
  };
}

function getCachedAggregations(cacheKey: string): ProjectAggregations | null {
  const cached =
    cacheKey === "global"
      ? aggregationsCache.global
      : aggregationsCache.byEntrepreneur[cacheKey];
  if (!cached) return null;
  const now = Date.now();
  if (now > cached.timestamp + cached.ttl * 1000) {
    if (cacheKey === "global") {
      aggregationsCache.global = {
        data: {
          totalProjects: 0,
          projectsByStatus: {},
          projectsByCategory: {},
        },
        timestamp: 0,
        ttl: 0,
      };
    } else {
      delete aggregationsCache.byEntrepreneur[cacheKey];
    }
    return null;
  }
  return cached.data;
}

function setCachedAggregations(
  cacheKey: string,
  aggregations: ProjectAggregations
): void {
  const cacheEntry: CacheEntry<ProjectAggregations> = {
    data: aggregations,
    timestamp: Date.now(),
    ttl: AGGREGATIONS_CACHE_TTL_SECONDS,
  };
  if (cacheKey === "global") {
    aggregationsCache.global = cacheEntry;
  } else {
    aggregationsCache.byEntrepreneur[cacheKey] = cacheEntry;
  }
}

// ----------------------
// Management (PUT/DELETE) routing and handlers (copied/adapted from project-management)
// ----------------------
async function routeManagementRequest(
  event: APIGatewayProxyEvent
): Promise<any> {
  const allowedOrigin = getAllowedOrigin(event);

  // OPTIONS handling for preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(allowedOrigin),
      body: "",
    };
  }

  const pathSegments = event.path.split("/").filter(Boolean);
  // extract project ID from pathParameters or from path
  const projectId = event.pathParameters?.projectId || pathSegments[1];

  if (!projectId) {
    throw new ProjectManagementError(
      "Project ID is required",
      ManagementErrorCodes.ROUTE_NOT_FOUND,
      404
    );
  }

  const method = event.httpMethod?.toUpperCase();
  if (method === "PUT") {
    if (pathSegments.length === 2) {
      return await handleProjectUpdate(event, projectId);
    } else if (pathSegments.length === 3 && pathSegments[2] === "status") {
      return await handleProjectStatusTransition(event, projectId);
    }
  } else if (method === "DELETE") {
    if (pathSegments.length === 2) {
      return await handleProjectDeletion(event, projectId);
    }
  }

  throw new ProjectManagementError(
    "Method not allowed",
    ManagementErrorCodes.METHOD_NOT_ALLOWED,
    405
  );
}

async function handleProjectUpdate(
  event: APIGatewayProxyEvent,
  projectId: string
): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;
  const allowedOrigin = getAllowedOrigin(event);
  logger.info("Project update started", {
    operation: "ProjectUpdate",
    requestId,
    projectId,
  });

  try {
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      throw new ProjectManagementError(
        "Authentication failed",
        ManagementErrorCodes.AUTHENTICATION_FAILED,
        401,
        { error: tokenResult.error }
      );
    }
    const entrepreneurId = tokenResult.userId!;

    // parse body (handle base64)
    let bodyString = event.body || "{}";
    if (event.isBase64Encoded) {
      bodyString = Buffer.from(bodyString, "base64").toString("utf-8");
    }
    const request: UpdateProjectRequest = JSON.parse(bodyString);

    const project = await validateProjectOwnership(
      projectId,
      entrepreneurId,
      requestId
    );

    if (project.status !== "draft") {
      throw new ProjectManagementError(
        "Only draft projects can be updated",
        ManagementErrorCodes.INVALID_PROJECT_STATUS,
        422,
        {
          projectId,
          currentStatus: project.status,
          allowedStatus: "draft",
        }
      );
    }

    const updateInput: UpdateProjectInput = { projectId };
    if (request.name !== undefined) updateInput.name = request.name;
    if (request.description !== undefined)
      updateInput.description = request.description;
    if (request.category !== undefined) updateInput.category = request.category;
    if (request.targetFundingGoal !== undefined)
      updateInput.targetFundingGoal = request.targetFundingGoal;
    if (request.pricePerStock !== undefined)
      updateInput.pricePerStock = request.pricePerStock;
    if (request.coverImageUrl !== undefined)
      updateInput.coverImageUrl = request.coverImageUrl;

    const validation = validateUpdateProjectInput(updateInput);
    if (!validation.isValid) {
      throw new ProjectManagementError(
        "Project validation failed",
        ManagementErrorCodes.INVALID_PROJECT_DATA,
        400,
        { errors: validation.errors }
      );
    }

    const changes: Record<string, any> = {};
    if (request.name !== undefined && request.name !== project.name)
      changes.name = { from: project.name, to: request.name };
    if (
      request.description !== undefined &&
      request.description !== project.description
    )
      changes.description = {
        from: project.description,
        to: request.description,
      };
    if (request.category !== undefined && request.category !== project.category)
      changes.category = { from: project.category, to: request.category };
    if (
      request.targetFundingGoal !== undefined &&
      request.targetFundingGoal !== project.targetFundingGoal
    )
      changes.targetFundingGoal = {
        from: project.targetFundingGoal,
        to: request.targetFundingGoal,
      };
    if (
      request.pricePerStock !== undefined &&
      request.pricePerStock !== project.pricePerStock
    )
      changes.pricePerStock = {
        from: project.pricePerStock,
        to: request.pricePerStock,
      };
    if (
      request.coverImageUrl !== undefined &&
      request.coverImageUrl !== project.coverImageUrl
    )
      changes.coverImageUrl = {
        from: project.coverImageUrl,
        to: request.coverImageUrl,
      };

    await getProjectRepository().updateProject(updateInput);

    logger.info("Project updated successfully", {
      operation: "ProjectUpdate",
      requestId,
      projectId,
      entrepreneurId,
      changes: Object.keys(changes),
    });

    if (Object.keys(changes).length > 0) {
      await publishProjectUpdatedEvent(
        projectId,
        entrepreneurId,
        changes,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    logger.info("Project update completed successfully", {
      operation: "ProjectUpdate",
      requestId,
      projectId,
      entrepreneurId,
      duration,
    });

    const response: UpdateProjectResponse = {
      projectId,
      message: "Project updated successfully",
      changes: Object.keys(changes),
    };

    return {
      statusCode: 200,
      headers: corsHeaders(allowedOrigin),
      body: JSON.stringify(response),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    if (error instanceof ProjectManagementError) {
      logger.warn("Project update business logic error", {
        operation: "ProjectUpdate",
        requestId,
        projectId,
        errorCode: error.code,
        duration,
      });
      return {
        statusCode: error.statusCode,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({
          message: error.message,
          code: error.code,
          details: error.details,
          requestId,
        }),
      };
    }
    throw error;
  }
}

async function handleProjectStatusTransition(
  event: APIGatewayProxyEvent,
  projectId: string
): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;
  const allowedOrigin = getAllowedOrigin(event);
  logger.info("Project status transition started", {
    operation: "ProjectStatusTransition",
    requestId,
    projectId,
  });

  try {
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      throw new ProjectManagementError(
        "Authentication failed",
        ManagementErrorCodes.AUTHENTICATION_FAILED,
        401,
        { error: tokenResult.error }
      );
    }
    const entrepreneurId = tokenResult.userId!;
    let bodyString = event.body || "{}";
    if (event.isBase64Encoded) {
      bodyString = Buffer.from(bodyString, "base64").toString("utf-8");
    }
    const request: ProjectStatusTransitionRequest = JSON.parse(bodyString);

    const project = await validateProjectOwnership(
      projectId,
      entrepreneurId,
      requestId
    );

    const transition = validateStatusTransition(
      project.status,
      request.newStatus
    );
    if (!transition.isValid) {
      throw new ProjectManagementError(
        transition.error!,
        ManagementErrorCodes.INVALID_STATUS_TRANSITION,
        422,
        {
          projectId,
          currentStatus: project.status,
          requestedStatus: request.newStatus,
          allowedTransitions: transition.allowedTransitions,
        }
      );
    }

    await getProjectRepository().updateProject({
      projectId,
      status: request.newStatus,
    });

    logger.info("Project status updated successfully", {
      operation: "ProjectStatusTransition",
      requestId,
      projectId,
      entrepreneurId,
      previousStatus: project.status,
      newStatus: request.newStatus,
    });

    await publishProjectStatusChangedEvent(
      projectId,
      entrepreneurId,
      project.status,
      request.newStatus,
      requestId
    );

    const duration = Date.now() - startTime;
    logger.info("Project status transition completed successfully", {
      operation: "ProjectStatusTransition",
      requestId,
      projectId,
      entrepreneurId,
      duration,
    });

    const response: ProjectStatusTransitionResponse = {
      projectId,
      message: "Project status updated successfully",
      previousStatus: project.status,
      newStatus: request.newStatus,
    };

    return {
      statusCode: 200,
      headers: corsHeaders(allowedOrigin),
      body: JSON.stringify(response),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    if (error instanceof ProjectManagementError) {
      logger.warn("Project status transition business logic error", {
        operation: "ProjectStatusTransition",
        requestId,
        projectId,
        errorCode: error.code,
        duration,
      });
      return {
        statusCode: error.statusCode,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({
          message: error.message,
          code: error.code,
          details: error.details,
          requestId,
        }),
      };
    }
    throw error;
  }
}

async function handleProjectDeletion(
  event: APIGatewayProxyEvent,
  projectId: string
): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;
  const allowedOrigin = getAllowedOrigin(event);
  logger.info("Project deletion started", {
    operation: "ProjectDeletion",
    requestId,
    projectId,
  });

  try {
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      throw new ProjectManagementError(
        "Authentication failed",
        ManagementErrorCodes.AUTHENTICATION_FAILED,
        401,
        { error: tokenResult.error }
      );
    }
    const entrepreneurId = tokenResult.userId!;

    const project = await validateProjectOwnership(
      projectId,
      entrepreneurId,
      requestId
    );

    if (project.status !== "draft") {
      throw new ProjectManagementError(
        "Only draft projects can be deleted",
        ManagementErrorCodes.INVALID_PROJECT_STATUS,
        422,
        {
          projectId,
          currentStatus: project.status,
          allowedStatus: "draft",
        }
      );
    }

    await performCascadeDeletion(projectId, requestId);

    logger.info("Project deleted successfully", {
      operation: "ProjectDeletion",
      requestId,
      projectId,
      entrepreneurId,
    });

    await publishProjectDeletedEvent(
      projectId,
      entrepreneurId,
      project.name,
      requestId
    );

    const duration = Date.now() - startTime;
    logger.info("Project deletion completed successfully", {
      operation: "ProjectDeletion",
      requestId,
      projectId,
      entrepreneurId,
      duration,
    });

    const response: DeleteProjectResponse = {
      projectId,
      message: "Project deleted successfully",
    };

    return {
      statusCode: 200,
      headers: corsHeaders(allowedOrigin),
      body: JSON.stringify(response),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    if (error instanceof ProjectManagementError) {
      logger.warn("Project deletion business logic error", {
        operation: "ProjectDeletion",
        requestId,
        projectId,
        errorCode: error.code,
        duration,
      });
      return {
        statusCode: error.statusCode,
        headers: corsHeaders(allowedOrigin),
        body: JSON.stringify({
          message: error.message,
          code: error.code,
          details: error.details,
          requestId,
        }),
      };
    }
    throw error;
  }
}

// Management helper functions (ownership validation, cascade deletion, status validation)
async function validateProjectOwnership(
  projectId: string,
  entrepreneurId: string,
  requestId: string
): Promise<Project> {
  const project = await getProjectRepository().getProject(projectId);
  if (!project) {
    throw new ProjectManagementError(
      "Project not found",
      ManagementErrorCodes.PROJECT_NOT_FOUND,
      404,
      { projectId }
    );
  }
  if (project.entrepreneurId !== entrepreneurId) {
    logger.warn("Unauthorized project access attempt", {
      operation: "ProjectOwnershipValidation",
      requestId,
      projectId,
      entrepreneurId,
      actualOwnerId: project.entrepreneurId,
    });
    throw new ProjectManagementError(
      "You do not have permission to access this project",
      ManagementErrorCodes.UNAUTHORIZED_ACCESS,
      403,
      { projectId }
    );
  }
  return project;
}

function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): ProjectStatusTransition {
  const validTransitions: Record<string, string[]> = {
    draft: ["minting", "paused"],
    minting: ["active", "paused", "draft"],
    active: ["paused", "completed"],
    paused: ["draft", "minting", "active"],
    completed: [],
  };
  const allowedTransitions = validTransitions[currentStatus] || [];
  const isValid = allowedTransitions.includes(newStatus);
  if (!isValid) {
    return {
      isValid: false,
      error: `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
      allowedTransitions,
    };
  }
  return { isValid: true, allowedTransitions };
}

async function performCascadeDeletion(
  projectId: string,
  requestId: string
): Promise<void> {
  logger.info("Starting cascade deletion", {
    operation: "CascadeDeletion",
    requestId,
    projectId,
  });
  try {
    const stats = await getProjectRepository().getProjectStats(projectId);
    if (stats) {
      await getProjectRepository().deleteItemByKey(
        `PROJECT#${projectId}`,
        "STATS"
      );
      logger.info("Project statistics deleted", {
        operation: "CascadeDeletion",
        requestId,
        projectId,
        component: "stats",
      });
    }

    const transactions =
      await getProjectRepository().getProjectHederaTransactions(projectId);
    for (const transaction of transactions.items) {
      await getProjectRepository().deleteItemByKey(
        `PROJECT#${projectId}`,
        `HEDERA_TX#${transaction.transactionId}`
      );
    }
    if (transactions.items.length > 0) {
      logger.info("Hedera transactions deleted", {
        operation: "CascadeDeletion",
        requestId,
        projectId,
        component: "hedera_transactions",
        count: transactions.items.length,
      });
    }

    await getProjectRepository().deleteProject(projectId);

    logger.info("Cascade deletion completed", {
      operation: "CascadeDeletion",
      requestId,
      projectId,
    });
  } catch (error) {
    logger.error(
      "Cascade deletion failed",
      { operation: "CascadeDeletion", requestId, projectId },
      error as Error
    );
    throw new ProjectManagementError(
      "Failed to delete project and related data",
      ManagementErrorCodes.CASCADE_DELETION_FAILED,
      500,
      { projectId }
    );
  }
}

// Event publishing functions
async function publishProjectUpdatedEvent(
  projectId: string,
  entrepreneurId: string,
  changes: Record<string, any>,
  requestId: string
): Promise<void> {
  try {
    await getProjectEventPublisher().publishProjectUpdatedEvent({
      projectId,
      entrepreneurId,
      changes,
      updatedAt: new Date().toISOString(),
    });
    logger.info("Project updated event published successfully", {
      operation: "ProjectUpdate",
      requestId,
      projectId,
      changes: Object.keys(changes),
    });
  } catch (eventError) {
    logger.error(
      "Failed to publish project updated event",
      { operation: "ProjectUpdate", requestId, projectId },
      eventError as Error
    );
  }
}

async function publishProjectStatusChangedEvent(
  projectId: string,
  entrepreneurId: string,
  previousStatus: string,
  newStatus: string,
  requestId: string
): Promise<void> {
  try {
    await getProjectEventPublisher().publishProjectStatusChangedEvent({
      projectId,
      entrepreneurId,
      previousStatus,
      newStatus,
      changedAt: new Date().toISOString(),
    });
    logger.info("Project status changed event published successfully", {
      operation: "ProjectStatusTransition",
      requestId,
      projectId,
      previousStatus,
      newStatus,
    });
  } catch (eventError) {
    logger.error(
      "Failed to publish project status changed event",
      { operation: "ProjectStatusTransition", requestId, projectId },
      eventError as Error
    );
  }
}

async function publishProjectDeletedEvent(
  projectId: string,
  entrepreneurId: string,
  projectName: string,
  requestId: string
): Promise<void> {
  try {
    await getProjectEventPublisher().publishProjectDeletedEvent({
      projectId,
      entrepreneurId,
      projectName,
      deletedAt: new Date().toISOString(),
    });
    logger.info("Project deleted event published successfully", {
      operation: "ProjectDeletion",
      requestId,
      projectId,
      projectName,
    });
  } catch (eventError) {
    logger.error(
      "Failed to publish project deleted event",
      { operation: "ProjectDeletion", requestId, projectId },
      eventError as Error
    );
  }
}

// import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
// import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// import { createProjectLogger } from "../../utils/structured-logger";
// import { ErrorClassifier } from "../../utils/error-handler";
// import {
//   ProjectEventPublisher,
//   createProjectEventPublisher,
// } from "../../utils/project-event-publisher";
// import { extractUserIdFromToken } from "../../utils/jwt-utils";
// import { ProjectRepository } from "../../repositories/project-repository";
// import {
//   validateUpdateProjectInput,
//   sanitizeProjectInput,
// } from "../../utils/project-validation";
// import {
//   UpdateProjectRequest,
//   UpdateProjectResponse,
//   DeleteProjectResponse,
//   ProjectStatusTransitionRequest,
//   ProjectStatusTransitionResponse,
//   ProjectManagementError,
//   ErrorCodes,
//   ProjectStatusTransition,
// } from "./types";
// import { UpdateProjectInput, Project } from "../../models/project";

// const dynamoClient = new DynamoDBClient({});
// const docClient = DynamoDBDocumentClient.from(dynamoClient);

// const TABLE_NAME = process.env.TABLE_NAME!;
// const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || "default";
// const ENVIRONMENT = process.env.ENVIRONMENT!;
// const AWS_REGION = process.env.AWS_REGION || "us-east-1";

// // Initialize services
// const logger = createProjectLogger();
// // Project event publisher will be injected for testing or created here for production
// let projectEventPublisher: ProjectEventPublisher;

// function getProjectEventPublisher(): ProjectEventPublisher {
//   if (!projectEventPublisher) {
//     projectEventPublisher = createProjectEventPublisher({
//       eventBusName: EVENT_BUS_NAME,
//       region: AWS_REGION,
//     });
//   }
//   return projectEventPublisher;
// }

// // Export for testing
// export function setProjectEventPublisher(publisher: ProjectEventPublisher) {
//   projectEventPublisher = publisher;
// }

// // Repository will be injected for testing or created here for production
// let projectRepository: ProjectRepository;

// function getProjectRepository(): ProjectRepository {
//   if (!projectRepository) {
//     projectRepository = new ProjectRepository({
//       tableName: TABLE_NAME,
//       region: AWS_REGION,
//     });
//   }
//   return projectRepository;
// }

// // Export for testing
// export function setProjectRepository(repo: ProjectRepository) {
//   projectRepository = repo;
// }

// // Helper function to get allowed origin
// const getAllowedOrigin = (event: APIGatewayProxyEvent): string => {
//   const origin = event.headers.origin ?? event.headers.Origin ?? "";
//   const allowedOrigins = [
//     "http://localhost:5173",
//     "http://localhost:3001",
//     "https://frontend-sachain-5bda0gd76-joanchacha01gmailcoms-projects.vercel.app",
//   ];
//   return allowedOrigins.includes(origin) ? origin : "http://localhost:5173";
// };

// export const handler: APIGatewayProxyHandler = async (event) => {
//   const startTime = Date.now();
//   const requestId = event.requestContext.requestId;
//   const allowedOrigin = getAllowedOrigin(event);

//   logger.info("Project Management Lambda triggered", {
//     operation: "LambdaInvocation",
//     requestId,
//     path: event.path,
//     httpMethod: event.httpMethod,
//     pathParameters: event.pathParameters,
//     userAgent: event.headers["User-Agent"],
//   });

//   try {
//     const result = await routeRequest(event);

//     const duration = Date.now() - startTime;
//     logger.info("Project Management Lambda completed successfully", {
//       operation: "LambdaInvocation",
//       requestId,
//       duration,
//       statusCode: result.statusCode,
//     });

//     return result;
//   } catch (error) {
//     const duration = Date.now() - startTime;

//     // Handle ProjectManagementError specifically
//     if (error instanceof ProjectManagementError) {
//       logger.warn("Project Management Lambda business logic error", {
//         operation: "LambdaInvocation",
//         requestId,
//         duration,
//         errorCode: error.code,
//       });

//       return {
//         statusCode: error.statusCode,
//         headers: {
//           "Content-Type": "application/json",
//           "Access-Control-Allow-Origin": allowedOrigin,
//           "Access-Control-Allow-Credentials": "true",
//           "Access-Control-Allow-Methods": "POST, OPTIONS",
//           "Access-Control-Allow-Headers":
//             "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
//           "Access-Control-Max-Age": "86400",
//         },
//         body: JSON.stringify({
//           message: error.message,
//           code: error.code,
//           details: error.details,
//           requestId,
//         }),
//       };
//     }

//     // Handle other errors with ErrorClassifier
//     const errorDetails = ErrorClassifier.classify(error as Error, {
//       operation: "LambdaInvocation",
//       requestId,
//       duration,
//     });

//     logger.error(
//       "Project Management Lambda failed",
//       {
//         operation: "LambdaInvocation",
//         requestId,
//         duration,
//         errorCategory: errorDetails.category,
//         errorCode: errorDetails.errorCode,
//       },
//       error as Error
//     );

//     return {
//       statusCode: errorDetails.httpStatusCode || 500,
//       headers: {
//         "Content-Type": "application/json",
//         "Access-Control-Allow-Origin": allowedOrigin,
//         "Access-Control-Allow-Credentials": "true",
//         "Access-Control-Allow-Methods": "POST, OPTIONS",
//         "Access-Control-Allow-Headers":
//           "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
//         "Access-Control-Max-Age": "86400",
//       },
//       body: JSON.stringify({
//         message: errorDetails.userMessage,
//         requestId,
//       }),
//     };
//   }
// };

// async function routeRequest(event: APIGatewayProxyEvent): Promise<any> {
//   const { httpMethod, path } = event;
//   const allowedOrigin = getAllowedOrigin(event);

//   // Handle CORS preflight
//   if (httpMethod === "OPTIONS") {
//     return {
//       statusCode: 200,
//       headers: {
//         "Access-Control-Allow-Origin": allowedOrigin,
//         "Access-Control-Allow-Credentials": "true",
//         "Access-Control-Allow-Methods": "PUT, DELETE, OPTIONS",
//         "Access-Control-Allow-Headers":
//           "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
//         "Access-Control-Max-Age": "86400",
//       },
//       body: "",
//     };
//   }
//   const pathSegments = path.split("/").filter(Boolean);

//   // Extract project ID from path parameters or path
//   const projectId = event.pathParameters?.projectId || pathSegments[1];

//   if (!projectId) {
//     throw new ProjectManagementError(
//       "Project ID is required",
//       ErrorCodes.ROUTE_NOT_FOUND,
//       404
//     );
//   }

//   switch (httpMethod) {
//     case "PUT":
//       if (pathSegments.length === 2) {
//         // PUT /projects/{projectId} - Update project
//         return await handleProjectUpdate(event, projectId);
//       } else if (pathSegments.length === 3 && pathSegments[2] === "status") {
//         // PUT /projects/{projectId}/status - Update project status
//         return await handleProjectStatusTransition(event, projectId);
//       }
//       break;

//     case "DELETE":
//       if (pathSegments.length === 2) {
//         // DELETE /projects/{projectId} - Delete project
//         return await handleProjectDeletion(event, projectId);
//       }
//       break;

//     default:
//       throw new ProjectManagementError(
//         "Method not allowed",
//         ErrorCodes.METHOD_NOT_ALLOWED,
//         405
//       );
//   }

//   throw new ProjectManagementError(
//     "Route not found",
//     ErrorCodes.ROUTE_NOT_FOUND,
//     404
//   );
// }

// async function handleProjectUpdate(
//   event: APIGatewayProxyEvent,
//   projectId: string
// ): Promise<any> {
//   const startTime = Date.now();
//   const requestId = event.requestContext.requestId;
//   const allowedOrigin = getAllowedOrigin(event);
//   logger.info("Project update started", {
//     operation: "ProjectUpdate",
//     requestId,
//     projectId,
//   });

//   try {
//     // Extract and validate authentication
//     const tokenResult = extractUserIdFromToken(event);
//     if (!tokenResult.success) {
//       throw new ProjectManagementError(
//         "Authentication failed",
//         ErrorCodes.AUTHENTICATION_FAILED,
//         401,
//         { error: tokenResult.error }
//       );
//     }

//     const entrepreneurId = tokenResult.userId!;

//     // Parse request body
//     let bodyString = event.body || "{}";
//     if (event.isBase64Encoded) {
//       bodyString = Buffer.from(bodyString, "base64").toString("utf-8");
//     }

//     const request: UpdateProjectRequest = JSON.parse(bodyString);

//     // Validate project exists and ownership
//     const project = await validateProjectOwnership(
//       projectId,
//       entrepreneurId,
//       requestId
//     );

//     // Validate project is in draft status (only draft projects can be updated)
//     if (project.status !== "draft") {
//       throw new ProjectManagementError(
//         "Only draft projects can be updated",
//         ErrorCodes.INVALID_PROJECT_STATUS,
//         422,
//         {
//           projectId,
//           currentStatus: project.status,
//           allowedStatus: "draft",
//         }
//       );
//     }

//     // Build update input with only provided fields
//     const updateInput: UpdateProjectInput = {
//       projectId,
//     };

//     // Only include fields that are provided in the request
//     if (request.name !== undefined) {
//       updateInput.name = request.name;
//     }
//     if (request.description !== undefined) {
//       updateInput.description = request.description;
//     }
//     if (request.category !== undefined) {
//       updateInput.category = request.category;
//     }
//     if (request.targetFundingGoal !== undefined) {
//       updateInput.targetFundingGoal = request.targetFundingGoal;
//     }
//     if (request.pricePerStock !== undefined) {
//       updateInput.pricePerStock = request.pricePerStock;
//     }
//     if (request.coverImageUrl !== undefined) {
//       updateInput.coverImageUrl = request.coverImageUrl;
//     }

//     // Validate update data
//     const validation = validateUpdateProjectInput(updateInput);
//     if (!validation.isValid) {
//       throw new ProjectManagementError(
//         "Project validation failed",
//         ErrorCodes.INVALID_PROJECT_DATA,
//         400,
//         { errors: validation.errors }
//       );
//     }

//     // Track changes for event publishing
//     const changes: Record<string, any> = {};
//     if (request.name !== undefined && request.name !== project.name) {
//       changes.name = { from: project.name, to: request.name };
//     }
//     if (
//       request.description !== undefined &&
//       request.description !== project.description
//     ) {
//       changes.description = {
//         from: project.description,
//         to: request.description,
//       };
//     }
//     if (
//       request.category !== undefined &&
//       request.category !== project.category
//     ) {
//       changes.category = { from: project.category, to: request.category };
//     }
//     if (
//       request.targetFundingGoal !== undefined &&
//       request.targetFundingGoal !== project.targetFundingGoal
//     ) {
//       changes.targetFundingGoal = {
//         from: project.targetFundingGoal,
//         to: request.targetFundingGoal,
//       };
//     }
//     if (
//       request.pricePerStock !== undefined &&
//       request.pricePerStock !== project.pricePerStock
//     ) {
//       changes.pricePerStock = {
//         from: project.pricePerStock,
//         to: request.pricePerStock,
//       };
//     }
//     if (
//       request.coverImageUrl !== undefined &&
//       request.coverImageUrl !== project.coverImageUrl
//     ) {
//       changes.coverImageUrl = {
//         from: project.coverImageUrl,
//         to: request.coverImageUrl,
//       };
//     }

//     // Update project in database
//     await getProjectRepository().updateProject(updateInput);

//     logger.info("Project updated successfully", {
//       operation: "ProjectUpdate",
//       requestId,
//       projectId,
//       entrepreneurId,
//       changes: Object.keys(changes),
//     });

//     // Publish EventBridge event for project update
//     if (Object.keys(changes).length > 0) {
//       await publishProjectUpdatedEvent(
//         projectId,
//         entrepreneurId,
//         changes,
//         requestId
//       );
//     }

//     const duration = Date.now() - startTime;
//     logger.info("Project update completed successfully", {
//       operation: "ProjectUpdate",
//       requestId,
//       projectId,
//       entrepreneurId,
//       duration,
//     });

//     const response: UpdateProjectResponse = {
//       projectId,
//       message: "Project updated successfully",
//       changes: Object.keys(changes),
//     };

//     return {
//       statusCode: 200,
//       headers: {
//         "Content-Type": "application/json",
//         "Access-Control-Allow-Origin": allowedOrigin,
//         "Access-Control-Allow-Credentials": "true",
//         "Access-Control-Allow-Methods": "POST, OPTIONS",
//         "Access-Control-Allow-Headers":
//           "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
//         "Access-Control-Max-Age": "86400",
//       },
//       body: JSON.stringify(response),
//     };
//   } catch (error) {
//     const duration = Date.now() - startTime;

//     if (error instanceof ProjectManagementError) {
//       logger.warn("Project update business logic error", {
//         operation: "ProjectUpdate",
//         requestId,
//         projectId,
//         errorCode: error.code,
//         duration,
//       });

//       return {
//         statusCode: error.statusCode,
//         headers: {
//           "Content-Type": "application/json",
//           "Access-Control-Allow-Origin": allowedOrigin,
//           "Access-Control-Allow-Credentials": "true",
//           "Access-Control-Allow-Methods": "POST, OPTIONS",
//           "Access-Control-Allow-Headers":
//             "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
//           "Access-Control-Max-Age": "86400",
//         },
//         body: JSON.stringify({
//           message: error.message,
//           code: error.code,
//           details: error.details,
//           requestId,
//         }),
//       };
//     }

//     // Re-throw unexpected errors
//     throw error;
//   }
// }

// async function handleProjectStatusTransition(
//   event: APIGatewayProxyEvent,
//   projectId: string
// ): Promise<any> {
//   const startTime = Date.now();
//   const requestId = event.requestContext.requestId;
//   const allowedOrigin = getAllowedOrigin(event);

//   logger.info("Project status transition started", {
//     operation: "ProjectStatusTransition",
//     requestId,
//     projectId,
//   });

//   try {
//     // Extract and validate authentication
//     const tokenResult = extractUserIdFromToken(event);
//     if (!tokenResult.success) {
//       throw new ProjectManagementError(
//         "Authentication failed",
//         ErrorCodes.AUTHENTICATION_FAILED,
//         401,
//         { error: tokenResult.error }
//       );
//     }

//     const entrepreneurId = tokenResult.userId!;

//     // Parse request body
//     let bodyString = event.body || "{}";
//     if (event.isBase64Encoded) {
//       bodyString = Buffer.from(bodyString, "base64").toString("utf-8");
//     }

//     const request: ProjectStatusTransitionRequest = JSON.parse(bodyString);

//     // Validate project exists and ownership
//     const project = await validateProjectOwnership(
//       projectId,
//       entrepreneurId,
//       requestId
//     );

//     // Validate status transition
//     const transition = validateStatusTransition(
//       project.status,
//       request.newStatus
//     );
//     if (!transition.isValid) {
//       throw new ProjectManagementError(
//         transition.error!,
//         ErrorCodes.INVALID_STATUS_TRANSITION,
//         422,
//         {
//           projectId,
//           currentStatus: project.status,
//           requestedStatus: request.newStatus,
//           allowedTransitions: transition.allowedTransitions,
//         }
//       );
//     }

//     // Update project status
//     await getProjectRepository().updateProject({
//       projectId,
//       status: request.newStatus,
//     });

//     logger.info("Project status updated successfully", {
//       operation: "ProjectStatusTransition",
//       requestId,
//       projectId,
//       entrepreneurId,
//       previousStatus: project.status,
//       newStatus: request.newStatus,
//     });

//     // Publish EventBridge event for status change
//     await publishProjectStatusChangedEvent(
//       projectId,
//       entrepreneurId,
//       project.status,
//       request.newStatus,
//       requestId
//     );

//     const duration = Date.now() - startTime;
//     logger.info("Project status transition completed successfully", {
//       operation: "ProjectStatusTransition",
//       requestId,
//       projectId,
//       entrepreneurId,
//       duration,
//     });

//     const response: ProjectStatusTransitionResponse = {
//       projectId,
//       message: "Project status updated successfully",
//       previousStatus: project.status,
//       newStatus: request.newStatus,
//     };

//     return {
//       statusCode: 200,
//       headers: {
//         "Content-Type": "application/json",
//         "Access-Control-Allow-Origin": allowedOrigin,
//         "Access-Control-Allow-Credentials": "true",
//         "Access-Control-Allow-Methods": "POST, OPTIONS",
//         "Access-Control-Allow-Headers":
//           "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
//         "Access-Control-Max-Age": "86400",
//       },
//       body: JSON.stringify(response),
//     };
//   } catch (error) {
//     const duration = Date.now() - startTime;

//     if (error instanceof ProjectManagementError) {
//       logger.warn("Project status transition business logic error", {
//         operation: "ProjectStatusTransition",
//         requestId,
//         projectId,
//         errorCode: error.code,
//         duration,
//       });

//       return {
//         statusCode: error.statusCode,
//         headers: {
//           "Content-Type": "application/json",
//           "Access-Control-Allow-Origin": allowedOrigin,
//           "Access-Control-Allow-Credentials": "true",
//           "Access-Control-Allow-Methods": "POST, OPTIONS",
//           "Access-Control-Allow-Headers":
//             "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
//           "Access-Control-Max-Age": "86400",
//         },
//         body: JSON.stringify({
//           message: error.message,
//           code: error.code,
//           details: error.details,
//           requestId,
//         }),
//       };
//     }

//     // Re-throw unexpected errors
//     throw error;
//   }
// }

// async function handleProjectDeletion(
//   event: APIGatewayProxyEvent,
//   projectId: string
// ): Promise<any> {
//   const startTime = Date.now();
//   const requestId = event.requestContext.requestId;
//   const allowedOrigin = getAllowedOrigin(event);

//   logger.info("Project deletion started", {
//     operation: "ProjectDeletion",
//     requestId,
//     projectId,
//   });

//   try {
//     // Extract and validate authentication
//     const tokenResult = extractUserIdFromToken(event);
//     if (!tokenResult.success) {
//       throw new ProjectManagementError(
//         "Authentication failed",
//         ErrorCodes.AUTHENTICATION_FAILED,
//         401,
//         { error: tokenResult.error }
//       );
//     }

//     const entrepreneurId = tokenResult.userId!;

//     // Validate project exists and ownership
//     const project = await validateProjectOwnership(
//       projectId,
//       entrepreneurId,
//       requestId
//     );

//     // Validate project can be deleted (only draft projects can be deleted)
//     if (project.status !== "draft") {
//       throw new ProjectManagementError(
//         "Only draft projects can be deleted",
//         ErrorCodes.INVALID_PROJECT_STATUS,
//         422,
//         {
//           projectId,
//           currentStatus: project.status,
//           allowedStatus: "draft",
//         }
//       );
//     }

//     // Perform cascade deletion
//     await performCascadeDeletion(projectId, requestId);

//     logger.info("Project deleted successfully", {
//       operation: "ProjectDeletion",
//       requestId,
//       projectId,
//       entrepreneurId,
//     });

//     // Publish EventBridge event for project deletion
//     await publishProjectDeletedEvent(
//       projectId,
//       entrepreneurId,
//       project.name,
//       requestId
//     );

//     const duration = Date.now() - startTime;
//     logger.info("Project deletion completed successfully", {
//       operation: "ProjectDeletion",
//       requestId,
//       projectId,
//       entrepreneurId,
//       duration,
//     });

//     const response: DeleteProjectResponse = {
//       projectId,
//       message: "Project deleted successfully",
//     };

//     return {
//       statusCode: 200,
//       headers: {
//         "Content-Type": "application/json",
//         "Access-Control-Allow-Origin": allowedOrigin,
//         "Access-Control-Allow-Credentials": "true",
//         "Access-Control-Allow-Methods": "POST, OPTIONS",
//         "Access-Control-Allow-Headers":
//           "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
//         "Access-Control-Max-Age": "86400",
//       },
//       body: JSON.stringify(response),
//     };
//   } catch (error) {
//     const duration = Date.now() - startTime;

//     if (error instanceof ProjectManagementError) {
//       logger.warn("Project deletion business logic error", {
//         operation: "ProjectDeletion",
//         requestId,
//         projectId,
//         errorCode: error.code,
//         duration,
//       });

//       return {
//         statusCode: error.statusCode,
//         headers: {
//           "Content-Type": "application/json",
//           "Access-Control-Allow-Origin": allowedOrigin,
//           "Access-Control-Allow-Credentials": "true",
//           "Access-Control-Allow-Methods": "POST, OPTIONS",
//           "Access-Control-Allow-Headers":
//             "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
//           "Access-Control-Max-Age": "86400",
//         },
//         body: JSON.stringify({
//           message: error.message,
//           code: error.code,
//           details: error.details,
//           requestId,
//         }),
//       };
//     }

//     // Re-throw unexpected errors
//     throw error;
//   }
// }

// // Helper functions

// async function validateProjectOwnership(
//   projectId: string,
//   entrepreneurId: string,
//   requestId: string
// ): Promise<Project> {
//   const project = await getProjectRepository().getProject(projectId);

//   if (!project) {
//     throw new ProjectManagementError(
//       "Project not found",
//       ErrorCodes.PROJECT_NOT_FOUND,
//       404,
//       { projectId }
//     );
//   }

//   if (project.entrepreneurId !== entrepreneurId) {
//     logger.warn("Unauthorized project access attempt", {
//       operation: "ProjectOwnershipValidation",
//       requestId,
//       projectId,
//       entrepreneurId,
//       actualOwnerId: project.entrepreneurId,
//     });

//     throw new ProjectManagementError(
//       "You do not have permission to access this project",
//       ErrorCodes.UNAUTHORIZED_ACCESS,
//       403,
//       { projectId }
//     );
//   }

//   return project;
// }

// function validateStatusTransition(
//   currentStatus: string,
//   newStatus: string
// ): ProjectStatusTransition {
//   // Define valid status transitions
//   const validTransitions: Record<string, string[]> = {
//     draft: ["minting", "paused"],
//     minting: ["active", "paused", "draft"],
//     active: ["paused", "completed"],
//     paused: ["draft", "minting", "active"],
//     completed: [], // No transitions allowed from completed
//   };

//   const allowedTransitions = validTransitions[currentStatus] || [];
//   const isValid = allowedTransitions.includes(newStatus);

//   if (!isValid) {
//     return {
//       isValid: false,
//       error: `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
//       allowedTransitions,
//     };
//   }

//   return {
//     isValid: true,
//     allowedTransitions,
//   };
// }

// async function performCascadeDeletion(
//   projectId: string,
//   requestId: string
// ): Promise<void> {
//   logger.info("Starting cascade deletion", {
//     operation: "CascadeDeletion",
//     requestId,
//     projectId,
//   });

//   try {
//     // Delete project statistics
//     const stats = await getProjectRepository().getProjectStats(projectId);
//     if (stats) {
//       await getProjectRepository().deleteItemByKey(
//         `PROJECT#${projectId}`,
//         "STATS"
//       );
//       logger.info("Project statistics deleted", {
//         operation: "CascadeDeletion",
//         requestId,
//         projectId,
//         component: "stats",
//       });
//     }

//     // Delete Hedera transactions
//     const transactions =
//       await getProjectRepository().getProjectHederaTransactions(projectId);
//     for (const transaction of transactions.items) {
//       await getProjectRepository().deleteItemByKey(
//         `PROJECT#${projectId}`,
//         `HEDERA_TX#${transaction.transactionId}`
//       );
//     }

//     if (transactions.items.length > 0) {
//       logger.info("Hedera transactions deleted", {
//         operation: "CascadeDeletion",
//         requestId,
//         projectId,
//         component: "hedera_transactions",
//         count: transactions.items.length,
//       });
//     }

//     // Note: Stock NFTs should not exist for draft projects, but we'll check anyway
//     // In a real implementation, we might need to query for stocks and delete them
//     // For now, we'll assume draft projects don't have stocks

//     // Finally, delete the main project record
//     await getProjectRepository().deleteProject(projectId);

//     logger.info("Cascade deletion completed", {
//       operation: "CascadeDeletion",
//       requestId,
//       projectId,
//     });
//   } catch (error) {
//     logger.error(
//       "Cascade deletion failed",
//       {
//         operation: "CascadeDeletion",
//         requestId,
//         projectId,
//       },
//       error as Error
//     );

//     throw new ProjectManagementError(
//       "Failed to delete project and related data",
//       ErrorCodes.CASCADE_DELETION_FAILED,
//       500,
//       { projectId }
//     );
//   }
// }

// // Event publishing functions

// async function publishProjectUpdatedEvent(
//   projectId: string,
//   entrepreneurId: string,
//   changes: Record<string, any>,
//   requestId: string
// ): Promise<void> {
//   try {
//     await getProjectEventPublisher().publishProjectUpdatedEvent({
//       projectId,
//       entrepreneurId,
//       changes,
//       updatedAt: new Date().toISOString(),
//     });

//     logger.info("Project updated event published successfully", {
//       operation: "ProjectUpdate",
//       requestId,
//       projectId,
//       changes: Object.keys(changes),
//     });
//   } catch (eventError) {
//     logger.error(
//       "Failed to publish project updated event",
//       {
//         operation: "ProjectUpdate",
//         requestId,
//         projectId,
//       },
//       eventError as Error
//     );
//     // Don't fail the operation for event publishing errors
//   }
// }

// async function publishProjectStatusChangedEvent(
//   projectId: string,
//   entrepreneurId: string,
//   previousStatus: string,
//   newStatus: string,
//   requestId: string
// ): Promise<void> {
//   try {
//     await getProjectEventPublisher().publishProjectStatusChangedEvent({
//       projectId,
//       entrepreneurId,
//       previousStatus,
//       newStatus,
//       changedAt: new Date().toISOString(),
//     });

//     logger.info("Project status changed event published successfully", {
//       operation: "ProjectStatusTransition",
//       requestId,
//       projectId,
//       previousStatus,
//       newStatus,
//     });
//   } catch (eventError) {
//     logger.error(
//       "Failed to publish project status changed event",
//       {
//         operation: "ProjectStatusTransition",
//         requestId,
//         projectId,
//       },
//       eventError as Error
//     );
//     // Don't fail the operation for event publishing errors
//   }
// }

// async function publishProjectDeletedEvent(
//   projectId: string,
//   entrepreneurId: string,
//   projectName: string,
//   requestId: string
// ): Promise<void> {
//   try {
//     await getProjectEventPublisher().publishProjectDeletedEvent({
//       projectId,
//       entrepreneurId,
//       projectName,
//       deletedAt: new Date().toISOString(),
//     });

//     logger.info("Project deleted event published successfully", {
//       operation: "ProjectDeletion",
//       requestId,
//       projectId,
//       projectName,
//     });
//   } catch (eventError) {
//     logger.error(
//       "Failed to publish project deleted event",
//       {
//         operation: "ProjectDeletion",
//         requestId,
//         projectId,
//       },
//       eventError as Error
//     );
//     // Don't fail the operation for event publishing errors
//   }
// }
