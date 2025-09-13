import { BaseRepository, DynamoDBConfig } from "./base-repository";
import { PaymentInitiation } from "../models/index";

export class PaymentRepository extends BaseRepository {
  constructor(config: DynamoDBConfig) {
    super(config);
  }
  async createPaymentInitiation(data: {
    userId: string;
    orderId: string;
    customerNumber: string;
    amount: number;
    description: string;
  }): Promise<PaymentInitiation> {
    const timestamp = this.generateTimestamp();

    const payment: PaymentInitiation = {
      PK: `USER#${data.userId}`,
      SK: `PAYMENT#${data.orderId}`,
      orderId: data.orderId,
      userId: data.userId,
      customerNumber: data.customerNumber,
      amount: data.amount,
      description: data.description,
      status: "initiated",
      createdAt: timestamp,
      updatedAt: timestamp,
      GSI1PK: "PAYMENT_STATUS#initiated",
      GSI1SK: timestamp,
    };

    await this.putItem(payment);
    return payment;
  }

  async updatePaymentStatus(
    userId: string,
    orderId: string,
    updates: {
      status?: PaymentInitiation["status"];
      orangeMoneyTransactionId?: string;
      payToken?: string;
      errorMessage?: string;
    }
  ): Promise<void> {
    const timestamp = this.generateTimestamp();
    const updateExpressions = ["#updatedAt = :updatedAt"];
    const names: Record<string, string> = { "#updatedAt": "updatedAt" };
    const values: Record<string, any> = { ":updatedAt": timestamp };

    if (updates.status) {
      updateExpressions.push("#status = :status", "#GSI1PK = :GSI1PK");
      names["#status"] = "status";
      names["#GSI1PK"] = "GSI1PK";
      values[":status"] = updates.status;
      values[":GSI1PK"] = `PAYMENT_STATUS#${updates.status}`;
    }

    if (updates.orangeMoneyTransactionId) {
      updateExpressions.push("#omTxnId = :omTxnId");
      names["#omTxnId"] = "orangeMoneyTransactionId";
      values[":omTxnId"] = updates.orangeMoneyTransactionId;
    }

    if (updates.payToken) {
      updateExpressions.push("#payToken = :payToken");
      names["#payToken"] = "payToken";
      values[":payToken"] = updates.payToken;
    }

    if (updates.errorMessage) {
      updateExpressions.push("#errorMessage = :errorMessage");
      names["#errorMessage"] = "errorMessage";
      values[":errorMessage"] = updates.errorMessage;
    }

    await this.updateItem(
      `USER#${userId}`,
      `PAYMENT#${orderId}`,
      `SET ${updateExpressions.join(", ")}`,
      names,
      values
    );
  }

  async getPayment(
    userId: string,
    orderId: string
  ): Promise<PaymentInitiation | null> {
    const result = await this.getItem<PaymentInitiation>(
      `USER#${userId}`,
      `PAYMENT#${orderId}`
    );

    return result ?? null;
  }
}
