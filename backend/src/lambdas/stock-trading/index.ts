import {
  APIGatewayProxyHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { SESv2Client } from "@aws-sdk/client-sesv2";
import { StockTradingRepository } from "../../repositories/stock-trading-repository";
import { StockRepository } from "../../repositories/stock-repository";
import { extractUserIdFromToken } from "../../utils/jwt-utils";
import { BuySharesRequest } from "../../models";
import { ProjectRepository } from "../../repositories";
import { NotificationService } from "../../utils/notification-service";
import { createHederaService } from "../../utils/hedera-service";
import { UserRepository } from "../../repositories/user-repository";

interface ListStockRequest {
  projectId: string;
  stockNumber: number;
  pricePerStock: number;
  quantity: number;
}

const getAllowedOrigin = (event: APIGatewayProxyEvent): string => {
  const origin = event.headers.origin ?? event.headers.Origin ?? "";
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3001",
    "https://frontend-sachain-5bda0gd76-joanchacha01gmailcoms-projects.vercel.app",
  ];
  return allowedOrigins.includes(origin) ? origin : "http://localhost:5173";
};
// const sesClient = new SESv2Client({ region: "us-east-1" });

export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  const allowedOrigin = getAllowedOrigin(event);

  // Handle CORS preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
  };

  try {
    // Extract user from token
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Authentication failed" }),
      };
    }

    const userId = tokenResult.userId!;
    const method = event.httpMethod;
    const path = event.path;

    // Initialize repositories
    const stockTradingRepo = new StockTradingRepository({
      tableName: process.env.TABLE_NAME!,
    });

    const stockRepo = new StockRepository({
      tableName: process.env.TABLE_NAME!,
    });

    // Route handling
    if (method === "POST" && path.includes("/buy")) {
      // Extract projectId from path: /projects/{projectId}/buy
      const pathParts = path.split("/");
      const projectIdIndex = pathParts.indexOf("projects") + 1;
      const projectId = pathParts[projectIdIndex];
      // Add projectId to path parameters
      event.pathParameters = { ...event.pathParameters, projectId };
      return await handleBuyStock(
        event,
        stockTradingRepo,
        stockRepo,
        corsHeaders
      );
    }

    if (method === "POST" && path.includes("/list")) {
      return await handleListStock(
        event,
        userId,
        stockTradingRepo,
        stockRepo,
        corsHeaders
      );
    }

    if (method === "GET" && path.includes("/marketplace")) {
      return await handleGetMarketplace(event, stockTradingRepo, corsHeaders);
    }

    if (method === "GET" && path.includes("/portfolio")) {
      return await handleGetPortfolio(event, userId, stockRepo, corsHeaders);
    }

    if (method === "GET" && path.includes("/transactions")) {
      return await handleGetTransactions(
        event,
        userId,
        stockTradingRepo,
        corsHeaders
      );
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Endpoint not found" }),
    };
  } catch (error) {
    console.error("Stock trading error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

async function handleBuyStock(
  event: APIGatewayProxyEvent,
  stockTradingRepo: StockTradingRepository,
  stockRepo: StockRepository,
  corsHeaders: Record<string, string>
): Promise<APIGatewayProxyResult> {
  try {
    // Extract user from token
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Authentication failed" }),
      };
    }

    const investorId = tokenResult.userId!;
    const projectId = event.pathParameters?.projectId;

    if (!projectId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Project ID is required" }),
      };
    }
    // Decode base64 body if needed
    let requestBody = event.body || "{}";
    if (event.isBase64Encoded) {
      requestBody = Buffer.from(requestBody, "base64").toString("utf-8");
    }

    const request: BuySharesRequest = JSON.parse(requestBody);

    // Validate request
    if (
      !request.sharesRequested ||
      !request.investorPrivateKey ||
      request.sharesRequested <= 0
    ) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error:
            "Invalid request. sharesRequested and investorPrivateKey are required",
        }),
      };
    }

    // Get project details
    const projectRepo = new ProjectRepository({
      tableName: process.env.TABLE_NAME!,
    });
    const project = await projectRepo.getProject(projectId);

    if (!project) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Project not found" }),
      };
    }

    // Check if project has minted NFT tokens
    if (project.status !== "active") {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Project is not active or tokens not yet minted",
        }),
      };
    }

    // Get shares held by startup
    const sharesHeldByStartup = await projectRepo.getProjectSharesHeldByStartup(
      projectId
    );

    // Check if requested shares exceed available shares
    if (request.sharesRequested > sharesHeldByStartup) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Insufficient shares available",
          sharesRequested: request.sharesRequested,
          sharesAvailable: sharesHeldByStartup,
        }),
      };
    }

    // Create scheduled transaction
    const scheduledTx = await stockTradingRepo.createScheduledTransaction({
      projectId,
      investorId,
      entrepreneurId: project.entrepreneurId,
      sharesRequested: request.sharesRequested,
      sharesAvailable: sharesHeldByStartup,
      pricePerShare: project.pricePerStock || 0,
      investorPrivateKey: request.investorPrivateKey, // Should encrypt this
    });

    const hederaService = createHederaService();
    // Get investor and entrepreneur wallet addresses
    const investorWalletAddress = request.investorWalletAddress;
    // Get entrepreneur wallet address from profile
    const userRepo = new UserRepository({ tableName: process.env.TABLE_NAME! });
    const entrepreneurProfile = await userRepo.getUserProfile(
      project.entrepreneurId
    );
    const investorProfile = await userRepo.getUserProfile(investorId);

    if (!entrepreneurProfile?.walletAddress) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Entrepreneur wallet address not found",
        }),
      };
    }

    const entrepreneurWalletAddress = entrepreneurProfile.walletAddress;

    // Get available NFT serial numbers owned by entrepreneur
    if (request.sharesRequested > project.stockSupply) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Insufficient NFT tokens available",
          available: project.stockSupply,
          requested: request.sharesRequested,
        }),
      };
    }

    // Generate serial numbers for the requested shares
    const availableSerials = Array.from(
      { length: request.sharesRequested },
      (_, i) => i + 1
    );

    // Get tokenId from any StockNFT for this project
    const projectStocks = await stockRepo.getProjectStocks(projectId);
    if (projectStocks.items.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "No NFT tokens found for this project" }),
      };
    }

    const tokenId = projectStocks.items[0].tokenId;

    // Associate investor with token before swap
    try {
      await hederaService.associateToken(
        investorWalletAddress,
        request.investorPrivateKey,
        tokenId
      );
    } catch (error) {
      // Token might already be associated, continue
      console.log("Token association warning:", error);
    }

    // Create enhanced scheduled transaction with HBAR and NFT transfers
    const scheduledHederaTx = await hederaService.createScheduledAtomicSwap({
      investorAccountId: investorWalletAddress,
      entrepreneurAccountId: entrepreneurWalletAddress,
      hbarAmount: scheduledTx.totalAmount,
      tokenId: tokenId,
      nftSerials: availableSerials,
      memo: `Share purchase for project ${project.name}`,
      requiredSignatures: [investorWalletAddress, entrepreneurWalletAddress],
    });

    await stockTradingRepo.updateScheduledTransaction(
      scheduledTx.transactionId,
      {
        hederaScheduledTxId: scheduledHederaTx.transactionId,
      }
    );

    // Automatically sign the scheduled transaction with investor's private key
    try {
      await hederaService.executeScheduledTransaction(
        scheduledHederaTx.transactionId,
        request.investorPrivateKey
      );
      console.log("Investor signature added to scheduled transaction");
    } catch (signError) {
      console.error("Failed to sign scheduled transaction:", signError);
      // Continue anyway - entrepreneur can still approve
    }

    // Send email notification to entrepreneur
    try {
      const emailClient = new NotificationService({
        sesClient: new SESv2Client({ region: "us-east-1" }),
      });

      await emailClient.sendEmail({
        to: entrepreneurProfile.email,
        subject: `New Share Purchase Request - ${project.name}`,
        template: "share-purchase-request",
        data: {
          investorId: `${investorProfile?.firstName} ${investorProfile?.lastName}`,
          ProjectName: `${project.name}`,
          sharesRequested: request.sharesRequested,
          totalAmount: scheduledTx.totalAmount,
          transactionId: scheduledTx.transactionId,
          scheduleID: scheduledHederaTx.transactionId,
          expiresAt: scheduledTx.expiresAt,
        },
      });

      console.log("Email sent successfully");
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Don't fail the entire request if email fails
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message:
          "Buy order created successfully. Entrepreneur has 30 minutes to approve.",
        transactionId: scheduledTx.transactionId,
        scheduleID: scheduledHederaTx.transactionId,
        sharesRequested: request.sharesRequested,
        totalAmount: scheduledTx.totalAmount,
        expiresAt: scheduledTx.expiresAt,
        status: "pending_approval",
      }),
    };
  } catch (error) {
    console.error("Buy stock error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}

async function handleListStock(
  event: APIGatewayProxyEvent,
  userId: string,
  stockTradingRepo: StockTradingRepository,
  stockRepo: StockRepository,
  corsHeaders: Record<string, string>
): Promise<APIGatewayProxyResult> {
  let requestBody = event.body || "{}";
  if (event.isBase64Encoded) {
    requestBody = Buffer.from(requestBody, "base64").toString("utf-8");
  }
  const request: ListStockRequest = JSON.parse(requestBody);

  // Verify user owns the stock
  const stock = await stockRepo.getStockNFT(
    request.projectId,
    request.stockNumber
  );
  if (!stock || stock.ownerWalletAddress !== userId) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: "You don't own this stock" }),
    };
  }

  // Create listing
  const listing = await stockTradingRepo.createListing({
    projectId: request.projectId,
    stockNumber: request.stockNumber,
    sellerId: userId,
    pricePerStock: request.pricePerStock,
    quantity: request.quantity,
  });

  return {
    statusCode: 201,
    headers: corsHeaders,
    body: JSON.stringify({
      message: "Stock listed successfully",
      listingId: listing.listingId,
    }),
  };
}

async function handleGetMarketplace(
  event: APIGatewayProxyEvent,
  stockTradingRepo: StockTradingRepository,
  corsHeaders: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const projectId = event.pathParameters?.projectId;
  if (!projectId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Project ID required" }),
    };
  }

  const listings = await stockTradingRepo.getMarketplaceListings(projectId);

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      listings: listings.items,
      count: listings.count,
    }),
  };
}

async function handleGetPortfolio(
  event: APIGatewayProxyEvent,
  userId: string,
  stockRepo: StockRepository,
  corsHeaders: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const stocks = await stockRepo.getStocks({ ownerWalletAddress: userId });

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      stocks: stocks.items,
      count: stocks.count,
    }),
  };
}

async function handleGetTransactions(
  event: APIGatewayProxyEvent,
  userId: string,
  stockTradingRepo: StockTradingRepository,
  corsHeaders: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const transactions = await stockTradingRepo.getUserTransactions(userId);

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      transactions: transactions.items,
      count: transactions.count,
    }),
  };
}
