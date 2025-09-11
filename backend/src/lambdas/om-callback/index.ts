import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.info("Orange Money Callback Invoked", {
    path: event.path,
    method: event.httpMethod,
  });

  try {
    if (!event.body) {
      console.warn("No body in callback");
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing body" }),
      };
    }

    // Handle both plain JSON and base64-encoded bodies
    let bodyString = event.body;
    if (event.isBase64Encoded) {
      console.debug("Decoding base64 encoded body");
      bodyString = Buffer.from(event.body, "base64").toString("utf8");
    }

    let payload;
    try {
      payload = JSON.parse(bodyString);
    } catch {
      console.error("Failed to parse JSON body", { raw: bodyString });
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid JSON" }),
      };
    }

    // Log the entire callback payload
    console.info("Received Orange Money Callback Payload:", payload);

    // You might later add verification & persistence here

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Callback received" }),
    };
  } catch (err: any) {
    console.error("Unhandled error in callback handler", {
      message: err?.message,
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
