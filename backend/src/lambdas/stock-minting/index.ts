import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";

import { createProjectLogger } from "../../utils/structured-logger";
import { ErrorClassifier } from "../../utils/error-handler";
import { ProjectErrorClassifier } from "../../utils/enhanced-error-handler";
import { ErrorResponseFormatter } from "../../utils/error-response-formatter";
import {
  ProjectRecoveryManager,
  ProjectRollbackOperations,
} from "../../utils/error-recovery";
import {
  // ProjectEventPublisher,
  createProjectEventPublisher,
} from "../../utils/project-event-publisher";
import { extractUserIdFromToken } from "../../utils/jwt-utils";
// import { projectMetrics } from "../../utils/project-metrics"; // Temporarily commented out
import { ProjectRepository } from "../../repositories/project-repository";
import { createHederaService, HederaService } from "../../utils/hedera-service";
// import { defaultIPFSService } from "../../utils/ipfs-service"; // Temporarily disabled
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

// Use safe environment variable access to avoid undefined errors
const TABLE_NAME = process.env.TABLE_NAME || "";
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || "default";
const ENVIRONMENT = process.env.ENVIRONMENT || "dev";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

// Batch size for NFT minting (Hedera limit is 100 per transaction)
const BATCH_SIZE = 50;

// Initialize services lazily to avoid cold start issues during module loading
let logger: any = null;
let projectEventPublisher: any = null;
let projectRepository: any = null;
let hederaService: HederaService | null = null;
// let ipfsService: any = null; // Temporarily disabled

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

// Lazy initialization function to avoid module-level initialization issues
function initializeServices() {
  if (!logger) {
    logger = createProjectLogger();
  }
  if (!projectEventPublisher) {
    projectEventPublisher = createProjectEventPublisher({
      eventBusName: EVENT_BUS_NAME,
      region: AWS_REGION,
    });
  }
  if (!projectRepository) {
    projectRepository = new ProjectRepository({
      tableName: TABLE_NAME,
      region: AWS_REGION,
    });
  }
  // if (!ipfsService) {
  //   ipfsService = defaultIPFSService;
  // }
}

async function getHederaService(): Promise<HederaService> {
  if (!hederaService) {
    // Ensure services are initialized
    initializeServices();

    // Use environment variables for Hedera credentials
    const hederaConfig = {
      operatorId:
        process.env.HEDERA_OPERATOR_ID ||
        process.env.OPERATION_ID ||
        "0.0.123456",
      operatorKey:
        process.env.HEDERA_OPERATOR_KEY ||
        process.env.OPERATION_KEY ||
        "302e020100300506032b657004220420000000000000000000000000000000000000000000000000000000000000000000",
      network: (process.env.HEDERA_NETWORK ||
        process.env.NETWORK ||
        "testnet") as "testnet" | "mainnet" | "previewnet",
      maxTransactionFee: parseInt(
        process.env.HEDERA_MAX_TRANSACTION_FEE || "100"
      ),
      maxQueryPayment: parseInt(process.env.HEDERA_MAX_QUERY_PAYMENT || "1"),
    };

    logger.info("Initializing Hedera service with environment variables", {
      operation: "HederaServiceInitialization",
      operatorId: hederaConfig.operatorId,
      network: hederaConfig.network,
      maxTransactionFee: hederaConfig.maxTransactionFee,
      maxQueryPayment: hederaConfig.maxQueryPayment,
    });

    hederaService = createHederaService(hederaConfig);
  }
  return hederaService;
}

