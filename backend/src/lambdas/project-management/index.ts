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
import {
  validateUpdateProjectInput,
  sanitizeProjectInput,
} from "../../utils/project-validation";
import {
  UpdateProjectRequest,
  UpdateProjectResponse,
  DeleteProjectResponse,
  ProjectStatusTransitionRequest,
  ProjectStatusTransitionResponse,
  ProjectManagementError,
  ErrorCodes,
  ProjectStatusTransition,
} from "./types";
import { UpdateProjectInput, Project } from "../../models/project";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || "default";
const ENVIRONMENT = process.env.ENVIRONMENT!;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

// Initialize services
const logger = createProjectLogger();
// Project event publisher will be injected for testing or created here for production
let projectEventPublisher: ProjectEventPublisher;

function getProjectEventPublisher(): ProjectEventPublisher {
  if (!projectEventPublisher) {
    projectEventPublisher = createProjectEventPublisher({
      eventBusName: EVENT_BUS_NAME,
      region: AWS_REGION,
    });
  }
  return projectEventPublisher;
}

// Export for testing
export function setProjectEventPublisher(publisher: ProjectEventPublisher) {
  projectEventPublisher = publisher;
}

// Repository will be injected for testing or created here for production
let projectRepository: ProjectRepository;

function getProjectRepository(): ProjectRepository {
  if (!projectRepository) {
    projectRepository = new ProjectRepository({
      tableName: TABLE_NAME,
      region: AWS_REGION,
    });
  }
  return projectRepository;
}

