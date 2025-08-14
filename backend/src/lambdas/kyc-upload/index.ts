import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { KYCDocumentRepository } from "../../repositories/kyc-document-repository";
import { ExponentialBackoff } from "../../utils/retry";

import { createKYCLogger } from "../../utils/structured-logger";
import { ErrorClassifier } from "../../utils/error-handler";
import { EventPublisher } from "../kyc-processing/event-publisher";
import { KYCUploadDetail } from "../kyc-processing/types";
import { createKYCFileValidator } from "../../utils/file-validation";
import { createKYCDirectUploadUtility } from "../../utils/s3-direct-upload";
import { UploadResponse, KYCDocument, DirectUploadRequest } from "./types";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const cloudWatchClient = new CloudWatchClient({});

const TABLE_NAME = process.env.TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || "default";

const ENVIRONMENT = process.env.ENVIRONMENT!;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const KMS_KEY_ID = process.env.KMS_KEY_ID;

// Initialize services
const logger = createKYCLogger();
const eventPublisher = new EventPublisher({
  eventBusName: EVENT_BUS_NAME,
  region: AWS_REGION,
});
const fileValidator = createKYCFileValidator();
const s3UploadUtility = createKYCDirectUploadUtility(
  BUCKET_NAME,
  AWS_REGION,
  KMS_KEY_ID
);

const retry = new ExponentialBackoff({
  maxRetries: 3,
  baseDelay: 200,
  maxDelay: 5000,
  jitterType: "full",
});

