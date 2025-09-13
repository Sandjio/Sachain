import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

import { PaymentRepository } from "../../repositories/";
import { extractUserIdFromToken } from "../../utils/jwt-utils";

const ORANGE_TOKEN_URL = "https://omdeveloper.orange.cm/oauth2/token";
const ORANGE_INIT_URL =
  "https://omdeveloper-gateway.orange.cm/omapi/1.0.2/mp/init";
const ORANGE_PAY_URL =
  "https://omdeveloper-gateway.orange.cm/omapi/1.0.2/mp/pay";

const CLIENT_ID = "cClHc8BNN9e4nbO4Zeq002DtJdca";
const CLIENT_SECRET = "YXCUfQYo1bFLz0GY3gjZMbCuYB4a";
const X_AUTH_TOKEN = "YWRtaW46YWRtaW4=";
const CHANNEL_USER_MSISDN = "691301143";
const PIN = "2222";
const NOTIF_URL =
  "https://hev5at4o19.execute-api.us-east-1.amazonaws.com/dev/om-payments/callback";

// ---- Utilities ----
function jsonResponse(statusCode: number, body: any): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify(body),
  };
}

function validatePayload(payload: any): { valid: boolean; missing?: string[] } {
  const required = [
    "customerNumber",
    "amount",
    "description",
    "idempotencyKey",
  ];
  const missing = required.filter((k) => !payload[k]);
  return { valid: missing.length === 0, missing };
}

// ---- Orange Money Client ----
class OrangeMoneyClient {
  private accessToken?: string;

  private async ensureAccessToken() {
    if (this.accessToken) return;
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
      "base64"
    );
    const resp = await fetch(ORANGE_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!resp.ok)
      throw new Error(
        `Failed to fetch access token: ${resp.status} ${await resp.text()}`
      );