// Export for testing
export function setProjectRepository(repo: ProjectRepository) {
  projectRepository = repo;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("Project Management Lambda triggered", {
    operation: "LambdaInvocation",
    requestId,
    path: event.path,
    httpMethod: event.httpMethod,
    pathParameters: event.pathParameters,
    userAgent: event.headers["User-Agent"],
  });

  try {
    const result = await routeRequest(event);

    const duration = Date.now() - startTime;
    logger.info("Project Management Lambda completed successfully", {
      operation: "LambdaInvocation",
      requestId,
      duration,
      statusCode: result.statusCode,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Handle ProjectManagementError specifically
    if (error instanceof ProjectManagementError) {
      logger.warn("Project Management Lambda business logic error", {
        operation: "LambdaInvocation",
        requestId,
        duration,
        errorCode: error.code,
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

    // Handle other errors with ErrorClassifier
    const errorDetails = ErrorClassifier.classify(error as Error, {
      operation: "LambdaInvocation",
      requestId,
      duration,
    });

    logger.error(
      "Project Management Lambda failed",
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

async function routeRequest(event: APIGatewayProxyEvent): Promise<any> {
  const { httpMethod, path } = event;
  const pathSegments = path.split("/").filter(Boolean);

  // Extract project ID from path parameters or path
  const projectId = event.pathParameters?.projectId || pathSegments[1];

  if (!projectId) {
    throw new ProjectManagementError(
      "Project ID is required",
      ErrorCodes.ROUTE_NOT_FOUND,
      404
    );
  }

  switch (httpMethod) {
    case "PUT":
      if (pathSegments.length === 2) {
        // PUT /projects/{projectId} - Update project
        return await handleProjectUpdate(event, projectId);
      } else if (pathSegments.length === 3 && pathSegments[2] === "status") {
        // PUT /projects/{projectId}/status - Update project status
        return await handleProjectStatusTransition(event, projectId);
      }
      break;

    case "DELETE":
      if (pathSegments.length === 2) {
        // DELETE /projects/{projectId} - Delete project
        return await handleProjectDeletion(event, projectId);
      }
      break;

    default:
      throw new ProjectManagementError(
        "Method not allowed",
        ErrorCodes.METHOD_NOT_ALLOWED,
        405
      );
  }

  throw new ProjectManagementError(
    "Route not found",
    ErrorCodes.ROUTE_NOT_FOUND,
    404
  );
}

async function handleProjectUpdate(
  event: APIGatewayProxyEvent,
  projectId: string
): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("Project update started", {
    operation: "ProjectUpdate",
    requestId,
    projectId,
  });

  try {
    // Extract and validate authentication
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      throw new ProjectManagementError(
        "Authentication failed",
        ErrorCodes.AUTHENTICATION_FAILED,
        401,
        { error: tokenResult.error }
      );
    }

    const entrepreneurId = tokenResult.userId!;

    // Parse request body
    let bodyString = event.body || "{}";
    if (event.isBase64Encoded) {
      bodyString = Buffer.from(bodyString, "base64").toString("utf-8");
    }

    const request: UpdateProjectRequest = JSON.parse(bodyString);

    // Validate project exists and ownership
    const project = await validateProjectOwnership(
      projectId,
      entrepreneurId,
      requestId
    );

    // Validate project is in draft status (only draft projects can be updated)
    if (project.status !== "draft") {
      throw new ProjectManagementError(
        "Only draft projects can be updated",
        ErrorCodes.INVALID_PROJECT_STATUS,
        422,
        {
          projectId,
          currentStatus: project.status,
          allowedStatus: "draft",
        }
      );
    }

    // Build update input with only provided fields
    const updateInput: UpdateProjectInput = {
      projectId,
    };

    // Only include fields that are provided in the request
    if (request.name !== undefined) {
      updateInput.name = request.name;
    }
    if (request.description !== undefined) {
      updateInput.description = request.description;
    }
    if (request.category !== undefined) {
      updateInput.category = request.category;
    }
    if (request.targetFundingGoal !== undefined) {
      updateInput.targetFundingGoal = request.targetFundingGoal;
    }
    if (request.pricePerStock !== undefined) {
      updateInput.pricePerStock = request.pricePerStock;
    }
    if (request.coverImageUrl !== undefined) {
      updateInput.coverImageUrl = request.coverImageUrl;
    }

    // Validate update data
    const validation = validateUpdateProjectInput(updateInput);
    if (!validation.isValid) {
      throw new ProjectManagementError(
        "Project validation failed",
        ErrorCodes.INVALID_PROJECT_DATA,
        400,
        { errors: validation.errors }
      );
    }

    // Track changes for event publishing
    const changes: Record<string, any> = {};
    if (request.name !== undefined && request.name !== project.name) {
      changes.name = { from: project.name, to: request.name };
    }
    if (
      request.description !== undefined &&
      request.description !== project.description
    ) {
      changes.description = {
        from: project.description,
        to: request.description,
      };
    }
    if (
      request.category !== undefined &&
      request.category !== project.category
    ) {
      changes.category = { from: project.category, to: request.category };
    }
    if (
      request.targetFundingGoal !== undefined &&
      request.targetFundingGoal !== project.targetFundingGoal
    ) {
      changes.targetFundingGoal = {
        from: project.targetFundingGoal,
        to: request.targetFundingGoal,
      };
    }
    if (
      request.pricePerStock !== undefined &&
      request.pricePerStock !== project.pricePerStock
    ) {
      changes.pricePerStock = {
        from: project.pricePerStock,
        to: request.pricePerStock,
      };
    }
    if (
      request.coverImageUrl !== undefined &&
      request.coverImageUrl !== project.coverImageUrl
    ) {
      changes.coverImageUrl = {
        from: project.coverImageUrl,
        to: request.coverImageUrl,
      };
    }

    // Update project in database
    await getProjectRepository().updateProject(updateInput);

    logger.info("Project updated successfully", {
      operation: "ProjectUpdate",
      requestId,
      projectId,
      entrepreneurId,
      changes: Object.keys(changes),
    });

    // Publish EventBridge event for project update
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
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
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

    // Re-throw unexpected errors
    throw error;
  }
}

async function handleProjectStatusTransition(
  event: APIGatewayProxyEvent,
  projectId: string
): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("Project status transition started", {
    operation: "ProjectStatusTransition",
    requestId,
    projectId,
  });

  try {
    // Extract and validate authentication
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      throw new ProjectManagementError(
        "Authentication failed",
        ErrorCodes.AUTHENTICATION_FAILED,
        401,
        { error: tokenResult.error }
      );
    }

    const entrepreneurId = tokenResult.userId!;

    // Parse request body
    let bodyString = event.body || "{}";
    if (event.isBase64Encoded) {
      bodyString = Buffer.from(bodyString, "base64").toString("utf-8");
    }

    const request: ProjectStatusTransitionRequest = JSON.parse(bodyString);

    // Validate project exists and ownership
    const project = await validateProjectOwnership(
      projectId,
      entrepreneurId,
      requestId
    );

    // Validate status transition
    const transition = validateStatusTransition(
      project.status,
      request.newStatus
    );
    if (!transition.isValid) {
      throw new ProjectManagementError(
        transition.error!,
        ErrorCodes.INVALID_STATUS_TRANSITION,
        422,
        {
          projectId,
          currentStatus: project.status,
          requestedStatus: request.newStatus,
          allowedTransitions: transition.allowedTransitions,
        }
      );
    }

    // Update project status
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

    // Publish EventBridge event for status change
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
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
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

    // Re-throw unexpected errors
    throw error;
  }
}

async function handleProjectDeletion(
  event: APIGatewayProxyEvent,
  projectId: string
): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("Project deletion started", {
    operation: "ProjectDeletion",
    requestId,
    projectId,
  });

  try {
    // Extract and validate authentication
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      throw new ProjectManagementError(
        "Authentication failed",
        ErrorCodes.AUTHENTICATION_FAILED,
        401,
        { error: tokenResult.error }
      );
    }

    const entrepreneurId = tokenResult.userId!;

    // Validate project exists and ownership
    const project = await validateProjectOwnership(
      projectId,
      entrepreneurId,
      requestId
    );

    // Validate project can be deleted (only draft projects can be deleted)
    if (project.status !== "draft") {
      throw new ProjectManagementError(
        "Only draft projects can be deleted",
        ErrorCodes.INVALID_PROJECT_STATUS,
        422,
        {
          projectId,
          currentStatus: project.status,
          allowedStatus: "draft",
        }
      );
    }

    // Perform cascade deletion
    await performCascadeDeletion(projectId, requestId);

    logger.info("Project deleted successfully", {
      operation: "ProjectDeletion",
      requestId,
      projectId,
      entrepreneurId,
    });

    // Publish EventBridge event for project deletion
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
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
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

    // Re-throw unexpected errors
    throw error;
  }
}

// Helper functions

async function validateProjectOwnership(
  projectId: string,
  entrepreneurId: string,
  requestId: string
): Promise<Project> {
  const project = await getProjectRepository().getProject(projectId);

  if (!project) {
    throw new ProjectManagementError(
      "Project not found",
      ErrorCodes.PROJECT_NOT_FOUND,
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
      ErrorCodes.UNAUTHORIZED_ACCESS,
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
  // Define valid status transitions
  const validTransitions: Record<string, string[]> = {
    draft: ["minting", "paused"],
    minting: ["active", "paused", "draft"],
    active: ["paused", "completed"],
    paused: ["draft", "minting", "active"],
    completed: [], // No transitions allowed from completed
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

  return {
    isValid: true,
    allowedTransitions,
  };
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
    // Delete project statistics
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

    // Delete Hedera transactions
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

    // Note: Stock NFTs should not exist for draft projects, but we'll check anyway
    // In a real implementation, we might need to query for stocks and delete them
    // For now, we'll assume draft projects don't have stocks

    // Finally, delete the main project record
    await getProjectRepository().deleteProject(projectId);

    logger.info("Cascade deletion completed", {
      operation: "CascadeDeletion",
      requestId,
      projectId,
    });
  } catch (error) {
    logger.error(
      "Cascade deletion failed",
      {
        operation: "CascadeDeletion",
        requestId,
        projectId,
      },
      error as Error
    );

    throw new ProjectManagementError(
      "Failed to delete project and related data",
      ErrorCodes.CASCADE_DELETION_FAILED,
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
      {
        operation: "ProjectUpdate",
        requestId,
        projectId,
      },
      eventError as Error
    );
    // Don't fail the operation for event publishing errors
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
      {
        operation: "ProjectStatusTransition",
        requestId,
        projectId,
      },
      eventError as Error
    );
    // Don't fail the operation for event publishing errors
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
      {
        operation: "ProjectDeletion",
        requestId,
        projectId,
      },
      eventError as Error
    );
    // Don't fail the operation for event publishing errors
  }
}
