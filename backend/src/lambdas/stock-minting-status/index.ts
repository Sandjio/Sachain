import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { createProjectLogger } from "../../utils/structured-logger";
import { ErrorClassifier } from "../../utils/error-handler";
import { extractUserIdFromToken } from "../../utils/jwt-utils";
import { ProjectRepository } from "../../repositories/project-repository";
import { MintingStatusResponse, MintingStatusError, ErrorCodes } from "./types";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

// Initialize services
const logger = createProjectLogger();

const projectRepository = new ProjectRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

export const handler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("Stock Minting Status Lambda triggered", {
    operation: "LambdaInvocation",
    requestId,
    path: event.path,
    httpMethod: event.httpMethod,
    userAgent: event.headers["User-Agent"],
  });

  try {
    const result = await handleMintingStatusRequest(event);

    const duration = Date.now() - startTime;
    logger.info("Stock Minting Status Lambda completed successfully", {
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
      "Stock Minting Status Lambda failed",
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

async function handleMintingStatusRequest(
  event: APIGatewayProxyEvent
): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("Minting status request started", {
    operation: "MintingStatusRequest",
    requestId,
  });

  try {
    // Extract and validate authentication
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      const duration = Date.now() - startTime;

      logger.warn("Authentication failed", {
        operation: "MintingStatusRequest",
        requestId,
        error: tokenResult.error,
        duration,
      });

      throw new MintingStatusError(
        "Authentication failed",
        ErrorCodes.AUTHENTICATION_FAILED,
        401,
        { error: tokenResult.error }
      );
    }

    const entrepreneurId = tokenResult.userId!;

    // Extract project ID from path parameters
    const projectId = event.pathParameters?.projectId;
    if (!projectId) {
      throw new MintingStatusError(
        "Project ID is required",
        ErrorCodes.INVALID_REQUEST,
        400
      );
    }

    logger.info("Processing minting status request", {
      operation: "MintingStatusRequest",
      requestId,
      entrepreneurId,
      projectId,
    });

    // Get project and validate ownership
    const project = await validateProjectAccess(
      projectId,
      entrepreneurId,
      requestId
    );

    // Get minting status and progress
    const mintingStatus = await getMintingStatus(project, requestId);

    const duration = Date.now() - startTime;
    logger.info("Minting status request completed successfully", {
      operation: "MintingStatusRequest",
      requestId,
      entrepreneurId,
      projectId,
      projectStatus: mintingStatus.status,
      duration,
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(mintingStatus),
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof MintingStatusError) {
      logger.warn("Minting status business logic error", {
        operation: "MintingStatusRequest",
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

async function validateProjectAccess(
  projectId: string,
  entrepreneurId: string,
  requestId: string
): Promise<any> {
  const startTime = Date.now();

  logger.info("Validating project access", {
    operation: "ProjectAccessValidation",
    requestId,
    projectId,
    entrepreneurId,
  });

  try {
    // Get project details
    const project = await projectRepository.getProject(projectId);

    if (!project) {
      throw new MintingStatusError(
        "Project not found",
        ErrorCodes.PROJECT_NOT_FOUND,
        404,
        { projectId }
      );
    }

    // Verify ownership
    if (project.entrepreneurId !== entrepreneurId) {
      throw new MintingStatusError(
        "You are not authorized to view minting status for this project",
        ErrorCodes.UNAUTHORIZED_ACCESS,
        403,
        { projectId, entrepreneurId, projectOwner: project.entrepreneurId }
      );
    }

    const duration = Date.now() - startTime;
    logger.info("Project access validation successful", {
      operation: "ProjectAccessValidation",
      requestId,
      projectId,
      entrepreneurId,
      projectStatus: project.status,
      duration,
    });

    return project;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof MintingStatusError) {
      throw error;
    }

    logger.error(
      "Unexpected error during project access validation",
      {
        operation: "ProjectAccessValidation",
        requestId,
        projectId,
        entrepreneurId,
        duration,
      },
      error as Error
    );

    throw new MintingStatusError(
      "Unable to validate project access at this time",
      ErrorCodes.DATABASE_ERROR,
      503,
      { projectId, entrepreneurId }
    );
  }
}

async function getMintingStatus(
  project: any,
  requestId: string
): Promise<MintingStatusResponse> {
  const startTime = Date.now();

  logger.info("Getting minting status", {
    operation: "GetMintingStatus",
    requestId,
    projectId: project.projectId,
    projectStatus: project.status,
  });

  try {
    const response: MintingStatusResponse = {
      projectId: project.projectId,
      status: project.status,
      progress: {
        completed: 0,
        total: project.stockSupply,
        percentage: 0,
        status: "in_progress",
      },
    };

    // Handle different project statuses
    switch (project.status) {
      case "draft":
        response.progress = {
          completed: 0,
          total: project.stockSupply,
          percentage: 0,
          status: "in_progress",
        };
        break;

      case "minting":
        // Get current minting progress
        const mintingProgress = await getCurrentMintingProgress(
          project.projectId,
          requestId
        );
        response.progress = mintingProgress.progress;
        response.tokenId = mintingProgress.tokenId;
        response.startedAt = mintingProgress.startedAt;
        response.estimatedCompletion = mintingProgress.estimatedCompletion;
        break;

      case "active":
      case "paused":
      case "completed":
        // Get completed minting information
        const completedInfo = await getCompletedMintingInfo(
          project.projectId,
          requestId
        );
        response.progress = {
          completed: completedInfo.totalMinted,
          total: project.stockSupply,
          percentage: 100,
          status: "completed",
        };
        response.tokenId = completedInfo.tokenId;
        response.totalMinted = completedInfo.totalMinted;
        response.mintingBatches = completedInfo.mintingBatches;
        response.transactionIds = completedInfo.transactionIds;
        response.startedAt = completedInfo.startedAt;
        response.completedAt = completedInfo.completedAt;
        break;

      default:
        throw new MintingStatusError(
          `Unknown project status: ${project.status}`,
          ErrorCodes.INVALID_PROJECT_STATUS,
          422,
          { projectId: project.projectId, status: project.status }
        );
    }

    const duration = Date.now() - startTime;
    logger.info("Minting status retrieved successfully", {
      operation: "GetMintingStatus",
      requestId,
      projectId: project.projectId,
      status: response.status,
      progress: response.progress,
      duration,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof MintingStatusError) {
      throw error;
    }

    logger.error(
      "Unexpected error getting minting status",
      {
        operation: "GetMintingStatus",
        requestId,
        projectId: project.projectId,
        duration,
      },
      error as Error
    );

    throw new MintingStatusError(
      "Unable to retrieve minting status at this time",
      ErrorCodes.DATABASE_ERROR,
      503,
      { projectId: project.projectId }
    );
  }
}

async function getCurrentMintingProgress(
  projectId: string,
  requestId: string
): Promise<{
  progress: any;
  tokenId?: string;
  startedAt?: string;
  estimatedCompletion?: string;
}> {
  const startTime = Date.now();

  logger.info("Getting current minting progress", {
    operation: "GetMintingProgress",
    requestId,
    projectId,
  });

  try {
    // Get project statistics to determine current progress
    const stats = await projectRepository.getProjectStats(projectId);

    // Get Hedera transactions to find token ID and timing
    const transactions = await projectRepository.getHederaTransactions(
      projectId
    );

    const tokenCreationTx = transactions.find(
      (tx) => tx.transactionType === "token_creation"
    );
    const mintingTxs = transactions.filter(
      (tx) => tx.transactionType === "nft_mint"
    );

    // Calculate progress based on completed minting transactions
    const completedMints = mintingTxs.filter((tx) => tx.status === "success");
    const totalMinted = stats?.mintedStocks || 0;
    const totalStocks = stats?.totalStocks || 0;

    // Estimate completion time based on current progress
    let estimatedCompletion: string | undefined;
    if (tokenCreationTx && totalMinted > 0 && totalMinted < totalStocks) {
      const startTime = new Date(tokenCreationTx.timestamp).getTime();
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const rate = totalMinted / elapsed; // stocks per millisecond
      const remaining = totalStocks - totalMinted;
      const estimatedRemainingTime = remaining / rate;
      estimatedCompletion = new Date(
        currentTime + estimatedRemainingTime
      ).toISOString();
    }

    const progress = {
      completed: totalMinted,
      total: totalStocks,
      percentage:
        totalStocks > 0 ? Math.round((totalMinted / totalStocks) * 100) : 0,
      status: totalMinted === totalStocks ? "completed" : "in_progress",
      currentBatch: completedMints.length + 1,
      totalBatches: Math.ceil(totalStocks / 50), // Assuming batch size of 50
    };

    const duration = Date.now() - startTime;
    logger.info("Current minting progress retrieved", {
      operation: "GetMintingProgress",
      requestId,
      projectId,
      progress,
      tokenId: tokenCreationTx?.transactionId,
      duration,
    });

    return {
      progress,
      tokenId: tokenCreationTx?.transactionId,
      startedAt: tokenCreationTx?.timestamp,
      estimatedCompletion,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      "Error getting current minting progress",
      {
        operation: "GetMintingProgress",
        requestId,
        projectId,
        duration,
      },
      error as Error
    );

    // Return default progress on error
    return {
      progress: {
        completed: 0,
        total: 0,
        percentage: 0,
        status: "in_progress",
      },
    };
  }
}

async function getCompletedMintingInfo(
  projectId: string,
  requestId: string
): Promise<{
  totalMinted: number;
  mintingBatches: number;
  transactionIds: string[];
  tokenId?: string;
  startedAt?: string;
  completedAt?: string;
}> {
  const startTime = Date.now();

  logger.info("Getting completed minting info", {
    operation: "GetCompletedMintingInfo",
    requestId,
    projectId,
  });

  try {
    // Get project statistics
    const stats = await projectRepository.getProjectStats(projectId);

    // Get all Hedera transactions for this project
    const transactions = await projectRepository.getHederaTransactions(
      projectId
    );

    const tokenCreationTx = transactions.find(
      (tx) => tx.transactionType === "token_creation"
    );
    const mintingTxs = transactions.filter(
      (tx) => tx.transactionType === "nft_mint" && tx.status === "success"
    );

    // Find the latest minting transaction for completion time
    const latestMintingTx = mintingTxs.reduce((latest, tx) => {
      return new Date(tx.timestamp) > new Date(latest.timestamp) ? tx : latest;
    }, mintingTxs[0]);

    const result = {
      totalMinted: stats?.mintedStocks || 0,
      mintingBatches: mintingTxs.length,
      transactionIds: mintingTxs.map((tx) => tx.transactionId),
      tokenId: tokenCreationTx?.transactionId,
      startedAt: tokenCreationTx?.timestamp,
      completedAt: latestMintingTx?.timestamp,
    };

    const duration = Date.now() - startTime;
    logger.info("Completed minting info retrieved", {
      operation: "GetCompletedMintingInfo",
      requestId,
      projectId,
      result,
      duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      "Error getting completed minting info",
      {
        operation: "GetCompletedMintingInfo",
        requestId,
        projectId,
        duration,
      },
      error as Error
    );

    // Return default info on error
    return {
      totalMinted: 0,
      mintingBatches: 0,
      transactionIds: [],
    };
  }
}
