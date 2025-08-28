import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { createProjectLogger } from "../../utils/structured-logger";
import { ErrorClassifier } from "../../utils/error-handler";
import { extractUserIdFromToken } from "../../utils/jwt-utils";
import { ProjectRepository } from "../../repositories/project-repository";
import { UserRepository } from "../../repositories/user-repository";
import {
  ProjectQueryEvent,
  GetProjectsRequest,
  GetProjectResponse,
  GetProjectsResponse,
  ProjectQueryError,
  ErrorCodes,
  ProjectWithStats,
  ProjectAggregations,
  QueryValidationResult,
  OptimizedQueryResult,
  QueryMetrics,
  CacheEntry,
  ProjectStatsCache,
  AggregationsCache,
} from "./types";
import {
  Project,
  ProjectStats,
  ProjectQueryOptions,
} from "../../models/project";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const ENVIRONMENT = process.env.ENVIRONMENT!;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

// Cache configuration
const CACHE_TTL_SECONDS = 300; // 5 minutes
const AGGREGATIONS_CACHE_TTL_SECONDS = 600; // 10 minutes

// Initialize services
const logger = createProjectLogger();

const projectRepository = new ProjectRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

const userRepository = new UserRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

// In-memory caches (in production, consider using Redis or ElastiCache)
let projectStatsCache: ProjectStatsCache = {};
let aggregationsCache: AggregationsCache = {
  global: {
    data: { totalProjects: 0, projectsByStatus: {}, projectsByCategory: {} },
    timestamp: 0,
    ttl: 0,
  },
  byEntrepreneur: {},
};

export const handler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("Project Query Lambda triggered", {
    operation: "LambdaInvocation",
    requestId,
    path: event.path,
    httpMethod: event.httpMethod,
    queryStringParameters: event.queryStringParameters,
  });

  try {
    const result = await handleProjectQuery(event as ProjectQueryEvent);

    const duration = Date.now() - startTime;
    logger.info("Project Query Lambda completed successfully", {
      operation: "LambdaInvocation",
      requestId,
      duration,
      statusCode: result.statusCode,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorDetails = ErrorClassifier.classify(error as Error, {
      operation: "LambdaInvocation",
      requestId,
      duration,
    });

    logger.error(
      "Project Query Lambda failed",
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
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: errorDetails.userMessage,
        requestId,
      }),
    };
  }
};

async function handleProjectQuery(event: ProjectQueryEvent): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;
  const path = event.path;

  logger.info("Project query started", {
    operation: "ProjectQuery",
    requestId,
    path,
  });

  try {
    // Extract and validate authentication
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
        ErrorCodes.AUTHENTICATION_FAILED,
        401,
        { error: tokenResult.error }
      );
    }

    const userId = tokenResult.userId!;

    // Route based on path
    if (path.includes("/projects/") && event.pathParameters?.projectId) {
      // Single project query: GET /projects/{projectId}
      return await handleGetProject(
        event.pathParameters.projectId,
        userId,
        requestId
      );
    } else {
      // Multiple projects query: GET /projects
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
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: error.message,
          code: error.code,
          details: error.details,
          requestId,
        }),
      };
    }

    // Re-throw unexpected errors to be handled by main handler
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
    // Get project from repository
    const project = await projectRepository.getProject(projectId);

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
        ErrorCodes.PROJECT_NOT_FOUND,
        404,
        { projectId }
      );
    }

    // Check access permissions (entrepreneurs can see their own projects, investors can see active projects)
    const userProfile = await userRepository.getUserProfile(userId);
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
        ErrorCodes.UNAUTHORIZED_ACCESS,
        403,
        { projectId, userId }
      );
    }

    // Enrich project with statistics
    const projectWithStats = await enrichProjectWithStats(project, requestId);

    const duration = Date.now() - startTime;
    logger.info("Project retrieved successfully", {
      operation: "GetProject",
      requestId,
      projectId,
      duration,
    });

    const response: GetProjectResponse = {
      project: projectWithStats,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
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
      ErrorCodes.DATABASE_ERROR,
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

  logger.info("Getting projects list", {
    operation: "GetProjects",
    requestId,
    userId,
    queryParams: event.queryStringParameters,
  });

  try {
    // Validate and sanitize query parameters
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
        ErrorCodes.INVALID_QUERY_PARAMETERS,
        400,
        { errors: validation.errors }
      );
    }

    const queryParams = validation.sanitizedParams!;

    // Get user profile to determine access level
    const userProfile = await userRepository.getUserProfile(userId);

    // Apply access control filters
    const filteredParams = await applyAccessControlFilters(
      queryParams,
      userId,
      userProfile?.userType
    );

    // Execute optimized query
    const queryResult = await executeOptimizedQuery(filteredParams, requestId);

    // Enrich projects with statistics if requested
    const enrichedProjects = await enrichProjectsWithStats(
      queryResult.items,
      queryParams.includeStats || false,
      requestId
    );

    // Get aggregations if requested or for first page
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

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
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
      ErrorCodes.DATABASE_ERROR,
      503,
      { userId }
    );
  }
}

