import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";

import { createProjectLogger } from "../../utils/structured-logger";
import { ErrorClassifier } from "../../utils/error-handler";
import { ProjectErrorClassifier } from "../../utils/enhanced-error-handler";
import {
  ProjectRecoveryManager,
  ProjectRollbackOperations,
} from "../../utils/error-recovery";
import { createProjectEventPublisher } from "../../utils/project-event-publisher";
import { extractUserIdFromToken } from "../../utils/jwt-utils";
import { projectMetrics } from "../../utils/project-metrics";
import { UserRepository } from "../../repositories/user-repository";
import { ProjectRepository } from "../../repositories/project-repository";
import { AuditLogRepository } from "../../repositories/audit-log-repository";
import { ComplianceRepository } from "../../repositories/compliance-repository";
import { ProjectAuditService } from "../../utils/project-audit-service";
import {
  validateCreateProjectInput,
  sanitizeProjectInput,
} from "../../utils/project-validation";
import {
  SecurityMiddleware,
  AbusePreventionService,
} from "../../utils/security-hardening";
import {
  APISecurityValidator,
  SecurityConfigs,
} from "../../utils/api-security-validator";
import { CORSMiddleware } from "../../utils/cors-security";
import {
  CreateProjectRequest,
  CreateProjectResponse,
  ProjectCreationError,
  ErrorCodes,
  KYCValidationResult,
  BusinessRuleValidationResult,
} from "./types";

// Validate required environment variables
const TABLE_NAME = process.env.TABLE_NAME;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || "default";
const ENVIRONMENT = process.env.ENVIRONMENT;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

if (!TABLE_NAME) {
  console.error("Missing required environment variable: TABLE_NAME");
  throw new Error("Missing required environment variable: TABLE_NAME");
}

if (!ENVIRONMENT) {
  console.error("Missing required environment variable: ENVIRONMENT");
  throw new Error("Missing required environment variable: ENVIRONMENT");
}

// Initialize services
const logger = createProjectLogger();
const projectEventPublisher = createProjectEventPublisher({
  eventBusName: EVENT_BUS_NAME,
  region: AWS_REGION,
});

const userRepository = new UserRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

const projectRepository = new ProjectRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

const auditRepository = new AuditLogRepository({
  region: AWS_REGION,
  tableName: TABLE_NAME,
});

const complianceRepository = new ComplianceRepository({
  region: AWS_REGION,
  tableName: TABLE_NAME,
});

const projectAuditService = new ProjectAuditService(
  auditRepository,
  complianceRepository,
  logger
);

// Apply security middleware with CORS support
const secureHandler = SecurityMiddleware.secureHandler(
  CORSMiddleware.withCORS(handleProjectCreationWithSecurity),
  {
    rateLimitConfig: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 project creations per minute per user
    },
    requireAuth: true,
  }
);

