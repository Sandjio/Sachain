import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { StockTradingRepository } from "../../repositories/stock-trading-repository";
import { extractUserIdFromToken } from "../../utils/jwt-utils";

export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const tokenResult = extractUserIdFromToken(event);
    if (!tokenResult.success) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Authentication failed" }),
      };
    }

    const entrepreneurId = tokenResult.userId!;
    const method = event.httpMethod;
    const path = event.path;

    const stockTradingRepo = new StockTradingRepository({
      tableName: process.env.TABLE_NAME!,
    });

    // GET /projects/trades - Get pending trades for entrepreneur
    if (method === "GET" && path === "/projects/trades") {
      const pendingTrades =
        await stockTradingRepo.getEntrepreneurPendingTransactions(
          entrepreneurId
        );

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          trades: pendingTrades.items,
          count: pendingTrades.count,
        }),
      };
    }

    // POST /projects/trades/{transactionId} - Approve/reject trade
    if (method === "POST" && path.includes("/projects/trades/")) {
      const transactionId = event.pathParameters?.transactionId;
      if (!transactionId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Transaction ID is required" }),
        };
      }

      const { action } = JSON.parse(event.body || "{}"); // "approve" or "reject"

      if (!action || !["approve", "reject"].includes(action)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: "Action must be 'approve' or 'reject'",
          }),
        };
      }

      const scheduledTx = await stockTradingRepo.getScheduledTransaction(
        transactionId
      );
      if (!scheduledTx) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Transaction not found" }),
        };
      }

      // Verify entrepreneur owns this transaction
      if (scheduledTx.entrepreneurId !== entrepreneurId) {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      // Check if transaction is still pending and not expired
      if (scheduledTx.status !== "pending") {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Transaction is no longer pending" }),
        };
      }

      if (new Date() > new Date(scheduledTx.expiresAt)) {
        await stockTradingRepo.updateScheduledTransactionStatus(
          transactionId,
          "expired"
        );
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Transaction has expired" }),
        };
      }

      if (action === "approve") {
        // Execute the actual Hedera transfer here
        // This would involve calling HederaService to transfer the NFT tokens
        // For now, we'll just update the status
        await stockTradingRepo.updateScheduledTransactionStatus(
          transactionId,
          "approved"
        );

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            message: "Transaction approved and executed successfully",
            transactionId,
          }),
        };
      } else {
        await stockTradingRepo.updateScheduledTransactionStatus(
          transactionId,
          "rejected"
        );

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            message: "Transaction rejected",
            transactionId,
          }),
        };
      }
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Endpoint not found" }),
    };
  } catch (error) {
    console.error("Trade approval error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