function validateQueryParameters(
  params: Record<string, string>
): QueryValidationResult {
  const errors: string[] = [];
  const sanitized: GetProjectsRequest = {};

  // Validate status
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

  // Validate limit
  if (params.limit) {
    const limit = parseInt(params.limit, 10);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push("Limit must be a number between 1 and 100");
    } else {
      sanitized.limit = limit;
    }
  }

  // Validate sortBy
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

  // Validate sortOrder
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

  // Parse exclusiveStartKey
  if (params.exclusiveStartKey) {
    try {
      sanitized.exclusiveStartKey = JSON.parse(
        decodeURIComponent(params.exclusiveStartKey)
      );
    } catch (error) {
      errors.push("Invalid exclusiveStartKey format");
    }
  }

  // Parse includeStats
  if (params.includeStats) {
    sanitized.includeStats = params.includeStats.toLowerCase() === "true";
  }

  // Copy other valid parameters
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

  // Entrepreneurs can only see their own projects unless they're querying public projects
  if (userType === "entrepreneur") {
    // If no specific entrepreneur filter is set, default to current user
    if (!filteredParams.entrepreneurId) {
      filteredParams.entrepreneurId = userId;
    }
    // If they're trying to query someone else's projects, only allow active projects
    else if (filteredParams.entrepreneurId !== userId) {
      filteredParams.status = "active";
    }
  }
  // Investors can only see active projects
  else if (userType === "investor") {
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

    // Use GSI3 for status-based queries (most efficient)
    if (params.status) {
      queryType = "gsi";
      indexUsed = "GSI3";
      result = await projectRepository.getProjectsByStatus(params.status, {
        limit: params.limit,
        exclusiveStartKey: params.exclusiveStartKey,
      });
    }
    // Use entrepreneur-specific query
    else if (params.entrepreneurId) {
      queryType = "scan"; // This uses scan with filter in the repository
      result = await projectRepository.getProjectsByEntrepreneur(
        params.entrepreneurId,
        {
          limit: params.limit,
          exclusiveStartKey: params.exclusiveStartKey,
        }
      );
    }
    // General query (least efficient, use sparingly)
    else {
      queryType = "scan";
      result = await projectRepository.getProjects({
        limit: params.limit,
        exclusiveStartKey: params.exclusiveStartKey,
      });
    }

    // Apply client-side filtering for category if needed
    let filteredItems = result.items;
    if (params.category) {
      filteredItems = result.items.filter(
        (project) => project.category === params.category
      );
    }

    // Apply client-side sorting if needed
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
  // Entrepreneurs can access their own projects
  if (userType === "entrepreneur" && project.entrepreneurId === userId) {
    return true;
  }

  // Investors and other entrepreneurs can only access active projects
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
    // Check cache first
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
      // Fetch from database
      stats =
        (await projectRepository.getProjectStats(project.projectId)) ||
        undefined;

      // Cache the result
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
      recentActivity: {
        lastUpdatedAt: project.updatedAt,
      },
    };
  } catch (error) {
    logger.warn(
      "Failed to enrich project with stats",
      {
        operation: "EnrichProject",
        requestId,
        projectId: project.projectId,
      },
      error as Error
    );

    // Return project without stats if enrichment fails
    return {
      ...project,
      recentActivity: {
        lastUpdatedAt: project.updatedAt,
      },
    };
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
      recentActivity: {
        lastUpdatedAt: project.updatedAt,
      },
    }));
  }

  const startTime = Date.now();

  try {
    // Enrich projects with stats in parallel
    const enrichedProjects = await Promise.all(
      projects.map((project) => enrichProjectWithStats(project, requestId))
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

    // Return projects without stats if enrichment fails
    return projects.map((project) => ({
      ...project,
      recentActivity: {
        lastUpdatedAt: project.updatedAt,
      },
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
    // Check cache first
    const cacheKey = userType === "entrepreneur" ? userId : "global";
    const cached = getCachedAggregations(cacheKey);

    if (cached) {
      logger.debug("Aggregations cache hit", {
        operation: "GetAggregations",
        requestId,
        cacheKey,
      });
      return cached;
    }

    // Calculate aggregations
    const aggregations: ProjectAggregations = {
      totalProjects: 0,
      projectsByStatus: {},
      projectsByCategory: {},
    };

    // Get projects based on user type
    let allProjects: Project[] = [];
    if (userType === "entrepreneur") {
      const result = await projectRepository.getProjectsByEntrepreneur(userId, {
        limit: 1000,
      });
      allProjects = result.items;
    } else {
      // For investors or global view, get active projects
      const result = await projectRepository.getProjectsByStatus("active", {
        limit: 1000,
      });
      allProjects = result.items;
    }

    // Calculate aggregations
    aggregations.totalProjects = allProjects.length;

    allProjects.forEach((project) => {
      // Count by status
      aggregations.projectsByStatus[project.status] =
        (aggregations.projectsByStatus[project.status] || 0) + 1;

      // Count by category
      aggregations.projectsByCategory[project.category] =
        (aggregations.projectsByCategory[project.category] || 0) + 1;
    });

    // Cache the result
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
      {
        operation: "GetAggregations",
        requestId,
        userId,
        userType,
      },
      error as Error
    );

    // Return empty aggregations if calculation fails
    return {
      totalProjects: 0,
      projectsByStatus: {},
      projectsByCategory: {},
    };
  }
}

// Cache management functions
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
