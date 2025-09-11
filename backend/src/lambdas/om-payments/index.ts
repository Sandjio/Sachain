import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const ORANGE_TOKEN_URL = "https://omdeveloper.orange.cm/oauth2/token";
const ORANGE_INIT_URL =
  "https://omdeveloper-gateway.orange.cm/omapi/1.0.2/mp/init";
const ORANGE_PAY_URL =
  "https://omdeveloper-gateway.orange.cm/omapi/1.0.2/mp/pay";

//
// Hardcoded credentials (per your request).
//
const CLIENT_ID = "cClHc8BNN9e4nbO4Zeq002DtJdca";
const CLIENT_SECRET = "YXCUfQYo1bFLz0GY3gjZMbCuYB4a";
const X_AUTH_TOKEN = "YWRtaW46YWRtaW4=";
const CHANNEL_USER_MSISDN = "691301143";
const PIN = "2222";
const NOTIF_URL =
  "https://58p4mccn08.execute-api.us-east-2.amazonaws.com/dev/om-payments/callback";

async function fetchAccessToken(): Promise<string> {
  console.info("Fetching Orange Money access token.");

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const resp = await fetch(ORANGE_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  console.debug("Access token response status", resp.status);

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Failed to fetch access token", {
      status: resp.status,
      body: text,
    });
    throw new Error(`Failed to fetch access token: ${resp.status}`);
  }

  const data = await resp.json();
  const token = data?.access_token;
  if (!token) {
    console.error("Access token missing in response", data);
    throw new Error("Missing access_token in Orange response");
  }

  console.info("Access token acquired.");
  return token;
}

async function fetchPayToken(accessToken: string): Promise<string> {
  console.info("Fetching payToken.");

  const resp = await fetch(ORANGE_INIT_URL, {
    method: "POST",
    headers: {
      "WSO2-Authorization": `Bearer ${accessToken}`,
      "X-AUTH-TOKEN": X_AUTH_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}), // empty object per spec
  });

  console.debug("Init response status", resp.status);

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Failed to fetch payToken", {
      status: resp.status,
      body: text,
    });
    throw new Error(`Failed to fetch payToken: ${resp.status}`);
  }

  const data = await resp.json();
  console.debug("Init response body", data);
  const payToken = data?.data?.payToken;
  if (!payToken) {
    console.error("payToken missing in response", data);
    throw new Error("Missing payToken in Orange response");
  }

  console.info("payToken acquired.");
  return payToken;
}

async function makePayment(
  accessToken: string,
  payToken: string,
  payload: {
    subscriberMsisdn: string;
    amount: string | number;
    description: string;
    orderId: string;
  }
) {
  console.info("Making payment request.");

  const body = {
    subscriberMsisdn: payload.subscriberMsisdn,
    channelUserMsisdn: CHANNEL_USER_MSISDN,
    amount: payload.amount,
    description: payload.description,
    orderId: payload.orderId,
    pin: PIN,
    payToken,
    notifUrl: NOTIF_URL,
  };

  const resp = await fetch(ORANGE_PAY_URL, {
    method: "POST",
    headers: {
      "WSO2-Authorization": `Bearer ${accessToken}`,
      "X-AUTH-TOKEN": X_AUTH_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  console.debug("Payment response status", resp.status);

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Payment request failed", {
      status: resp.status,
      body: text,
    });
    throw new Error(`Payment failed: ${resp.status}`);
  }

  const data = await resp.json();
  console.info("Payment request completed.");
  return data;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.info("Handler invoked", {
    path: event.path,
    method: event.httpMethod,
  });

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing body" }),
      };
    }

    let parsed;
    console.debug("Raw event.body", event.body);

    try {
      let bodyString = event.body;

      // If body is base64 encoded
      if (event.isBase64Encoded) {
        console.debug("Decoding base64 body");
        bodyString = Buffer.from(event.body, "base64").toString("utf8");
      }
      parsed = JSON.parse(bodyString);
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid JSON", raw: event.body }),
      };
    }

    const required = ["customerNumber", "amount", "description", "orderId"];
    const missing = required.filter((k) => !parsed[k]);
    if (missing.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: `Missing fields: ${missing.join(", ")}`,
        }),
      };
    }

    // Flow
    const accessToken = await fetchAccessToken();
    const payToken = await fetchPayToken(accessToken);
    const result = await makePayment(accessToken, payToken, {
      subscriberMsisdn: parsed.customerNumber,
      amount: parsed.amount,
      description: parsed.description,
      orderId: parsed.orderId,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Payment initiated", result }),
    };
  } catch (err: any) {
    console.error("Unhandled error", { message: err?.message });
    return { statusCode: 502, body: JSON.stringify({ error: err?.message }) };
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
