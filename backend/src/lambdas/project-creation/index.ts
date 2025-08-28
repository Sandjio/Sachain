import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

import { createProjectLogger } from "../../utils/structured-logger";
import { ErrorClassifier } from "../../utils/error-handler";
import { ProjectErrorClassifier, withErrorHandling } from "../../utils/enhanced-error-handler";
import { ErrorResponseFormatter, withErrorFormatting } from "../../utils/error-response-formatter";
import { ProjectRecoveryManager, ProjectRollbackOperations } from "../../utils/error-recovery";
import { EventPublisher } from "../../utils/event-publisher";
import { extractUserIdFromToken } from "../../utils/jwt-utils";
import { UserRepository } from "../../repositories/user-repository";
import { ProjectRepository } from "../../repositories/project-repository";
import {
  validateCreateProjectInput,
  sanitizeProjectInput,
} from "../../utils/project-validation";
import {
  CreateProjectRequest,
  CreateProjectResponse,
  ProjectCreationError,
  ErrorCodes,
  KYCValidationResult,
  BusinessRuleValidationResult,
} from "./types";
import { CreateProjectInput } from "../../models/project";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || "default";
const ENVIRONMENT = process.env.ENVIRONMENT!;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

// Initialize services
const logger = createProjectLogger();
const eventPublisher = new EventPublisher({
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

export const handler: APIGatewayProxyHandler = withErrorFormatting()(async (event) => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("Project Creation Lambda triggered", {
    operation: "LambdaInvocation",
    requestId,
    path: event.path,
    httpMethod: event.httpMethod,
    userAgent: event.headers["User-Agent"],
  });

  try {
    const result = await handleProjectCreationWithRecovery(event);

    const duration = Date.now() - startTime;
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
      duration,
    });

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

    throw projectError;
  }
});

async function handleProjectCreationWithRecovery(
  event: APIGatewayProxyEvent
): Promise<any> {
  const requestId = event.requestContext.requestId;
  
  // Initialize recovery context
  const recoveryContext = ProjectRecoveryManager.initializeRecovery(
    requestId,
    'ProjectCreation'
  );

  try {
    const result = await handleProjectCreation(event);
    
    // Clean up recovery context on success
    ProjectRecoveryManager.cleanupRecovery(requestId);
    
    return result;
  } catch (error) {
    const projectError = ProjectErrorClassifier.classify(error as Error, {
      operation: 'ProjectCreation',
      requestId
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

    const request: CreateProjectRequest = JSON.parse(bodyString);

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
    const project = await projectRepository.createProject(sanitizedInput);
    
    // Add rollback operation for project deletion if subsequent operations fail
    const rollbackOperations = new ProjectRollbackOperations(projectRepository);
    ProjectRecoveryManager.addRollbackOperation(
      requestId,
      rollbackOperations.createProjectDeletionRollback(project.projectId, requestId)
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

    return ErrorResponseFormatter.formatSuccessResponse(
      response,
      201,
      "Project created successfully"
    );
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof ProjectCreationError) {
      logger.warn("Project creation business logic error", {
        operation: "ProjectCreation",
        requestId,
        errorCode: error.code,
        duration,
      });

      const projectError = ProjectErrorClassifier.classify(error, {
        operation: "ProjectCreation",
        requestId
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
    const eventDetail = {
      eventType: "PROJECT_CREATED",
      projectId: project.projectId,
      entrepreneurId: project.entrepreneurId,
      projectName: project.name,
      category: project.category,
      stockSupply: project.stockSupply,
      status: project.status,
      createdAt: project.createdAt,
    };

    await eventPublisher.publishProjectCreatedEvent(eventDetail);

    const eventPublishDuration = Date.now() - eventPublishStartTime;

    logger.info("Project creation event published successfully", {
      operation: "ProjectCreation",
      requestId,
      projectId: project.projectId,
      eventDetail,
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