    const data = await resp.json();
    this.accessToken = data?.access_token;
    if (!this.accessToken)
      throw new Error("Missing access_token in Orange response");
  }

  async fetchPayToken(): Promise<string> {
    await this.ensureAccessToken();

    const resp = await fetch(ORANGE_INIT_URL, {
      method: "POST",
      headers: {
        "WSO2-Authorization": `Bearer ${this.accessToken}`,
        "X-AUTH-TOKEN": X_AUTH_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!resp.ok)
      throw new Error(
        `Failed to fetch payToken: ${resp.status} ${await resp.text()}`
      );

    const data = await resp.json();
    const payToken = data?.data?.payToken;
    if (!payToken) throw new Error("Missing payToken in Orange response");
    return payToken;
  }

  async makePayment(
    payToken: string,
    payload: {
      subscriberMsisdn: string;
      amount: number;
      description: string;
      orderId: string;
    }
  ) {
    await this.ensureAccessToken();

    const body = {
      ...payload,
      channelUserMsisdn: CHANNEL_USER_MSISDN,
      pin: PIN,
      payToken,
      notifUrl: NOTIF_URL,
    };

    const resp = await fetch(ORANGE_PAY_URL, {
      method: "POST",
      headers: {
        "WSO2-Authorization": `Bearer ${this.accessToken}`,
        "X-AUTH-TOKEN": X_AUTH_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok)
      throw new Error(`Payment failed: ${resp.status} ${await resp.text()}`);
    return resp.json();
  }
}

// ---- Lambda Handler ----
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.info("Handler invoked", {
    path: event.path,
    method: event.httpMethod,
  });

  const tokenResult = extractUserIdFromToken(event);
  if (!tokenResult.success)
    return jsonResponse(401, { message: tokenResult.error || "Invalid token" });

  const userId = tokenResult.userId!;
  if (!event.body) return jsonResponse(400, { message: "Missing body" });

  let payload: any;
  try {
    const bodyString = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
    payload = JSON.parse(bodyString);
  } catch {
    return jsonResponse(400, { message: "Invalid JSON", raw: event.body });
  }

  const { valid, missing } = validatePayload(payload);
  if (!valid)
    return jsonResponse(400, {
      message: `Missing fields: ${missing!.join(", ")}`,
    });

  const idempotencyKey = payload.idempotencyKey;
  const orderId = idempotencyKey;

  const paymentRepo = new PaymentRepository({
    tableName: process.env.TABLE_NAME!,
  });

  try {
    // Check if already exists (idempotency)
    const existing = await paymentRepo.getPayment(userId, orderId);
    if (existing) {
      console.info("Idempotent request - returning existing payment");
      return jsonResponse(200, {
        message: "Payment already initiated",
        result: existing,
      });
    }

    // Save initiation
    await paymentRepo.createPaymentInitiation({
      userId,
      orderId,
      customerNumber: payload.customerNumber,
      amount: Number(payload.amount),
      description: payload.description,
    });

    // Process payment
    const omClient = new OrangeMoneyClient();
    const payToken = await omClient.fetchPayToken();
    const result = await omClient.makePayment(payToken, {
      subscriberMsisdn: payload.customerNumber,
      amount: Number(payload.amount),
      description: payload.description,
      orderId,
    });

    // Update payment with Orange Money response data
    await paymentRepo.updatePaymentStatus(userId, orderId, {
      status: "pending",
      payToken: result.data.payToken,
      orangeMoneyTransactionId: result.data.txnid,
    });

    return jsonResponse(200, { message: "Payment initiated", result });
  } catch (err: any) {
    console.error("Unhandled error", err);
    return jsonResponse(502, { error: err?.message || "Payment failed" });
  }
};

// import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
// import {
//   TokenResponse,
//   PayTokenResponse,
//   CreatePaymentResponse,
//   PaymentRequest,
//   HBARRechargePaymentRequest,
// } from "./types";
// import { OrangeMoneyRechargeService } from "./recharge-service";

// const OM_BASE_URL = "https://omdeveloper.orange.cm/";
// const X_AUTH_TOKEN = "YWRtaW46YWRtaW4=";
// const CLIENT_ID = "sachain_app";
// const CLIENT_SECRET = "sachain_secret";

// const getAccessToken = async (
//   clientId: string,
//   clientSecret: string,
//   timeoutMs = 5000
// ): Promise<string> => {
//   const controller = new AbortController();
//   const timeout = setTimeout(() => controller.abort(), timeoutMs);

//   try {
//     const res = await fetch(`${OM_BASE_URL}/oauth2/token`, {
//       method: "POST",
//       headers: {
//         Authorization: `Basic ${Buffer.from(
//           `${clientId}:${clientSecret}`
//         ).toString("base64")}`,
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//       body: new URLSearchParams({ grant_type: "client_credentials" }),
//       signal: controller.signal,
//     });

//     if (!res.ok) {
//       const errorText = await res.text();
//       throw new Error(
//         `Failed to get access token: ${res.status} ${res.statusText} - ${errorText}`
//       );
//     }
//     const data: TokenResponse = await res.json();

//     if (!data.access_token) {
//       throw new Error("Response did not include an access token");
//     }
//     return data.access_token;
//   } finally {
//     clearTimeout(timeout);
//   }
// };

// const getPayToken = async (
//   accessToken: string,
//   xauthToken: string,
//   timeoutMs = 5000
// ): Promise<string> => {
//   const controller = new AbortController();
//   const timeout = setTimeout(() => controller.abort(), timeoutMs);
//   try {
//     const res = await fetch(`${OM_BASE_URL}/omapi/1.0.2/mp/init`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "X-AUTH-TOKEN": xauthToken,
//         "WSO2-Authorization": `Bearer ${accessToken}`,
//       },
//       signal: controller.signal,
//     });

//     if (!res.ok) {
//       const errorText = await res.text();
//       throw new Error(
//         `Failed to get pay token: ${res.status} ${res.statusText} - ${errorText}`
//       );
//     }
//     const { data } = (await res.json()) as PayTokenResponse;

//     if (!data?.payToken) {
//       throw new Error("Response did not include a pay token");
//     }
//     return data.payToken;
//   } finally {
//     clearTimeout(timeout);
//   }
// };

// const createPayment = async (
//   accessToken: string,
//   xauthToken: string,
//   customerNumber: string,
//   sachainNumber: string,
//   amount: string,
//   description: string,
//   orderId: string,
//   pin: string,
//   payToken: string,
//   notifUrls: string,
//   timeoutMs = 10000
// ): Promise<string> => {
//   const controller = new AbortController();
//   const timeout = setTimeout(() => controller.abort(), timeoutMs);
//   try {
//     const res = await fetch(`${OM_BASE_URL}/omapi/1.0.2/mp/pay`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "X-AUTH-TOKEN": xauthToken,
//         "WSO2-Authorization": `Bearer ${accessToken}`,
//       },
//       body: JSON.stringify({
//         customerNumber,
//         sachainNumber,
//         amount,
//         description,
//         orderId,
//         pin,
//         payToken,
//         notifUrls,
//       }),
//       signal: controller.signal,
//     });

//     if (!res.ok) {
//       const errorText = await res.text();
//       throw new Error(
//         `Failed to create payment: ${res.status} ${res.statusText} - ${errorText}`
//       );
//     }
//     const { data } = (await res.json()) as CreatePaymentResponse;

//     if (!data) {
//       throw new Error("Response did not include payment data");
//     }
//     return JSON.stringify(data);
//   } finally {
//     clearTimeout(timeout);
//   }
// };

// export const handler = async (
//   event: APIGatewayProxyEvent
// ): Promise<APIGatewayProxyResult> => {
//   try {
//     if (!event.body) {
//       return {
//         statusCode: 400,
//         body: JSON.stringify({ message: "Missing body" }),
//       };
//     }

//     const requestBody = JSON.parse(event.body);

//     // Check if this is an HBAR recharge request
//     if (requestBody.transactionId && requestBody.userHederaAccountId) {
//       return await handleHBARRecharge(
//         requestBody as HBARRechargePaymentRequest
//       );
//     }

//     // Handle regular Orange Money payment
//     const { customerNumber, amount, description, orderId, pin, notifUrls } =
//       requestBody as PaymentRequest;

//     if (!customerNumber || !amount || !pin) {
//       return {
//         statusCode: 400,
//         body: JSON.stringify({ message: "Missing required parameters" }),
//       };
//     }

//     const sachainNumber = "657615723";
//     // Get access token
//     const accessToken = await getAccessToken(CLIENT_ID, CLIENT_SECRET);

//     // Get pay token
//     const payToken = await getPayToken(accessToken, X_AUTH_TOKEN);

//     // Create payment
//     const payment = await createPayment(
//       accessToken,
//       X_AUTH_TOKEN,
//       customerNumber || "",
//       sachainNumber || "",
//       amount || "",
//       description || "Sachain Payment",
//       orderId || `order-${Date.now()}`,
//       pin || "",
//       payToken,
//       notifUrls || ""
//     );

//     return {
//       statusCode: 200,
//       body: JSON.stringify(payment),
//     };
//   } catch (error) {
//     console.error("Error processing payment:", {
//       message: (error as Error).message,
//       stack: (error as Error).stack,
//     });
//     return {
//       statusCode: 500,
//       body: JSON.stringify({
//         message: "Internal server error",
//         error: (error as Error).message,
//       }),
//     };
//   }
// };

// /**
//  * Handles HBAR recharge payments using the dedicated recharge service
//  */
// async function handleHBARRecharge(
//   request: HBARRechargePaymentRequest
// ): Promise<APIGatewayProxyResult> {
//   try {
//     const rechargeService = new OrangeMoneyRechargeService();
//     const result = await rechargeService.initiateRechargePayment(request);

//     if (result.success) {
//       return {
//         statusCode: 200,
//         body: JSON.stringify({
//           success: true,
//           transactionId: result.transactionId,
//           orangeMoneyTransactionId: result.orangeMoneyTransactionId,
//           status: "payment_initiated",
//           paymentData: result.paymentData,
//         }),
//       };
//     } else {
//       return {
//         statusCode: 400,
//         body: JSON.stringify({
//           success: false,
//           error: result.error,
//         }),
//       };
//     }
//   } catch (error) {
//     console.error("Error processing HBAR recharge:", {
//       error: (error as Error).message,
//       stack: (error as Error).stack,
//     });
//     return {
//       statusCode: 500,
//       body: JSON.stringify({
//         success: false,
//         error: {
//           code: "INTERNAL_ERROR",
//           message: "Internal server error occurred while processing recharge",
//         },
//       }),
//     };
//   }
// }
