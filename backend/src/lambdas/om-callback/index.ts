import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PaymentRepository } from "../../repositories/";
import { createEventPublisher } from "../../utils/event-publisher";

const paymentRepo = new PaymentRepository({
  tableName: process.env.TABLE_NAME!,
});

const eventPublisher = createEventPublisher({
  eventBusName: process.env.EVENT_BUS_NAME!,
});

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

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
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

  console.info("Orange Money Callback Invoked", {
    path: event.path,
    method: event.httpMethod,
  });

  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
  };

  try {
    if (!event.body) {
      console.warn("No body in callback");
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Missing body" }),
      };
    }

    // Handle both plain JSON and base64-encoded bodies
    let bodyString = event.body;
    if (event.isBase64Encoded) {
      console.debug("Decoding base64 encoded body");
      bodyString = Buffer.from(event.body, "base64").toString("utf8");
    }

    let payload: any;
    try {
      payload = JSON.parse(bodyString);
    } catch {
      console.error("Failed to parse JSON body", { raw: bodyString });
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Invalid JSON" }),
      };
    }

    console.info("Received Orange Money Callback Payload:", payload);

    const { payToken, status, txnid } = payload;

    if (!payToken) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Missing payToken" }),
      };
    }

    // Lookup payment by payToken
    const payment = await paymentRepo.getPaymentByPayToken(payToken);
    if (!payment) {
      console.warn("No matching payment found for payToken", { payToken });
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Payment not found" }),
      };
    }

    // Update status based on Orange Money response
    const newStatus = status === "SUCCESSFULL" ? "completed" : "failed";

    await paymentRepo.updatePaymentStatus(payment.userId, payment.orderId, {
      status: newStatus,
      orangeMoneyTransactionId: txnid,
    });

    // Publish event for successful payment to trigger HBAR transfer
    if (newStatus === "completed") {
      await eventPublisher.publishEvent(
        "sachain.payments",
        {
          eventType: "PAYMENT_COMPLETED",
          payToken,
          userId: payment.userId,
          orderId: payment.orderId,
          amount: payment.amount,
          orangeMoneyTransactionId: txnid,
        },
        "Payment Completed",
        "PAYMENT_COMPLETED"
      );
    }
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Payment updated", status: newStatus }),
    };
  } catch (err: any) {
    console.error("Unhandled error in callback handler", {
      message: err?.message,
    });
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