// Helper function to get allowed origin
const getAllowedOrigin = (event: APIGatewayProxyEvent): string => {
  const origin = event.headers.origin ?? event.headers.Origin ?? "";
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3001",
    "https://frontend-sachain-5bda0gd76-joanchacha01gmailcoms-projects.vercel.app",
  ];
  return allowedOrigins.includes(origin) ? origin : "http://localhost:5173";
};
// Add basic logging wrapper to catch early failures
export const handler: APIGatewayProxyHandler = async (event, context) => {
  const allowedOrigin = getAllowedOrigin(event);
  // Handle CORS preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }
  try {
    // Decode base64 body before any processing
    if (event.isBase64Encoded && event.body) {
      try {
        event.body = Buffer.from(event.body, "base64").toString("utf-8");
        event.isBase64Encoded = false;
        console.log("Decoded base64 body before security validation", {
          requestId: context.awsRequestId,
          bodyLength: event.body.length,
        });
      } catch (decodeError) {
        console.error("Failed to decode base64 body", {
          requestId: context.awsRequestId,
          error:
            decodeError instanceof Error
              ? decodeError.message
              : String(decodeError),
        });
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": allowedOrigin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
          },
          body: JSON.stringify({
            message: "Invalid request encoding",
            requestId: context.awsRequestId,
          }),
        };
      }
    }

    console.log("Calling secureHandler...", {
      requestId: context.awsRequestId,
    });

    const result = await secureHandler(event);

    console.log("Handler completed successfully", {
      requestId: context.awsRequestId,
      statusCode: result.statusCode,
      body: result.body?.substring(0, 200), // First 200 chars of response
    });
    return result;
  } catch (error) {
    console.error("Handler failed with error", {
      requestId: context.awsRequestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return a basic error response
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
      },
      body: JSON.stringify({
        message: "Internal server error",
        requestId: context.awsRequestId,
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

async function handleProjectCreationWithSecurity(event: APIGatewayProxyEvent) {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;
  const allowedOrigin = getAllowedOrigin(event);

  logger.info("Project Creation Lambda triggered", {
    operation: "LambdaInvocation",
    requestId,
    path: event.path,
    httpMethod: event.httpMethod,
    userAgent: event.headers["User-Agent"],
  });

  // Check for suspicious activity
  if (AbusePreventionService.detectSuspiciousActivity(event)) {
    logger.warn("Suspicious activity detected", {
      operation: "LambdaInvocation",
      requestId,
      sourceIp: event.requestContext.identity.sourceIp,
      userAgent: event.headers["User-Agent"],
    });

    return {
      statusCode: 429,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
      },
      body: JSON.stringify({
        message: "Too many requests detected",
        requestId,
      }),
    };
  }

  // Validate request security
  const securityValidation = await APISecurityValidator.validateRequest(
    event,
    SecurityConfigs.PROJECT_CREATION
  );

  if (!securityValidation.isValid) {
    logger.warn("Security validation failed", {
      operation: "LambdaInvocation",
      requestId,
      errors: securityValidation.errors,
    });

    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
      },
      body: JSON.stringify({
        message: "Security validation failed",
        errors: securityValidation.errors,
        requestId,
      }),
    };
  }

  try {
    // Replace event body with sanitized version
    if (securityValidation.sanitizedBody) {
      event.body = JSON.stringify(securityValidation.sanitizedBody);
    }

    const result = await handleProjectCreationWithRecovery(event);

    const duration = Date.now() - startTime;

    // Record API metrics
    await projectMetrics.recordAPILatency(
      event.path || "/projects",
      event.httpMethod || "POST",
      duration,
      result.statusCode
    );

    logger.info("Project Creation Lambda completed successfully", {
      operation: "LambdaInvocation",
      requestId,
      duration,
      statusCode: result.statusCode,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const projectError = ProjectErrorClassifier.classify(error as Error, {
      operation: "LambdaInvocation",
      requestId,
    });

    // Record API error metrics
    await projectMetrics.recordAPILatency(
      event.path || "/projects",
      event.httpMethod || "POST",
      duration,
      projectError.httpStatusCode || 500
    );

    logger.error(
      "Project Creation Lambda failed",
      {
        operation: "LambdaInvocation",
        requestId,
        duration,
        errorCategory: projectError.category,
        errorCode: projectError.errorCode,
      },
      projectError
    );

    return {
      statusCode: projectError.httpStatusCode || 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
      },
      body: JSON.stringify({
        message: projectError.userMessage || "An error occurred",
        code: projectError.errorCode,
        requestId,
      }),
    };
  }
}

async function handleProjectCreationWithRecovery(
  event: APIGatewayProxyEvent
): Promise<any> {
  const requestId = event.requestContext.requestId;

  // Initialize recovery context
  ProjectRecoveryManager.initializeRecovery(requestId, "ProjectCreation");

  try {
    const result = await handleProjectCreation(event);

    // Clean up recovery context on success
    ProjectRecoveryManager.cleanupRecovery(requestId);

    return result;
  } catch (error) {
    const projectError = ProjectErrorClassifier.classify(error as Error, {
      operation: "ProjectCreation",
      requestId,
    });

    // Execute rollback if required
    if (projectError.rollbackRequired !== false) {
      await ProjectRecoveryManager.executeRollback(requestId, projectError);
    } else {
      ProjectRecoveryManager.cleanupRecovery(requestId);
    }

    throw projectError;
  }
}

async function handleProjectCreation(
  event: APIGatewayProxyEvent
): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;
  let entrepreneurId: string | undefined;
  let request: CreateProjectRequest | undefined;
  const allowedOrigin = getAllowedOrigin(event);

  logger.info("Project creation started", {
    operation: "ProjectCreation",
    requestId,
  });

  try {
    // Extract and validate authentication
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      const duration = Date.now() - startTime;

      logger.warn("Authentication failed", {
        operation: "ProjectCreation",
        requestId,
        error: tokenResult.error,
        duration,
      });

      throw new ProjectCreationError(
        "Authentication failed",
        ErrorCodes.AUTHENTICATION_FAILED,
        401,
        { error: tokenResult.error }
      );
    }

    const entrepreneurId = tokenResult.userId!;

    // Parse and sanitize request body
    let bodyString = event.body || "{}";
    if (event.isBase64Encoded) {
      bodyString = Buffer.from(bodyString, "base64").toString("utf-8");
    }

    // Clean up line breaks that might break JSON parsing
    bodyString = bodyString.replace(/\n/g, "").replace(/\r/g, "");

    // Debug logging for request body
    logger.info("Raw request body debug", {
      operation: "ProjectCreation",
      requestId,
      rawBody: event.body,
      isBase64Encoded: event.isBase64Encoded,
      processedBodyString: bodyString,
      bodyLength: bodyString.length,
    });

    let request: CreateProjectRequest;
    try {
      request = JSON.parse(bodyString);
    } catch (parseError) {
      const duration = Date.now() - startTime;

      logger.error("JSON parsing failed", {
        operation: "ProjectCreation",
        requestId,
        bodyString,
        bodyLength: bodyString.length,
        parseError: (parseError as Error).message,
        duration,
      });

      throw new ProjectCreationError(
        "Invalid JSON format",
        ErrorCodes.INVALID_REQUEST_FORMAT,
        400,
        {
          parseError: (parseError as Error).message,
          receivedBody: bodyString.substring(0, 200), // First 200 chars for debugging
        }
      );
    }

    logger.info("Processing project creation request", {
      operation: "ProjectCreation",
      requestId,
      entrepreneurId,
      projectName: request.name,
      category: request.category,
      stockSupply: request.stockSupply,
    });

    // Validate KYC status
    const kycValidation = await validateEntrepreneurKYCStatus(
      entrepreneurId,
      requestId
    );

    // Sanitize input data
    const sanitizedInput = sanitizeProjectInput({
      entrepreneurId,
      name: request.name,
      description: request.description,
      category: request.category,
      stockSupply: request.stockSupply,
      targetFundingGoal: request.targetFundingGoal,
      pricePerStock: request.pricePerStock,
      coverImageUrl: request.coverImageUrl,
    });

    // Validate project data
    const validation = validateCreateProjectInput(sanitizedInput);
    if (!validation.isValid) {
      const duration = Date.now() - startTime;

      logger.warn("Project validation failed", {
        operation: "ProjectCreation",
        requestId,
        entrepreneurId,
        errors: validation.errors,
        duration,
      });

      throw new ProjectCreationError(
        "Project validation failed",
        ErrorCodes.INVALID_PROJECT_DATA,
        400,
        { errors: validation.errors }
      );
    }

    // Check for duplicate project names (business rule)
    const nameValidation = await validateUniqueProjectName(
      sanitizedInput.name,
      entrepreneurId,
      requestId
    );

    // Create project in database
    const dbStartTime = Date.now();
    const project = await projectRepository.createProject(sanitizedInput);
    const dbDuration = Date.now() - dbStartTime;

    // Record database latency
    await projectMetrics.recordDatabaseLatency("create", "project", dbDuration);

    // Add rollback operation for project deletion if subsequent operations fail
    const rollbackOperations = new ProjectRollbackOperations(projectRepository);
    ProjectRecoveryManager.addRollbackOperation(
      requestId,
      rollbackOperations.createProjectDeletionRollback(
        project.projectId,
        requestId
      )
    );

    // Log project creation for audit and compliance
    await projectAuditService.logProjectCreation(
      {
        userId: entrepreneurId,
        projectId: project.projectId,
        ipAddress: event.requestContext.identity.sourceIp,
        userAgent: event.headers["User-Agent"],
        sessionId: event.requestContext.requestId,
        requestId,
      },
      {
        name: project.name,
        category: project.category,
        stockSupply: project.stockSupply,
        targetFundingGoal: project.targetFundingGoal,
      },
      "success"
    );

    logger.info("Project created successfully", {
      operation: "ProjectCreation",
      requestId,
      entrepreneurId,
      projectId: project.projectId,
      projectName: project.name,
    });

    // Publish EventBridge event for project creation
    await publishProjectCreationEvent(project, requestId);

    const duration = Date.now() - startTime;

    // Record project creation success metrics
    await projectMetrics.recordProjectCreation(
      true,
      duration,
      project.category,
      undefined,
      project.stockSupply
    );

    logger.info("Project creation completed successfully", {
      operation: "ProjectCreation",
      requestId,
      entrepreneurId,
      projectId: project.projectId,
      duration,
    });

    const response: CreateProjectResponse = {
      projectId: project.projectId,
      message: "Project created successfully",
      project: {
        id: project.projectId,
        name: project.name,
        description: project.description,
        category: project.category,
        stockSupply: project.stockSupply,
        targetFundingGoal: project.targetFundingGoal,
        pricePerStock: project.pricePerStock,
        status: project.status,
        createdAt: project.createdAt,
      },
    };

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Record project creation failure metrics
    if (error instanceof ProjectCreationError) {
      await projectMetrics.recordProjectCreation(
        false,
        duration,
        request?.category,
        error.code
      );

      await projectMetrics.recordProjectError(
        "creation",
        error.code,
        "validation",
        undefined
      );
    } else {
      await projectMetrics.recordProjectError(
        "creation",
        "UNEXPECTED_ERROR",
        "system",
        undefined
      );
    }

    // Log failed project creation for audit
    if (entrepreneurId) {
      await projectAuditService.logProjectCreation(
        {
          userId: entrepreneurId,
          projectId: undefined,
          ipAddress: event.requestContext.identity.sourceIp,
          userAgent: event.headers["User-Agent"],
          sessionId: event.requestContext.requestId,
          requestId,
        },
        {
          name: request?.name || "unknown",
          category: request?.category || "unknown",
          stockSupply: request?.stockSupply || 0,
          targetFundingGoal: request?.targetFundingGoal,
        },
        "failure",
        (error as Error).message
      );
    }

    if (error instanceof ProjectCreationError) {
      logger.warn("Project creation business logic error", {
        operation: "ProjectCreation",
        requestId,
        errorCode: error.code,
        duration,
      });

      const projectError = ProjectErrorClassifier.classify(error, {
        operation: "ProjectCreation",
        requestId,
      });

      throw projectError;
    }

    // Re-throw unexpected errors to be handled by main handler
    throw error;
  }
}

