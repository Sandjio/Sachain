import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { createProjectLogger } from "../../utils/structured-logger";
import { ErrorClassifier } from "../../utils/error-handler";
import { EventPublisher } from "../../utils/event-publisher";
import { extractUserIdFromToken } from "../../utils/jwt-utils";
import { ProjectRepository } from "../../repositories/project-repository";
import { createHederaService } from "../../utils/hedera-service";
import { defaultIPFSService } from "../../utils/ipfs-service";
import {
  MintStocksRequest,
  MintStocksResponse,
  StockMintingError,
  ErrorCodes,
  MintingProgress,
  BatchMintingResult,
} from "./types";
import {
  StockNFT,
  CreateStockNFTInput,
  ProjectStats,
} from "../../models/project";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || "default";
const ENVIRONMENT = process.env.ENVIRONMENT!;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

// Batch size for NFT minting (Hedera limit is 100 per transaction)
const BATCH_SIZE = 50;

// Initialize services
const logger = createProjectLogger();
const eventPublisher = new EventPublisher({
  eventBusName: EVENT_BUS_NAME,
  region: AWS_REGION,
});

const projectRepository = new ProjectRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

const hederaService = createHederaService();
const ipfsService = defaultIPFSService;

export const handler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("Stock Minting Lambda triggered", {
    operation: "LambdaInvocation",
    requestId,
    path: event.path,
    httpMethod: event.httpMethod,
    userAgent: event.headers["User-Agent"],
  });

  try {
    const result = await handleStockMinting(event);

    const duration = Date.now() - startTime;
    logger.info("Stock Minting Lambda completed successfully", {
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
      "Stock Minting Lambda failed",
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

async function handleStockMinting(event: APIGatewayProxyEvent): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("Stock minting started", {
    operation: "StockMinting",
    requestId,
  });

  try {
    // Extract and validate authentication
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      const duration = Date.now() - startTime;

      logger.warn("Authentication failed", {
        operation: "StockMinting",
        requestId,
        error: tokenResult.error,
        duration,
      });

      throw new StockMintingError(
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
      throw new StockMintingError(
        "Project ID is required",
        ErrorCodes.INVALID_REQUEST,
        400
      );
    }

    // Parse request body
    let bodyString = event.body || "{}";
    if (event.isBase64Encoded) {
      bodyString = Buffer.from(bodyString, "base64").toString("utf-8");
    }

    bodyString = bodyString.replace(/\n/g, "").replace(/\r/g, "");
    const request: MintStocksRequest = JSON.parse(bodyString);

    logger.info("Processing stock minting request", {
      operation: "StockMinting",
      requestId,
      entrepreneurId,
      projectId,
      walletAddress: request.walletAddress,
    });

    // Validate project and ownership
    const project = await validateProjectForMinting(
      projectId,
      entrepreneurId,
      requestId
    );

    // Validate wallet and gas fees
    await validateWalletForMinting(
      request.walletAddress,
      project.stockSupply,
      requestId
    );

    // Update project status to minting
    await updateProjectStatus(projectId, "minting", requestId);

    // Create Hedera token for the project
    const tokenCreationResult = await createProjectToken(project, requestId);

    // Mint NFTs in batches with progress tracking
    const mintingResult = await mintStockNFTsInBatches(
      project,
      tokenCreationResult.tokenId,
      request.walletAddress,
      requestId
    );

    // Update project status to active
    await updateProjectStatus(projectId, "active", requestId);

    // Update project statistics
    await updateProjectStatistics(project, mintingResult, requestId);

    // Publish completion events
    await publishStockMintingEvents(project, mintingResult, requestId);

    const duration = Date.now() - startTime;
    logger.info("Stock minting completed successfully", {
      operation: "StockMinting",
      requestId,
      entrepreneurId,
      projectId,
      tokenId: tokenCreationResult.tokenId,
      totalMinted: mintingResult.totalMinted,
      duration,
    });

    const response: MintStocksResponse = {
      message: "Stock minting completed successfully",
      tokenId: tokenCreationResult.tokenId,
      totalMinted: mintingResult.totalMinted,
      mintingBatches: mintingResult.batches.length,
      transactionIds: mintingResult.transactionIds,
      progress: {
        completed: mintingResult.totalMinted,
        total: project.stockSupply,
        percentage: 100,
        status: "completed",
      },
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

    if (error instanceof StockMintingError) {
      logger.warn("Stock minting business logic error", {
        operation: "StockMinting",
        requestId,
        errorCode: error.code,
        duration,
      });

      // Attempt to rollback project status if it was changed
      if (event.pathParameters?.projectId) {
        try {
          await rollbackProjectStatus(
            event.pathParameters.projectId,
            requestId
          );
        } catch (rollbackError) {
          logger.error(
            "Failed to rollback project status",
            {
              operation: "StockMinting",
              requestId,
              projectId: event.pathParameters.projectId,
            },
            rollbackError as Error
          );
        }
      }

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

async function validateProjectForMinting(
  projectId: string,
  entrepreneurId: string,
  requestId: string
): Promise<any> {
  const startTime = Date.now();

  logger.info("Validating project for minting", {
    operation: "ProjectValidation",
    requestId,
    projectId,
    entrepreneurId,
  });

  try {
    // Get project details
    const project = await projectRepository.getProject(projectId);

    if (!project) {
      throw new StockMintingError(
        "Project not found",
        ErrorCodes.PROJECT_NOT_FOUND,
        404,
        { projectId }
      );
    }

    // Verify ownership
    if (project.entrepreneurId !== entrepreneurId) {
      throw new StockMintingError(
        "You are not authorized to mint stocks for this project",
        ErrorCodes.UNAUTHORIZED_ACCESS,
        403,
        { projectId, entrepreneurId, projectOwner: project.entrepreneurId }
      );
    }

    // Check project status
    if (project.status !== "draft") {
      throw new StockMintingError(
        `Cannot mint stocks for project in ${project.status} status`,
        ErrorCodes.INVALID_PROJECT_STATUS,
        422,
        { projectId, currentStatus: project.status, requiredStatus: "draft" }
      );
    }

    // Validate stock supply
    if (project.stockSupply <= 0) {
      throw new StockMintingError(
        "Project must have a positive stock supply",
        ErrorCodes.INVALID_STOCK_SUPPLY,
        422,
        { projectId, stockSupply: project.stockSupply }
      );
    }

    const duration = Date.now() - startTime;
    logger.info("Project validation successful", {
      operation: "ProjectValidation",
      requestId,
      projectId,
      entrepreneurId,
      projectStatus: project.status,
      stockSupply: project.stockSupply,
      duration,
    });

    return project;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof StockMintingError) {
      throw error;
    }

    logger.error(
      "Unexpected error during project validation",
      {
        operation: "ProjectValidation",
        requestId,
        projectId,
        entrepreneurId,
        duration,
      },
      error as Error
    );

    throw new StockMintingError(
      "Unable to validate project at this time",
      ErrorCodes.DATABASE_ERROR,
      503,
      { projectId, entrepreneurId }
    );
  }
}

async function validateWalletForMinting(
  walletAddress: string,
  stockSupply: number,
  requestId: string
): Promise<void> {
  const startTime = Date.now();

  logger.info("Validating wallet for minting", {
    operation: "WalletValidation",
    requestId,
    walletAddress,
    stockSupply,
  });

  try {
    // Calculate gas fee estimates
    const gasFees = await hederaService.calculateGasFees({
      tokenCreation: true,
      nftQuantity: stockSupply,
    });

    // Validate wallet and check balance
    const walletValidation = await hederaService.validateWallet(
      walletAddress,
      parseFloat(gasFees.totalEstimate)
    );

    if (!walletValidation.isValid) {
      throw new StockMintingError(
        "Invalid wallet address",
        ErrorCodes.INVALID_WALLET_ADDRESS,
        400,
        { walletAddress }
      );
    }

    if (!walletValidation.canAffordOperation) {
      throw new StockMintingError(
        "Insufficient wallet balance for minting operation",
        ErrorCodes.INSUFFICIENT_BALANCE,
        402,
        {
          walletAddress,
          currentBalance: walletValidation.balance,
          requiredAmount: gasFees.totalEstimate,
          estimatedGasFee: walletValidation.estimatedGasFee,
        }
      );
    }

    const duration = Date.now() - startTime;
    logger.info("Wallet validation successful", {
      operation: "WalletValidation",
      requestId,
      walletAddress,
      balance: walletValidation.balance,
      estimatedGasFee: gasFees.totalEstimate,
      canAffordOperation: walletValidation.canAffordOperation,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof StockMintingError) {
      throw error;
    }

    logger.error(
      "Unexpected error during wallet validation",
      {
        operation: "WalletValidation",
        requestId,
        walletAddress,
        stockSupply,
        duration,
      },
      error as Error
    );

    throw new StockMintingError(
      "Unable to validate wallet at this time",
      ErrorCodes.HEDERA_SERVICE_ERROR,
      503,
      { walletAddress }
    );
  }
}

async function updateProjectStatus(
  projectId: string,
  status: "draft" | "minting" | "active" | "paused" | "completed",
  requestId: string
): Promise<void> {
  const startTime = Date.now();

  logger.info("Updating project status", {
    operation: "ProjectStatusUpdate",
    requestId,
    projectId,
    newStatus: status,
  });

  try {
    await projectRepository.updateProject({
      projectId,
      status,
    });

    const duration = Date.now() - startTime;
    logger.info("Project status updated successfully", {
      operation: "ProjectStatusUpdate",
      requestId,
      projectId,
      newStatus: status,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      "Failed to update project status",
      {
        operation: "ProjectStatusUpdate",
        requestId,
        projectId,
        newStatus: status,
        duration,
      },
      error as Error
    );

    throw new StockMintingError(
      "Failed to update project status",
      ErrorCodes.DATABASE_ERROR,
      503,
      { projectId, status }
    );
  }
}

async function createProjectToken(
  project: any,
  requestId: string
): Promise<{ tokenId: string; transactionId: string }> {
  const startTime = Date.now();

  logger.info("Creating Hedera token for project", {
    operation: "TokenCreation",
    requestId,
    projectId: project.projectId,
    projectName: project.name,
    stockSupply: project.stockSupply,
  });

  try {
    // Create project metadata for IPFS
    const projectMetadata = {
      name: project.name,
      description: project.description,
      image: project.coverImageUrl || "",
      external_url: `${
        process.env.FRONTEND_URL || "https://sachain.io"
      }/projects/${project.projectId}`,
      attributes: [
        { trait_type: "Category", value: project.category },
        { trait_type: "Stock Supply", value: project.stockSupply },
        { trait_type: "Project ID", value: project.projectId },
        { trait_type: "Entrepreneur ID", value: project.entrepreneurId },
      ],
    };

    // Store project metadata on IPFS
    const ipfsResult = await ipfsService.storeProjectMetadata(projectMetadata);

    // Create token symbol from project name
    const tokenSymbol =
      project.name
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 10)
        .toUpperCase() + "STK";

    // Create Hedera token
    const tokenResult = await hederaService.createToken({
      projectId: project.projectId,
      tokenName: `${project.name} Stock`,
      tokenSymbol,
      totalSupply: project.stockSupply,
      metadata: projectMetadata,
    });

    // Record transaction in database
    await projectRepository.createHederaTransaction({
      projectId: project.projectId,
      transactionId: tokenResult.transactionId,
      transactionType: "token_creation",
      gasUsed: parseFloat(tokenResult.totalCost),
    });

    // Update transaction status to success
    await projectRepository.updateHederaTransaction({
      projectId: project.projectId,
      transactionId: tokenResult.transactionId,
      status: "success",
    });

    const duration = Date.now() - startTime;
    logger.info("Token created successfully", {
      operation: "TokenCreation",
      requestId,
      projectId: project.projectId,
      tokenId: tokenResult.tokenId,
      transactionId: tokenResult.transactionId,
      gasUsed: tokenResult.totalCost,
      ipfsHash: ipfsResult.hash,
      duration,
    });

    return {
      tokenId: tokenResult.tokenId,
      transactionId: tokenResult.transactionId,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      "Failed to create project token",
      {
        operation: "TokenCreation",
        requestId,
        projectId: project.projectId,
        duration,
      },
      error as Error
    );

    throw new StockMintingError(
      "Failed to create project token on Hedera network",
      ErrorCodes.TOKEN_CREATION_FAILED,
      503,
      { projectId: project.projectId, error: (error as Error).message }
    );
  }
}

async function mintStockNFTsInBatches(
  project: any,
  tokenId: string,
  ownerWalletAddress: string,
  requestId: string
): Promise<BatchMintingResult> {
  const startTime = Date.now();
  const totalStocks = project.stockSupply;
  const batches: Array<{
    batchNumber: number;
    stockNumbers: number[];
    serialNumbers: number[];
    transactionId: string;
  }> = [];
  const transactionIds: string[] = [];
  let totalMinted = 0;

  logger.info("Starting batch NFT minting", {
    operation: "BatchNFTMinting",
    requestId,
    projectId: project.projectId,
    tokenId,
    totalStocks,
    batchSize: BATCH_SIZE,
  });

  try {
    // Calculate number of batches needed
    const totalBatches = Math.ceil(totalStocks / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStartTime = Date.now();
      const batchNumber = batchIndex + 1;
      const startStock = batchIndex * BATCH_SIZE + 1;
      const endStock = Math.min(startStock + BATCH_SIZE - 1, totalStocks);
      const batchSize = endStock - startStock + 1;

      logger.info("Processing minting batch", {
        operation: "BatchNFTMinting",
        requestId,
        projectId: project.projectId,
        batchNumber,
        totalBatches,
        startStock,
        endStock,
        batchSize,
      });

      // Create metadata for this batch
      const batchMetadata = [];
      const stockNumbers = [];

      for (
        let stockNumber = startStock;
        stockNumber <= endStock;
        stockNumber++
      ) {
        stockNumbers.push(stockNumber);

        const stockMetadata = {
          name: `${project.name} Stock #${stockNumber}`,
          description: `Stock #${stockNumber} of ${project.name}. ${project.description}`,
          image: project.coverImageUrl || "",
          external_url: `${
            process.env.FRONTEND_URL || "https://sachain.io"
          }/projects/${project.projectId}/stocks/${stockNumber}`,
          attributes: [
            { trait_type: "Project", value: project.name },
            { trait_type: "Stock Number", value: stockNumber },
            { trait_type: "Total Supply", value: project.stockSupply },
            { trait_type: "Category", value: project.category },
            { trait_type: "Project ID", value: project.projectId },
          ],
          project_id: project.projectId,
          stock_number: stockNumber,
        };

        batchMetadata.push(stockMetadata);
      }

      // Store batch metadata on IPFS
      const ipfsPromises = batchMetadata.map((metadata) =>
        ipfsService.storeStockMetadata(metadata)
      );
      const ipfsResults = await Promise.all(ipfsPromises);

      // Mint NFTs for this batch
      const mintResult = await hederaService.mintNFTs({
        tokenId,
        quantity: batchSize,
        metadata: batchMetadata,
      });

      // Record transaction in database
      await projectRepository.createHederaTransaction({
        projectId: project.projectId,
        transactionId: mintResult.transactionId,
        transactionType: "nft_mint",
        gasUsed: parseFloat(mintResult.totalCost),
      });

      // Update transaction status to success
      await projectRepository.updateHederaTransaction({
        projectId: project.projectId,
        transactionId: mintResult.transactionId,
        status: "success",
      });

      // Create stock NFT records in database
      const stockNFTPromises = stockNumbers.map((stockNumber, index) => {
        const stockNFTInput: CreateStockNFTInput = {
          projectId: project.projectId,
          stockNumber,
          tokenId,
          serialNumber: mintResult.serialNumbers[index],
          ownerWalletAddress,
          metadataUri: ipfsResults[index].uri,
        };

        return createStockNFTRecord(stockNFTInput, projectRepository);
      });

      await Promise.all(stockNFTPromises);

      batches.push({
        batchNumber,
        stockNumbers,
        serialNumbers: mintResult.serialNumbers,
        transactionId: mintResult.transactionId,
      });

      transactionIds.push(mintResult.transactionId);
      totalMinted += batchSize;

      const batchDuration = Date.now() - batchStartTime;
      logger.info("Batch minting completed", {
        operation: "BatchNFTMinting",
        requestId,
        projectId: project.projectId,
        batchNumber,
        batchSize,
        serialNumbers: mintResult.serialNumbers,
        transactionId: mintResult.transactionId,
        gasUsed: mintResult.totalCost,
        batchDuration,
        totalMinted,
        progress: Math.round((totalMinted / totalStocks) * 100),
      });

      // Publish progress event
      await publishMintingProgressEvent(
        project.projectId,
        {
          completed: totalMinted,
          total: totalStocks,
          percentage: Math.round((totalMinted / totalStocks) * 100),
          status: totalMinted === totalStocks ? "completed" : "in_progress",
          currentBatch: batchNumber,
          totalBatches,
        },
        requestId
      );
    }

    const duration = Date.now() - startTime;
    logger.info("All batches minted successfully", {
      operation: "BatchNFTMinting",
      requestId,
      projectId: project.projectId,
      tokenId,
      totalMinted,
      totalBatches: batches.length,
      transactionIds,
      duration,
    });

    return {
      totalMinted,
      batches,
      transactionIds,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      "Batch NFT minting failed",
      {
        operation: "BatchNFTMinting",
        requestId,
        projectId: project.projectId,
        tokenId,
        totalMinted,
        completedBatches: batches.length,
        duration,
      },
      error as Error
    );

    // Mark any pending transactions as failed
    for (const transactionId of transactionIds) {
      try {
        await projectRepository.updateHederaTransaction({
          projectId: project.projectId,
          transactionId,
          status: "failed",
          errorMessage: (error as Error).message,
        });
      } catch (updateError) {
        logger.error(
          "Failed to update transaction status",
          {
            operation: "BatchNFTMinting",
            requestId,
            transactionId,
          },
          updateError as Error
        );
      }
    }

    throw new StockMintingError(
      "Failed to mint stock NFTs",
      ErrorCodes.NFT_MINTING_FAILED,
      503,
      {
        projectId: project.projectId,
        tokenId,
        totalMinted,
        completedBatches: batches.length,
        error: (error as Error).message,
      }
    );
  }
}

async function createStockNFTRecord(
  input: CreateStockNFTInput,
  repository: ProjectRepository
): Promise<void> {
  const timestamp = new Date().toISOString();

  const stockNFT: StockNFT = {
    PK: `PROJECT#${input.projectId}`,
    SK: `STOCK#${input.stockNumber}`,
    projectId: input.projectId,
    stockNumber: input.stockNumber,
    tokenId: input.tokenId,
    serialNumber: input.serialNumber,
    ownerWalletAddress: input.ownerWalletAddress,
    mintedAt: timestamp,
    metadataUri: input.metadataUri,
    status: "minted",

    // GSI4 attributes for owner queries
    GSI4PK: `OWNER#${input.ownerWalletAddress}`,
    GSI4SK: timestamp,
  };

  await repository.createStockNFT(stockNFT);
}

async function updateProjectStatistics(
  project: any,
  mintingResult: BatchMintingResult,
  requestId: string
): Promise<void> {
  const startTime = Date.now();

  logger.info("Updating project statistics", {
    operation: "ProjectStatsUpdate",
    requestId,
    projectId: project.projectId,
    totalMinted: mintingResult.totalMinted,
  });

  try {
    const stats: ProjectStats = {
      PK: `PROJECT#${project.projectId}`,
      SK: "STATS",
      projectId: project.projectId,
      totalStocks: project.stockSupply,
      mintedStocks: mintingResult.totalMinted,
      availableStocks: mintingResult.totalMinted, // All minted stocks are initially available
      soldStocks: 0,
      totalRaised: 0,
      lastUpdated: new Date().toISOString(),
    };

    await projectRepository.updateProjectStats(stats);

    const duration = Date.now() - startTime;
    logger.info("Project statistics updated successfully", {
      operation: "ProjectStatsUpdate",
      requestId,
      projectId: project.projectId,
      stats,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      "Failed to update project statistics",
      {
        operation: "ProjectStatsUpdate",
        requestId,
        projectId: project.projectId,
        duration,
      },
      error as Error
    );

    // Don't throw error here as it's not critical for the minting process
    // Just log the error for monitoring
  }
}

async function publishStockMintingEvents(
  project: any,
  mintingResult: BatchMintingResult,
  requestId: string
): Promise<void> {
  const eventPublishStartTime = Date.now();

  try {
    // Publish stock minting completed event
    const eventDetail = {
      eventType: "STOCK_MINTING_COMPLETED",
      projectId: project.projectId,
      entrepreneurId: project.entrepreneurId,
      projectName: project.name,
      tokenId: mintingResult.batches[0]?.transactionId || "", // Use first transaction ID as reference
      totalMinted: mintingResult.totalMinted,
      totalBatches: mintingResult.batches.length,
      transactionIds: mintingResult.transactionIds,
      completedAt: new Date().toISOString(),
    };

    await eventPublisher.publishEvent(
      "sachain.stock-minting",
      eventDetail,
      "Stock Minting Completed"
    );

    const eventPublishDuration = Date.now() - eventPublishStartTime;

    logger.info("Stock minting events published successfully", {
      operation: "StockMinting",
      requestId,
      projectId: project.projectId,
      eventDetail,
      eventPublishDuration,
    });
  } catch (eventError) {
    const eventPublishDuration = Date.now() - eventPublishStartTime;
    const errorDetails = ErrorClassifier.classify(eventError as Error);

    // Log the error but don't fail the minting operation
    logger.error(
      "Failed to publish stock minting events",
      {
        operation: "StockMinting",
        requestId,
        projectId: project.projectId,
        eventPublishDuration,
        errorCategory: errorDetails.category,
      },
      eventError as Error
    );
  }
}

async function publishMintingProgressEvent(
  projectId: string,
  progress: MintingProgress,
  requestId: string
): Promise<void> {
  try {
    const eventDetail = {
      eventType: "STOCK_MINTING_PROGRESS",
      projectId,
      progress,
      timestamp: new Date().toISOString(),
    };

    await eventPublisher.publishEvent(
      "sachain.stock-minting",
      eventDetail,
      "Stock Minting Progress"
    );

    logger.info("Minting progress event published", {
      operation: "StockMinting",
      requestId,
      projectId,
      progress,
    });
  } catch (eventError) {
    // Log the error but don't fail the minting operation
    logger.error(
      "Failed to publish minting progress event",
      {
        operation: "StockMinting",
        requestId,
        projectId,
        progress,
      },
      eventError as Error
    );
  }
}

async function rollbackProjectStatus(
  projectId: string,
  requestId: string
): Promise<void> {
  logger.info("Rolling back project status", {
    operation: "ProjectStatusRollback",
    requestId,
    projectId,
  });

  try {
    await projectRepository.updateProject({
      projectId,
      status: "draft",
    });

    logger.info("Project status rolled back successfully", {
      operation: "ProjectStatusRollback",
      requestId,
      projectId,
    });
  } catch (error) {
    logger.error(
      "Failed to rollback project status",
      {
        operation: "ProjectStatusRollback",
        requestId,
        projectId,
      },
      error as Error
    );
  }
}