export const handler: APIGatewayProxyHandler = async (event) => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("KYC Upload Lambda triggered", {
    operation: "LambdaInvocation",
    requestId,
    path: event.path,
    httpMethod: event.httpMethod,
    userAgent: event.headers["User-Agent"],
  });

  try {
    const path = event.path;
    let result;

    if (path.includes("/upload") && event.httpMethod === "POST") {
      result = await handleDirectUpload(event);
    } else {
      logger.warn("Endpoint not found", {
        operation: "RouteNotFound",
        requestId,
        path: event.path,
        method: event.httpMethod,
      });

      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Endpoint not found" }),
      };
    }

    const duration = Date.now() - startTime;
    logger.info("KYC Upload Lambda completed successfully", {
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
      "KYC Upload Lambda failed",
      {
        operation: "LambdaInvocation",
        requestId,
        duration,
        errorCategory: errorDetails.category,
        errorCode: errorDetails.errorCode,
      },
      error as Error
    );

    await putMetricSafe("UploadError", 1, {
      errorCategory: errorDetails.category,
    });

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

async function handleDirectUpload(event: APIGatewayProxyEvent): Promise<any> {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info("Direct upload started", {
    operation: "DirectUpload",
    requestId,
  });

  try {
    let bodyString = event.body || "{}";

    // Check if body is base64 encoded
    if (event.isBase64Encoded) {
      bodyString = Buffer.from(bodyString, "base64").toString("utf-8");
    }

    // Clean up line breaks in the JSON that break parsing
    bodyString = bodyString.replace(/\n/g, "").replace(/\r/g, "");

    const request: DirectUploadRequest = JSON.parse(bodyString);

    const cleanUserId = request.userId.startsWith("USER#")
      ? request.userId.substring(5)
      : request.userId;
    request.userId = cleanUserId;

    // Validate request using the new simplified validation function
    const validation = fileValidator.validateDirectUploadRequest(request);
    if (!validation.isValid) {
      logger.warn("Direct upload validation failed", {
        operation: "DirectUpload",
        requestId,
        userId: request.userId,
        errors: validation.errors,
      });

      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: validation.errors.join("; "),
          errors: validation.errors,
        }),
      };
    }

    const documentId = uuidv4();
    const fileBuffer = Buffer.from(request.fileContent, "base64");

    logger.info("Processing direct upload", {
      operation: "DirectUpload",
      requestId,
      userId: request.userId,
      documentId,
      documentType: request.documentType,
      fileName: request.fileName,
      fileSize: fileBuffer.length,
    });

    const timestamp = new Date().toISOString();

    // Upload to S3 using the new simplified upload utility
    const uploadResult = await s3UploadUtility.uploadFile({
      fileBuffer,
      fileName: request.fileName,
      contentType: request.contentType,
      userId: request.userId,
      documentType: request.documentType,
      documentId,
      metadata: {
        uploadTimestamp: timestamp,
      },
    });

    if (!uploadResult.success) {
      logger.error("S3 upload failed", {
        operation: "DirectUpload",
        requestId,
        userId: request.userId,
        documentId,
        error: uploadResult.error,
      });

      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: uploadResult.error || "File upload failed",
          requestId,
        }),
      };
    }

    const s3Key = uploadResult.s3Key;

    const document: KYCDocument = {
      PK: `USER#${request.userId}`,
      SK: `DOCUMENT#${documentId}`,
      GSI1PK: "KYC#uploaded",
      GSI1SK: timestamp,
      GSI2PK: `DOCUMENT#${request.documentType}`,
      GSI2SK: timestamp,
      documentId,
      userId: request.userId,
      documentType: request.documentType,
      fileName: request.fileName,
      fileSize: fileBuffer.length,
      contentType: request.contentType,
      s3Key,
      status: "uploaded",
      uploadedAt: timestamp,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: document,
      })
    );

    // Publish EventBridge event for downstream processing
    try {
      const eventDetail: KYCUploadDetail = {
        documentId,
        userId: request.userId,
        documentType: request.documentType as any,
        fileName: request.fileName,
        fileSize: fileBuffer.length,
        contentType: request.contentType as any,
        s3Key,
        s3Bucket: BUCKET_NAME,
        uploadedAt: timestamp,
      };

      await eventPublisher.publishKYCUploadEvent(eventDetail);

      logger.info("EventBridge event published successfully", {
        operation: "DirectUpload",
        requestId,
        userId: request.userId,
        documentId,
        eventDetail,
      });

      await putMetricSafe("EventPublishSuccess", 1, {
        documentType: request.documentType,
      });
    } catch (eventError) {
      // Log the error but don't fail the upload operation
      logger.error(
        "Failed to publish EventBridge event",
        {
          operation: "DirectUpload",
          requestId,
          userId: request.userId,
          documentId,
        },
        eventError as Error
      );

      await putMetricSafe("EventPublishError", 1, {
        documentType: request.documentType,
      });
    }

    const duration = Date.now() - startTime;
    logger.info("Direct upload completed successfully", {
      operation: "DirectUpload",
      requestId,
      userId: request.userId,
      documentId,
      s3Key: s3Key,
      duration,
    });

    await putMetricSafe("DirectUploadSuccess", 1, {
      documentType: request.documentType,
    });

    const response: UploadResponse = {
      documentId,
      message: "File uploaded successfully",
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorDetails = ErrorClassifier.classify(error as Error, {
      operation: "DirectUpload",
      requestId,
      duration,
    });

    logger.error(
      "Direct upload failed",
      {
        operation: "DirectUpload",
        requestId,
        duration,
        errorCategory: errorDetails.category,
      },
      error as Error
    );

    await putMetricSafe("DirectUploadError", 1, {
      errorCategory: errorDetails.category,
    });

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
}

async function putMetricSafe(
  metricName: string,
  value: number,
  dimensions: Record<string, string> = {}
): Promise<void> {
  try {
    const metricDimensions = [
      { Name: "Environment", Value: ENVIRONMENT },
      ...Object.entries(dimensions).map(([name, value]) => ({
        Name: name,
        Value: value,
      })),
    ];

    await retry.execute(
      () =>
        cloudWatchClient.send(
          new PutMetricDataCommand({
            Namespace: "Sachain/KYCUpload",
            MetricData: [
              {
                MetricName: metricName,
                Value: value,
                Unit: "Count",
                Dimensions: metricDimensions,
                Timestamp: new Date(),
              },
            ],
          })
        ),
      `CloudWatch-${metricName}`
    );

    logger.logMetricPublication(metricName, value, true);
  } catch (error) {
    logger.logMetricPublication(metricName, value, false, error as Error);
  }
}

// Legacy function for backward compatibility
async function putMetric(metricName: string, value: number): Promise<void> {
  await putMetricSafe(metricName, value);
}