export const handler: APIGatewayProxyHandler = async (event) => {
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

  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
  };
  try {
    const startTime = Date.now();
    const requestId = event.requestContext.requestId;

    // Initialize services on first invocation
    initializeServices();

    logger.info("Stock Minting Lambda triggered", {
      operation: "LambdaInvocation",
      requestId,
      path: event.path,
      httpMethod: event.httpMethod,
      userAgent: event.headers["User-Agent"],
    });

    try {
      const result = await handleStockMintingWithRecovery(event);

      const duration = Date.now() - startTime;

      // Record API metrics
      // await projectMetrics.recordAPILatency(
      //   event.path || "/projects/{id}/mint-stocks",
      //   event.httpMethod || "POST",
      //   duration,
      //   result.statusCode
      // );

      logger.info("Stock Minting Lambda completed successfully", {
        operation: "LambdaInvocation",
        requestId,
        duration,
        statusCode: result.statusCode,
      });

      return {
        ...result,
        headers: {
          ...result.Headers,
          ...corsHeaders,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const projectError = ProjectErrorClassifier.classify(error as Error, {
        operation: "LambdaInvocation",
        requestId,
        timestamp: new Date().toISOString(),
        environment: ENVIRONMENT,
        service: "ProjectService",
      });

      // Record API error metrics
      // await projectMetrics.recordAPILatency(
      //   event.path || "/projects/{id}/mint-stocks",
      //   event.httpMethod || "POST",
      //   duration,
      //   projectError.httpStatusCode || 500
      // );

      logger.error(
        "Stock Minting Lambda failed",
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
  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Internal server error",
        message: (error as Error).message,
      }),
    };
  }
};