async function validateEntrepreneurKYCStatus(
  entrepreneurId: string,
  requestId: string
): Promise<KYCValidationResult> {
  const startTime = Date.now();

  logger.info("Validating entrepreneur KYC status", {
    operation: "KYCValidation",
    requestId,
    entrepreneurId,
  });

  try {
    const userProfile = await userRepository.getUserProfile(entrepreneurId);

    if (!userProfile) {
      const duration = Date.now() - startTime;
      logger.warn("User profile not found", {
        operation: "KYCValidation",
        requestId,
        entrepreneurId,
        duration,
      });

      throw new ProjectCreationError(
        "User profile not found",
        ErrorCodes.USER_NOT_FOUND,
        404
      );
    }

    // Enhanced KYC status validation with detailed logging
    const validKYCStatuses = ["approved"];
    const isKYCValid = validKYCStatuses.includes(userProfile.kycStatus);

    if (!isKYCValid) {
      const duration = Date.now() - startTime;
      logger.warn("KYC verification incomplete", {
        operation: "KYCValidation",
        requestId,
        entrepreneurId,
        kycStatus: userProfile.kycStatus,
        validStatuses: validKYCStatuses,
        duration,
      });

      throw new ProjectCreationError(
        "KYC verification must be completed before creating projects",
        ErrorCodes.KYC_NOT_VERIFIED,
        403,
        {
          kycStatus: userProfile.kycStatus,
          requiredStatus: "approved",
          userId: entrepreneurId,
        }
      );
    }

    const duration = Date.now() - startTime;
    logger.info("KYC validation successful", {
      operation: "KYCValidation",
      requestId,
      entrepreneurId,
      kycStatus: userProfile.kycStatus,
      duration,
    });

    return {
      isValid: true,
      kycStatus: userProfile.kycStatus as "approved",
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof ProjectCreationError) {
      // Re-throw business logic errors
      throw error;
    }

    // Handle unexpected errors during KYC validation
    logger.error(
      "Unexpected error during KYC validation",
      {
        operation: "KYCValidation",
        requestId,
        entrepreneurId,
        duration,
      },
      error as Error
    );

    throw new ProjectCreationError(
      "Unable to verify KYC status at this time",
      ErrorCodes.KYC_VALIDATION_ERROR,
      503,
      { entrepreneurId }
    );
  }
}

