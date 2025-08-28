import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { createProjectLogger } from "../../utils/structured-logger";
import { ErrorClassifier } from "../../utils/error-handler";
import { extractUserIdFromToken } from "../../utils/jwt-utils";
import { StockRepository } from "../../repositories/stock-repository";
import { ProjectRepository } from "../../repositories/project-repository";
import { UserRepository } from "../../repositories/user-repository";
import {
  StockQueryEvent,
  GetStocksRequest,
  GetStocksResponse,
  GetStockResponse,
  StockQueryError,
  ErrorCodes,
  StockWithMetadata,
  StockPortfolio,
  QueryValidationResult,
} from "./types";
import { StockNFT } from "../../models/project";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const ENVIRONMENT = process.env.ENVIRONMENT!;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

// Initialize services
const logger = createProjectLogger();

const stockRepository = new StockRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

const projectRepository = new ProjectRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

const userRepository = new UserRepository({
  tableName: TABLE_NAME,
  region: AWS_REGION,
});

export const handler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("Stock Query Lambda triggered", {
    operation: "LambdaInvocation",
    requestId,
    path: event.path,
    httpMethod: event.httpMethod,
    queryStringParameters: event.queryStringParameters,
  });

  try {
    const result = await handleStockQuery(event as StockQueryEvent);

    const duration = Date.now() - startTime;
    logger.info("Stock Query Lambda completed successfully", {
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
      "Stock Query Lambda failed",
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

async function handleStockQuery(event: StockQueryEvent): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;
  const path = event.path;

  logger.info("Stock query started", {
    operation: "StockQuery",
    requestId,
    path,
  });

  try {
    // Extract and validate authentication
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      const duration = Date.now() - startTime;

      logger.warn("Authentication failed", {
        operation: "StockQuery",
        requestId,
        error: tokenResult.error,
        duration,
      });

      throw new StockQueryError(
        "Authentication failed",
        ErrorCodes.AUTHENTICATION_FAILED,
        401,
        { error: tokenResult.error }
      );
    }

    const userId = tokenResult.userId!;

    // Route based on path
    if (path.includes("/stocks/") && event.pathParameters?.stockId) {
      // Single stock query: GET /projects/{projectId}/stocks/{stockNumber}
      const projectId = event.pathParameters.projectId!;
      const stockNumber = parseInt(event.pathParameters.stockId, 10);
      return await handleGetStock(projectId, stockNumber, userId, requestId);
    } else if (path.includes("/portfolio")) {
      // Portfolio query: GET /stocks/portfolio
      return await handleGetPortfolio(event, userId, requestId);
    } else {
      // Multiple stocks query: GET /projects/{projectId}/stocks or GET /stocks
      return await handleGetStocks(event, userId, requestId);
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof StockQueryError) {
      logger.warn("Stock query business logic error", {
        operation: "StockQuery",
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

async function handleGetStock(
  projectId: string,
  stockNumber: number,
  userId: string,
  requestId: string
): Promise<any> {
  const startTime = Date.now();

  logger.info("Getting single stock", {
    operation: "GetStock",
    requestId,
    projectId,
    stockNumber,
    userId,
  });

  try {
    // Get stock from repository
    const stock = await stockRepository.getStockNFT(projectId, stockNumber);

    if (!stock) {
      const duration = Date.now() - startTime;
      logger.warn("Stock not found", {
        operation: "GetStock",
        requestId,
        projectId,
        stockNumber,
        duration,
      });

      throw new StockQueryError(
        "Stock not found",
        ErrorCodes.STOCK_NOT_FOUND,
        404,
        { projectId, stockNumber }
      );
    }

    // Check access permissions
    const userProfile = await userRepository.getUserProfile(userId);
    const canAccess = await checkStockAccess(stock, userId, userProfile?.userType);

    if (!canAccess) {
      const duration = Date.now() - startTime;
      logger.warn("Unauthorized stock access", {
        operation: "GetStock",
        requestId,
        projectId,
        stockNumber,
        userId,
        userType: userProfile?.userType,
        duration,
      });

      throw new StockQueryError(
        "Unauthorized access to stock",
        ErrorCodes.UNAUTHORIZED_ACCESS,
        403,
        { projectId, stockNumber, userId }
      );
    }

    // Enrich stock with metadata
    const stockWithMetadata = await enrichStockWithMetadata(stock, requestId);

    const duration = Date.now() - startTime;
    logger.info("Stock retrieved successfully", {
      operation: "GetStock",
      requestId,
      projectId,
      stockNumber,
      duration,
    });

    const response: GetStockResponse = {
      stock: stockWithMetadata,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof StockQueryError) {
      throw error;
    }

    logger.error(
      "Unexpected error during stock retrieval",
      {
        operation: "GetStock",
        requestId,
        projectId,
        stockNumber,
        duration,
      },
      error as Error
    );

    throw new StockQueryError(
      "Unable to retrieve stock at this time",
      ErrorCodes.DATABASE_ERROR,
      503,
      { projectId, stockNumber }
    );
  }
}

async function handleGetStocks(
  event: StockQueryEvent,
  userId: string,
  requestId: string
): Promise<any> {
  const startTime = Date.now();

  logger.info("Getting stocks list", {
    operation: "GetStocks",
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
        operation: "GetStocks",
        requestId,
        errors: validation.errors,
        duration,
      });

      throw new StockQueryError(
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
      userProfile?.userType,
      event.pathParameters?.projectId
    );

    // Execute query
    const result = await stockRepository.getStocks(filteredParams);

    // Enrich stocks with metadata if requested
    const enrichedStocks = await enrichStocksWithMetadata(
      result.items,
      queryParams.includeMetadata || false,
      requestId
    );

    const duration = Date.now() - startTime;
    logger.info("Stocks retrieved successfully", {
      operation: "GetStocks",
      requestId,
      stocksCount: result.count,
      duration,
    });

    const response: GetStocksResponse = {
      stocks: enrichedStocks,
      pagination: {
        limit: queryParams.limit || 20,
        count: result.count,
        lastEvaluatedKey: result.lastEvaluatedKey,
        hasMore: !!result.lastEvaluatedKey,
      },
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof StockQueryError) {
      throw error;
    }

    logger.error(
      "Unexpected error during stocks retrieval",
      {
        operation: "GetStocks",
        requestId,
        duration,
      },
      error as Error
    );

    throw new StockQueryError(
      "Unable to retrieve stocks at this time",
      ErrorCodes.DATABASE_ERROR,
      503,
      { userId }
    );
  }
}

async function handleGetPortfolio(
  event: StockQueryEvent,
  userId: string,
  requestId: string
): Promise<any> {
  const startTime = Date.now();

  logger.info("Getting user portfolio", {
    operation: "GetPortfolio",
    requestId,
    userId,
  });

  try {
    // Get user profile
    const userProfile = await userRepository.getUserProfile(userId);
    
    // Only investors and entrepreneurs can view portfolios
    if (!userProfile || !["investor", "entrepreneur"].includes(userProfile.userType)) {
      throw new StockQueryError(
        "Unauthorized access to portfolio",
        ErrorCodes.UNAUTHORIZED_ACCESS,
        403,
        { userId }
      );
    }

    // Get wallet address from query params or user profile
    const walletAddress = event.queryStringParameters?.walletAddress;
    
    if (!walletAddress) {
      throw new StockQueryError(
        "Wallet address is required for portfolio query",
        ErrorCodes.INVALID_QUERY_PARAMETERS,
        400,
        { userId }
      );
    }

    // Get portfolio data
    const portfolio = await stockRepository.getOwnerPortfolio(walletAddress);
    const stocks = await stockRepository.getStocksByOwner(walletAddress);

    const duration = Date.now() - startTime;
    logger.info("Portfolio retrieved successfully", {
      operation: "GetPortfolio",
      requestId,
      userId,
      walletAddress,
      totalStocks: portfolio.totalStocks,
      duration,
    });

    const response: { portfolio: StockPortfolio } = {
      portfolio: {
        walletAddress,
        totalStocks: portfolio.totalStocks,
        stocksByProject: portfolio.stocksByProject,
        stocksByStatus: portfolio.stocksByStatus,
        stocks: stocks.items,
      },
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "private, max-age=60",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof StockQueryError) {
      throw error;
    }

    logger.error(
      "Unexpected error during portfolio retrieval",
      {
        operation: "GetPortfolio",
        requestId,
        userId,
        duration,
      },
      error as Error
    );

    throw new StockQueryError(
      "Unable to retrieve portfolio at this time",
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
  const sanitized: GetStocksRequest = {};

  // Validate status
  if (params.status) {
    const validStatuses = ["minted", "listed", "sold", "transferred"];
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

  // Parse includeMetadata
  if (params.includeMetadata) {
    sanitized.includeMetadata = params.includeMetadata.toLowerCase() === "true";
  }

  // Copy other valid parameters
  if (params.projectId) {
    sanitized.projectId = params.projectId;
  }
  if (params.ownerWalletAddress) {
    sanitized.ownerWalletAddress = params.ownerWalletAddress;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedParams: errors.length === 0 ? sanitized : undefined,
  };
}

async function applyAccessControlFilters(
  params: GetStocksRequest,
  userId: string,
  userType?: string,
  projectId?: string
): Promise<GetStocksRequest> {
  const filteredParams = { ...params };

  // If projectId is in path, use it
  if (projectId) {
    filteredParams.projectId = projectId;
    
    // Check if user can access this project's stocks
    const project = await projectRepository.getProject(projectId);
    if (!project) {
      throw new StockQueryError(
        "Project not found",
        ErrorCodes.PROJECT_NOT_FOUND,
        404,
        { projectId }
      );
    }

    // Entrepreneurs can see their own project stocks, investors can see active project stocks
    if (userType === "entrepreneur" && project.entrepreneurId !== userId) {
      if (project.status !== "active") {
        throw new StockQueryError(
          "Unauthorized access to project stocks",
          ErrorCodes.UNAUTHORIZED_ACCESS,
          403,
          { projectId, userId }
        );
      }
    } else if (userType === "investor" && project.status !== "active") {
      throw new StockQueryError(
        "Can only view stocks of active projects",
        ErrorCodes.UNAUTHORIZED_ACCESS,
        403,
        { projectId }
      );
    }
  }

  return filteredParams;
}

async function checkStockAccess(
  stock: StockNFT,
  userId: string,
  userType?: string
): Promise<boolean> {
  // Get the project to check access
  const project = await projectRepository.getProject(stock.projectId);
  if (!project) {
    return false;
  }

  // Stock owner can always access
  // Note: In a real implementation, you'd need to map userId to wallet address
  
  // Entrepreneurs can access stocks of their own projects
  if (userType === "entrepreneur" && project.entrepreneurId === userId) {
    return true;
  }

  // Investors can access stocks of active projects
  if (project.status === "active") {
    return true;
  }

  return false;
}

async function enrichStockWithMetadata(
  stock: StockNFT,
  requestId: string
): Promise<StockWithMetadata> {
  try {
    // Get project information
    const project = await projectRepository.getProject(stock.projectId);

    return {
      ...stock,
      project: project ? {
        name: project.name,
        category: project.category,
        status: project.status,
      } : undefined,
    };
  } catch (error) {
    logger.warn(
      "Failed to enrich stock with metadata",
      {
        operation: "EnrichStock",
        requestId,
        stockId: `${stock.projectId}#${stock.stockNumber}`,
      },
      error as Error
    );

    return stock;
  }
}

async function enrichStocksWithMetadata(
  stocks: StockNFT[],
  includeMetadata: boolean,
  requestId: string
): Promise<StockWithMetadata[]> {
  if (!includeMetadata || stocks.length === 0) {
    return stocks;
  }

  try {
    // Get unique project IDs
    const projectIds = [...new Set(stocks.map(stock => stock.projectId))];
    
    // Batch get projects
    const projects = await projectRepository.batchGetProjects(projectIds);
    const projectMap = new Map(projects.map(p => [p.projectId, p]));

    // Enrich stocks with project metadata
    return stocks.map(stock => {
      const project = projectMap.get(stock.projectId);
      return {
        ...stock,
        project: project ? {
          name: project.name,
          category: project.category,
          status: project.status,
        } : undefined,
      };
    });
  } catch (error) {
    logger.warn(
      "Failed to enrich stocks with metadata",
      {
        operation: "EnrichStocks",
        requestId,
        stocksCount: stocks.length,
      },
      error as Error
    );

    return stocks;
  }
}