async function handleStockMintingWithRecovery(
  event: APIGatewayProxyEvent
): Promise<any> {
  const requestId = event.requestContext.requestId;
  const projectId = event.pathParameters?.projectId;

  // Initialize recovery context
  const recoveryContext = ProjectRecoveryManager.initializeRecovery(
    requestId,
    "StockMinting",
    projectId
  );

  try {
    const result = await handleStockMinting(event);

    // Clean up recovery context on success
    ProjectRecoveryManager.cleanupRecovery(requestId);

    return result;
  } catch (error) {
    const projectError = ProjectErrorClassifier.classify(error as Error, {
      operation: "StockMinting",
      requestId,
      projectId,
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

    // Publish stock minting started event
    await publishStockMintingStartedEvent(
      project,
      request.walletAddress,
      requestId
    );

    // Update project status to minting
    await updateProjectStatus(projectId, "minting", requestId);

    // Add rollback operation to restore project status if minting fails
    const rollbackOperations = new ProjectRollbackOperations(projectRepository);
    ProjectRecoveryManager.addRollbackOperation(
      requestId,
      rollbackOperations.createProjectStatusRollback(
        projectId,
        project.status,
        requestId
      )
    );

    // Create Hedera token for the project
    const tokenCreationResult = await createProjectToken(
      project,
      requestId,
      request.walletAddress,
      request.privateKey
    );

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

    // Record stock minting success metrics
    const totalGasCost =
      mintingResult.transactionIds.length > 0
        ? parseFloat(tokenCreationResult.transactionId) || 0
        : 0; // Simplified for demo

    // await projectMetrics.recordStockMinting(
    //   true,
    //   duration,
    //   mintingResult.totalMinted,
    //   mintingResult.batches.length,
    //   undefined,
    //   totalGasCost
    // );

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

    return ErrorResponseFormatter.formatSuccessResponse(
      response,
      200,
      "Stock minting completed successfully"
    );
  } catch (error) {
    const duration = Date.now() - startTime;

    // Record stock minting failure metrics
    if (error instanceof StockMintingError) {
      // await projectMetrics.recordStockMinting(
      //   false,
      //   duration,
      //   0,
      //   undefined,
      //   error.code
      // );

      // await projectMetrics.recordProjectError(
      //   "minting",
      //   error.code,
      //   "validation",
      //   event.pathParameters?.projectId
      // );

      logger.warn("Stock minting business logic error", {
        operation: "StockMinting",
        requestId,
        errorCode: error.code,
        duration,
      });

      const projectError = ProjectErrorClassifier.classify(error, {
        operation: "StockMinting",
        requestId,
        projectId: event.pathParameters?.projectId,
      });

      throw projectError;
    } else {
      // await projectMetrics.recordProjectError(
      //   "minting",
      //   "UNEXPECTED_ERROR",
      //   "system",
      //   event.pathParameters?.projectId
      // );
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
    // Get Hedera service instance
    const hederaServiceInstance = await getHederaService();

    // Calculate gas fee estimates
    const gasFees = await hederaServiceInstance.calculateGasFees({
      tokenCreation: true,
      nftQuantity: stockSupply,
    });

    // Validate wallet and check balance
    const walletValidation = await hederaServiceInstance.validateWallet(
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
  requestId: string,
  entrepreneurWalletAddress?: string,
  entrepreneurPrivateKey?: string
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
    // For Hedera token creation, we'll skip metadata to avoid size limits
    // Metadata will be stored on IPFS and referenced in individual NFTs
    const projectMetadata = {};

    // TODO: Store project metadata on IPFS (temporarily disabled)
    // const ipfsResult = await ipfsService.storeProjectMetadata(projectMetadata);
    const ipfsResult = {
      hash: "placeholder-hash",
      uri: "https://placeholder-ipfs.io/placeholder-hash",
    };

    logger.info("Using placeholder IPFS metadata for token creation", {
      operation: "TokenCreation",
      requestId,
      projectId: project.projectId,
      placeholderUri: ipfsResult.uri,
    });

    // Create token symbol from project name
    const tokenSymbol =
      project.name
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 10)
        .toUpperCase() + "STK";

    // Create Hedera token
    const tokenStartTime = Date.now();
    const hederaServiceInstance = await getHederaService();
    const tokenResult = await hederaServiceInstance.createToken({
      projectId: project.projectId,
      tokenName: `${project.name} Stock`,
      tokenSymbol,
      totalSupply: project.stockSupply,
      // Skip metadata to avoid METADATA_TOO_LONG error
    });

    const associateTx = await hederaServiceInstance.associateToken(
      entrepreneurWalletAddress!,
      entrepreneurPrivateKey!,
      tokenResult.tokenId
    );
    logger.info("Associated token with entrepreneur wallet", {
      operation: "TokenCreation",
      requestId,
      projectId: project.projectId,
      tokenId: tokenResult.tokenId,
      status: associateTx,
    });
    const tokenDuration = Date.now() - tokenStartTime;

    // Record Hedera token creation metrics
    // await projectMetrics.recordHederaTokenCreation(
    //   true,
    //   tokenDuration,
    //   parseFloat(tokenResult.totalCost)
    // );

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

      // TODO: Store batch metadata on IPFS (temporarily disabled)
      const ipfsStartTime = Date.now();
      // const ipfsPromises = batchMetadata.map((metadata) =>
      //   ipfsService.storeStockMetadata(metadata)
      // );
      // const ipfsResults = await Promise.all(ipfsPromises);

      // Create placeholder IPFS results
      const ipfsResults = batchMetadata.map((metadata, index) => ({
        hash: `placeholder-hash-${batchNumber}-${index}`,
        uri: `https://placeholder-ipfs.io/placeholder-hash-${batchNumber}-${index}`,
      }));

      logger.info("Using placeholder IPFS metadata for batch", {
        operation: "BatchNFTMinting",
        requestId,
        projectId: project.projectId,
        batchNumber,
        batchSize,
        placeholderCount: ipfsResults.length,
      });

      const ipfsDuration = Date.now() - ipfsStartTime;

      // Record IPFS upload metrics
      // await projectMetrics.recordIPFSUpload(
      //   true,
      //   ipfsDuration,
      //   "stock",
      //   JSON.stringify(batchMetadata).length
      // );

      // Mint NFTs for this batch
      const nftMintStartTime = Date.now();
      const hederaServiceInstance = await getHederaService();

      // Create minimal metadata for Hedera (max 100 bytes per NFT)
      const minimalMetadata = batchMetadata.map((metadata, index) => ({
        project: project.projectId.substring(0, 8), // First 8 chars of project ID
        stock: metadata.stock_number,
        uri: ipfsResults[index].uri.substring(0, 40), // Truncated URI
      }));

      const mintResult = await hederaServiceInstance.mintNFTs({
        tokenId,
        quantity: batchSize,
        metadata: minimalMetadata,
      });
      const nftMintDuration = Date.now() - nftMintStartTime;

      // Record Hedera NFT minting metrics
      // await projectMetrics.recordHederaNFTMinting(
      //   true,
      //   nftMintDuration,
      //   batchSize,
      //   parseFloat(mintResult.totalCost)
      // );

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

      // Transfer each NFT serial to the owner’s wallet
      for (const serialNumber of mintResult.serialNumbers) {
        const transferTx = await hederaServiceInstance.transferToken(
          tokenId,
          serialNumber,
          process.env.HEDERA_OPERATOR_ID!, // or treasury/issuer account
          process.env.HEDERA_OPERATOR_KEY!, // or treasury’s key
          ownerWalletAddress // user’s wallet
        );

        logger.info("Transferred NFT serial", {
          projectId: project.projectId,
          tokenId,
          serialNumber,
          to: ownerWalletAddress,
          status: transferTx,
        });
      }

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
        project.entrepreneurId,
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

    // Publish stock minting failed event
    await publishStockMintingFailedEvent(
      project,
      (error as Error).message,
      totalMinted > 0
        ? {
            completed: totalMinted,
            total: project.stockSupply,
            transactionIds,
          }
        : undefined,
      requestId
    );

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

async function publishStockMintingStartedEvent(
  project: any,
  walletAddress: string,
  requestId: string
): Promise<void> {
  try {
    await projectEventPublisher.publishStockMintingStartedEvent({
      projectId: project.projectId,
      entrepreneurId: project.entrepreneurId,
      stockSupply: project.stockSupply,
      walletAddress,
      startedAt: new Date().toISOString(),
    });

    logger.info("Stock minting started event published successfully", {
      operation: "StockMinting",
      requestId,
      projectId: project.projectId,
    });
  } catch (eventError) {
    logger.error(
      "Failed to publish stock minting started event",
      {
        operation: "StockMinting",
        requestId,
        projectId: project.projectId,
      },
      eventError as Error
    );
  }
}

async function publishStockMintingEvents(
  project: any,
  mintingResult: BatchMintingResult,
  requestId: string
): Promise<void> {
  const eventPublishStartTime = Date.now();

  try {
    // Get the actual token ID from the first batch
    const tokenId = mintingResult.batches[0]?.transactionId || "";

    await projectEventPublisher.publishStockMintingCompletedEvent({
      projectId: project.projectId,
      entrepreneurId: project.entrepreneurId,
      tokenId,
      totalMinted: mintingResult.totalMinted,
      totalBatches: mintingResult.batches.length,
      transactionIds: mintingResult.transactionIds,
      completedAt: new Date().toISOString(),
    });

    const eventPublishDuration = Date.now() - eventPublishStartTime;

    logger.info("Stock minting events published successfully", {
      operation: "StockMinting",
      requestId,
      projectId: project.projectId,
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
  entrepreneurId: string,
  progress: MintingProgress,
  requestId: string
): Promise<void> {
  try {
    await projectEventPublisher.publishStockMintingProgressEvent({
      projectId,
      entrepreneurId,
      progress: {
        completed: progress.completed,
        total: progress.total,
        percentage: progress.percentage,
        status: progress.status === "completed" ? "completed" : "in_progress",
        currentBatch: progress.currentBatch,
        totalBatches: progress.totalBatches,
      },
    });

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

async function publishStockMintingFailedEvent(
  project: any,
  error: string,
  partialMinting:
    | {
        completed: number;
        total: number;
        transactionIds: string[];
      }
    | undefined,
  requestId: string
): Promise<void> {
  try {
    await projectEventPublisher.publishStockMintingFailedEvent({
      projectId: project.projectId,
      entrepreneurId: project.entrepreneurId,
      error,
      partialMinting,
      failedAt: new Date().toISOString(),
    });

    logger.info("Stock minting failed event published successfully", {
      operation: "StockMinting",
      requestId,
      projectId: project.projectId,
      error,
      partialMinting,
    });
  } catch (eventError) {
    logger.error(
      "Failed to publish stock minting failed event",
      {
        operation: "StockMinting",
        requestId,
        projectId: project.projectId,
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
