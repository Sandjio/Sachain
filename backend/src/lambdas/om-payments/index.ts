import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  TokenResponse,
  PayTokenResponse,
  CreatePaymentResponse,
  PaymentRequest,
  HBARRechargePaymentRequest,
} from "./types";
import { OrangeMoneyRechargeService } from "./recharge-service";

const OM_BASE_URL = "https://omdeveloper.orange.cm/";
const X_AUTH_TOKEN = "YWRtaW46YWRtaW4=";
const CLIENT_ID = "sachain_app";
const CLIENT_SECRET = "sachain_secret";

const getAccessToken = async (
  clientId: string,
  clientSecret: string,
  timeoutMs = 5000
): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OM_BASE_URL}/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `Failed to get access token: ${res.status} ${res.statusText} - ${errorText}`
      );
    }
    const data: TokenResponse = await res.json();

    if (!data.access_token) {
      throw new Error("Response did not include an access token");
    }
    return data.access_token;
  } finally {
    clearTimeout(timeout);
  }
};

const getPayToken = async (
  accessToken: string,
  xauthToken: string,
  timeoutMs = 5000
): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${OM_BASE_URL}/omapi/1.0.2/mp/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AUTH-TOKEN": xauthToken,
        "WSO2-Authorization": `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `Failed to get pay token: ${res.status} ${res.statusText} - ${errorText}`
      );
    }
    const { data } = (await res.json()) as PayTokenResponse;

    if (!data?.payToken) {
      throw new Error("Response did not include a pay token");
    }
    return data.payToken;
  } finally {
    clearTimeout(timeout);
  }
};

const createPayment = async (
  accessToken: string,
  xauthToken: string,
  customerNumber: string,
  sachainNumber: string,
  amount: string,
  description: string,
  orderId: string,
  pin: string,
  payToken: string,
  notifUrls: string,
  timeoutMs = 10000
): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${OM_BASE_URL}/omapi/1.0.2/mp/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AUTH-TOKEN": xauthToken,
        "WSO2-Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        customerNumber,
        sachainNumber,
        amount,
        description,
        orderId,
        pin,
        payToken,
        notifUrls,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `Failed to create payment: ${res.status} ${res.statusText} - ${errorText}`
      );
    }
    const { data } = (await res.json()) as CreatePaymentResponse;

    if (!data) {
      throw new Error("Response did not include payment data");
    }
    return JSON.stringify(data);
  } finally {
    clearTimeout(timeout);
  }
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing body" }),
      };
    }

    const requestBody = JSON.parse(event.body);

    // Check if this is an HBAR recharge request
    if (requestBody.transactionId && requestBody.userHederaAccountId) {
      return await handleHBARRecharge(
        requestBody as HBARRechargePaymentRequest
      );
    }

    // Handle regular Orange Money payment
    const { customerNumber, amount, description, orderId, pin, notifUrls } =
      requestBody as PaymentRequest;

    if (!customerNumber || !amount || !pin) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required parameters" }),
      };
    }

    const sachainNumber = "657615723";
    // Get access token
    const accessToken = await getAccessToken(CLIENT_ID, CLIENT_SECRET);

    // Get pay token
    const payToken = await getPayToken(accessToken, X_AUTH_TOKEN);

    // Create payment
    const payment = await createPayment(
      accessToken,
      X_AUTH_TOKEN,
      customerNumber || "",
      sachainNumber || "",
      amount || "",
      description || "Sachain Payment",
      orderId || `order-${Date.now()}`,
      pin || "",
      payToken,
      notifUrls || ""
    );

    return {
      statusCode: 200,
      body: JSON.stringify(payment),
    };
  } catch (error) {
    console.error("Error processing payment:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
        error: (error as Error).message,
      }),
    };
  }
};

/**
 * Handles HBAR recharge payments using the dedicated recharge service
 */
async function handleHBARRecharge(
  request: HBARRechargePaymentRequest
): Promise<APIGatewayProxyResult> {
  try {
    const rechargeService = new OrangeMoneyRechargeService();
    const result = await rechargeService.initiateRechargePayment(request);

    if (result.success) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          transactionId: result.transactionId,
          orangeMoneyTransactionId: result.orangeMoneyTransactionId,
          status: "payment_initiated",
          paymentData: result.paymentData,
        }),
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: result.error,
        }),
      };
    }
  } catch (error) {
    console.error("Error processing HBAR recharge:", {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error occurred while processing recharge",
        },
      }),
    };
  }
}