async function validateUniqueProjectName(
  projectName: string,
  entrepreneurId: string,
  requestId: string
): Promise<BusinessRuleValidationResult> {
  const startTime = Date.now();

  logger.info("Validating unique project name", {
    operation: "UniqueNameValidation",
    requestId,
    entrepreneurId,
    projectName,
  });

  try {
    // Get all projects for the entrepreneur with pagination handling
    const existingProjects = await projectRepository.getProjectsByEntrepreneur(
      entrepreneurId,
      { limit: 100 } // Reasonable limit for name checking
    );

    // Enhanced duplicate detection with normalization
    const normalizedProjectName = projectName.toLowerCase().trim();
    const duplicateProject = existingProjects.items.find(
      (project) => project.name.toLowerCase().trim() === normalizedProjectName
    );

    if (duplicateProject) {
      const duration = Date.now() - startTime;
      logger.warn("Duplicate project name detected", {
        operation: "UniqueNameValidation",
        requestId,
        entrepreneurId,
        projectName,
        normalizedName: normalizedProjectName,
        existingProjectId: duplicateProject.projectId,
        existingProjectName: duplicateProject.name,
        duration,
      });

      throw new ProjectCreationError(
        "A project with this name already exists for your account",
        ErrorCodes.PROJECT_NAME_EXISTS,
        409,
        {
          existingProjectId: duplicateProject.projectId,
          existingProjectName: duplicateProject.name,
          attemptedName: projectName,
        }
      );
    }

    const duration = Date.now() - startTime;
    logger.info("Project name validation successful", {
      operation: "UniqueNameValidation",
      requestId,
      entrepreneurId,
      projectName,
      normalizedName: normalizedProjectName,
      checkedProjects: existingProjects.count,
      duration,
    });

    return {
      isValid: true,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof ProjectCreationError) {
      // Re-throw business logic errors
      throw error;
    }

    // Handle unexpected errors during name validation
    logger.error(
      "Unexpected error during project name validation",
      {
        operation: "UniqueNameValidation",
        requestId,
        entrepreneurId,
        projectName,
        duration,
      },
      error as Error
    );

    throw new ProjectCreationError(
      "Unable to validate project name at this time",
      ErrorCodes.DATABASE_ERROR,
      503,
      { entrepreneurId, projectName }
    );
  }
}

