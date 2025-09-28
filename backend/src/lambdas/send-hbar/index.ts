import { EventBridgeEvent } from "aws-lambda";
import { UserRepository } from "../../repositories";
import { TransactionRepository } from "../../repositories/transaction-repository";
import { createExchangeRateService } from "../../utils/exchange-rate-service";
import { createHederaService } from "../../utils/hedera-service";

const userRepo = new UserRepository({
  tableName: process.env.TABLE_NAME!,
});

const transactionRepo = new TransactionRepository({
  tableName: process.env.TABLE_NAME!,
});

const exchangeRateService = createExchangeRateService(process.env.TABLE_NAME!);
const hederaService = createHederaService();

interface PaymentCompletedEvent {
  eventType: string;
  payToken: string;
  userId: string;
  orderId: string;
  amount: number;
  orangeMoneyTransactionId: string;
}

export const handler = async (
  event: EventBridgeEvent<"Payment Completed", PaymentCompletedEvent>
): Promise<void> => {
  console.info("SendHbar Lambda Invoked", {
    eventType: event["detail-type"],
    source: event.source,
  });

  try {
    const { userId, orderId, amount } = event.detail;

    // Get user profile to retrieve wallet address
    const user = await userRepo.getUserProfile(userId);
    if (!user || !user.walletAddress) {
      throw new Error(`User not found or missing wallet address: ${userId}`);
    }

    // Convert XAF to HBAR with error handling
    let conversionResult;
    try {
      conversionResult = await exchangeRateService.calculateHBARAmount(amount);
    } catch (conversionError) {
      console.error("Exchange rate conversion failed, using fallback:", conversionError);
      // Use emergency fallback conversion
      const fallbackRate = 0.00001; // 1 XAF = 0.00001 HBAR
      conversionResult = {
        xafAmount: amount,
        hbarAmount: amount * fallbackRate,
        exchangeRate: fallbackRate,
        platformFee: amount * 0.025, // 2.5%
        orangeMoneyFee: amount * 0.015, // 1.5%
        netHBARAmount: amount * fallbackRate * 0.96, // After fees
      };
    }

    // Validate minimum transfer amount
    if (conversionResult.hbarAmount < 0.00000001) { // 1 tinybar minimum
      throw new Error(`HBAR amount too small: ${conversionResult.hbarAmount} HBAR (minimum: 0.00000001 HBAR)`);
    }

    console.info("HBAR conversion completed", {
      xafAmount: amount,
      hbarAmount: conversionResult.hbarAmount,
      exchangeRate: conversionResult.exchangeRate,
      source: "exchange-rate-service"
    });

    // Create transaction record
    const transaction = await transactionRepo.createHBARTransaction({
      userId,
      paymentOrderId: orderId,
      fromAccountId: process.env.HEDERA_OPERATOR_ID!,
      toAccountId: user.walletAddress,
      hbarAmount: conversionResult.hbarAmount,
      xafAmount: amount,
      exchangeRate: conversionResult.exchangeRate,
    });

    try {
      // Send HBAR using Hedera SDK
      const transferResult = await hederaService.transferHBAR({
        fromAccountId: process.env.HEDERA_OPERATOR_ID!,
        toAccountId: user.walletAddress,
        amount: conversionResult.hbarAmount,
        memo: `Recharge for payment ${orderId}`,
      });

      // Update transaction as completed
      await transactionRepo.updateHBARTransaction(
        userId,
        transaction.transactionId,
        {
          status: "completed",
          hederaTransactionId: transferResult.transactionId,
          hederaTransactionHash: transferResult.transactionHash,
        }
      );

      console.info("HBAR transfer completed successfully", {
        userId,
        orderId,
        transactionId: transaction.transactionId,
        hederaTransactionId: transferResult.transactionId,
        hbarAmount: conversionResult.hbarAmount,
      });
    } catch (transferError) {
      // Update transaction as failed
      await transactionRepo.updateHBARTransaction(
        userId,
        transaction.transactionId,
        {
          status: "failed",
          errorMessage: (transferError as Error).message,
        }
      );

      console.error("HBAR transfer failed", {
        userId,
        orderId,
        transactionId: transaction.transactionId,
        error: (transferError as Error).message,
      });

      throw transferError;
    }
  } catch (error) {
    console.error("SendHbar Lambda error", {
      error: (error as Error).message,
      event: event.detail,
    });
    throw error;
  }
};