async function publishProjectCreationEvent(
  project: any,
  requestId: string
): Promise<void> {
  const eventPublishStartTime = Date.now();

  try {
    await projectEventPublisher.publishProjectCreatedEvent({
      projectId: project.projectId,
      entrepreneurId: project.entrepreneurId,
      projectName: project.name,
      category: project.category,
      stockSupply: project.stockSupply,
      targetFundingGoal: project.targetFundingGoal,
      pricePerStock: project.pricePerStock,
      status: project.status,
      createdAt: project.createdAt,
    });

    const eventPublishDuration = Date.now() - eventPublishStartTime;

    logger.info("Project creation event published successfully", {
      operation: "ProjectCreation",
      requestId,
      projectId: project.projectId,
      eventPublishDuration,
    });
  } catch (eventError) {
    const eventPublishDuration = Date.now() - eventPublishStartTime;
    const errorDetails = ErrorClassifier.classify(eventError as Error);

    // Log the error but don't fail the project creation operation
    logger.error(
      "Failed to publish project creation event",
      {
        operation: "ProjectCreation",
        requestId,
        projectId: project.projectId,
        eventPublishDuration,
        errorCategory: errorDetails.category,
      },
      eventError as Error
    );

    // Note: We don't throw here as the project was successfully created
    // The event publishing failure is logged for monitoring
  }
}
