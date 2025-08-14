import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SNSClient } from "@aws-sdk/client-sns";
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { KYCDocumentRepository } from "../../repositories/kyc-document-repository";
import { ExponentialBackoff } from "../../utils/retry";
import { NotificationService } from "../../utils/notification-service";
import {
  StructuredLogger,
  createKYCLogger,
} from "../../utils/structured-logger";
import {
  ErrorClassifier,
  AWSServiceError,
  ErrorCategory,
} from "../../utils/error-handler";
import { S3UploadUtility, createKYCUploadUtility } from "../../utils/s3-upload";
import {
  UploadRequest,
  PresignedUrlRequest,
  UploadResponse,
  KYCDocument,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  DOCUMENT_TYPES,
  DirectUploadRequest,
  UploadProcessingRequest,
} from "./types";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});
const snsClient = new SNSClient({});
const cloudWatchClient = new CloudWatchClient({});

const TABLE_NAME = process.env.TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN!;
const ENVIRONMENT = process.env.ENVIRONMENT!;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const KMS_KEY_ID = process.env.KMS_KEY_ID;

// Initialize services
const logger = createKYCLogger();
const notificationService = new NotificationService({
  snsClient,
  topicArn: SNS_TOPIC_ARN,
  adminPortalUrl: process.env.ADMIN_PORTAL_URL,
});
const s3UploadUtility = createKYCUploadUtility(
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

    if (path.includes("/presigned-url") && event.httpMethod === "POST") {
      result = await handlePresignedUrl(event);
    } else if (path.includes("/upload") && event.httpMethod === "POST") {
      result = await handleDirectUpload(event);
    } else if (
      path.includes("/process-upload") &&
      event.httpMethod === "POST"
    ) {
      result = await handleUploadProcessing(event);
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

async function handlePresignedUrl(event: APIGatewayProxyEvent): Promise<any> {
  const request: PresignedUrlRequest = JSON.parse(event.body || "{}");

  // Validate request
  const validation = validateUploadRequest(request);
  if (!validation.isValid) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: validation.error }),
    };
  }

  const documentId = uuidv4();
  const timestamp = new Date().toISOString();
  const s3Key = `kyc-documents/${request.userId}/${documentId}/${request.fileName}`;

  // Generate presigned URL
  const putObjectCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ContentType: request.contentType,
    ServerSideEncryption: "aws:kms",
    Metadata: {
      documentType: request.documentType,
      userId: request.userId,
      documentId: documentId,
    },
  });

  const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, {
    expiresIn: 3600, // 1 hour
  });

  // Create document record in DynamoDB with retry logic
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
    fileSize: 0, // Will be updated after upload
    contentType: request.contentType,
    s3Key,
    status: "uploaded",
    uploadedAt: timestamp,
  };

  await retry.execute(
    () =>
      docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: document,
        })
      ),
    `DynamoDB-Put-${documentId}`
  );

  await putMetric("PresignedUrlGenerated", 1);

  const response: UploadResponse = {
    documentId,
    uploadUrl,
    message: "Presigned URL generated successfully",
  };

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(response),
  };
}

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

    // Validate request using the working validation function
    const validation = validateDirectUploadRequest(request);
    if (!validation.isValid) {
      logger.warn("Direct upload validation failed", {
        operation: "DirectUpload",
        requestId,
        userId: request.userId,
        error: validation.error,
      });

      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: validation.error }),
      };
    }

    const documentId = uuidv4();
    const fileBuffer = Buffer.from(request.fileContent, "base64");

    if (fileBuffer.length > MAX_FILE_SIZE) {
      return {
        statusCode: 413,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: `File exceeds max size of ${
            MAX_FILE_SIZE / 1024 / 1024
          } MB.`,
        }),
      };
    }

    logger.info("Processing direct upload", {
      operation: "DirectUpload",
      requestId,
      userId: request.userId,
      documentId,
      documentType: request.documentType,
      fileName: request.fileName,
      fileSize: fileBuffer.length,
    });

    const s3Key = `kyc-documents/${request.userId}/${documentId}/${request.fileName}`;
    const timestamp = new Date().toISOString();

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: request.contentType,
        ServerSideEncryption: "aws:kms",
        Metadata: {
          documentType: request.documentType,
          userId: request.userId,
          documentId: documentId,
        },
      })
    );

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

function validateUploadRequest(request: any): {
  isValid: boolean;
  error?: string;
} {
  if (!request.documentType || !DOCUMENT_TYPES.includes(request.documentType)) {
    return { isValid: false, error: "Invalid document type" };
  }

  if (!request.fileName || typeof request.fileName !== "string") {
    return { isValid: false, error: "Invalid file name" };
  }

  if (
    !request.contentType ||
    !ALLOWED_FILE_TYPES.includes(request.contentType as any)
  ) {
    return { isValid: false, error: "Invalid file type" };
  }

  if (!request.userId || typeof request.userId !== "string") {
    return { isValid: false, error: "Invalid user ID" };
  }

  // Validate file name format
  const fileNameRegex = /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|pdf)$/i;
  if (!fileNameRegex.test(request.fileName)) {
    return { isValid: false, error: "Invalid file name format" };
  }

  return { isValid: true };
}

function validateDirectUploadRequest(request: any): {
  isValid: boolean;
  error?: string;
} {
  if (!request.documentType || !DOCUMENT_TYPES.includes(request.documentType)) {
    return { isValid: false, error: "Invalid document type" };
  }

  if (!request.fileName || typeof request.fileName !== "string") {
    return { isValid: false, error: "Invalid file name" };
  }

  if (
    !request.contentType ||
    !ALLOWED_FILE_TYPES.includes(request.contentType as any)
  ) {
    return { isValid: false, error: "Invalid file type" };
  }

  if (!request.userId || typeof request.userId !== "string") {
    return { isValid: false, error: "Invalid user ID" };
  }

  if (!request.fileContent || typeof request.fileContent !== "string") {
    return { isValid: false, error: "Missing or invalid file content" };
  }

  const fileNameRegex = /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|pdf)$/i;
  if (!fileNameRegex.test(request.fileName)) {
    return { isValid: false, error: "Invalid file name format" };
  }

  try {
    const buffer = Buffer.from(request.fileContent, "base64");
    if (buffer.length === 0) {
      return { isValid: false, error: "Empty file content" };
    }
  } catch (error) {
    return { isValid: false, error: "Invalid base64 file content" };
  }

  return { isValid: true };
}

function validateFileContent(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): { isValid: boolean; error?: string } {
  // Check file header for basic format verification
  if (fileBuffer.length < 4) {
    return { isValid: false, error: "File is too small to validate format" };
  }

  const header = fileBuffer.subarray(0, 8);

  switch (contentType) {
    case "image/jpeg":
      if (header[0] !== 0xff || header[1] !== 0xd8) {
        return {
          isValid: false,
          error: "File does not appear to be a valid JPEG image",
        };
      }
      break;

    case "image/png":
      if (
        header[0] !== 0x89 ||
        header[1] !== 0x50 ||
        header[2] !== 0x4e ||
        header[3] !== 0x47
      ) {
        return {
          isValid: false,
          error: "File does not appear to be a valid PNG image",
        };
      }
      break;

    case "application/pdf":
      if (
        header[0] !== 0x25 ||
        header[1] !== 0x50 ||
        header[2] !== 0x44 ||
        header[3] !== 0x46
      ) {
        return {
          isValid: false,
          error: "File does not appear to be a valid PDF document",
        };
      }
      break;
  }

  return { isValid: true };
}

function generateS3Key(
  userId: string,
  documentType: string,
  fileName: string,
  documentId: string
): string {
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const extension = getFileExtension(fileName);
  const sanitizedFileName = sanitizeFileName(fileName);
  const uploadId = generateUploadId();

  return `kyc-documents/${userId}/${documentType}/${timestamp}/${uploadId}-${sanitizedFileName}${extension}`;
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot !== -1 ? fileName.substring(lastDot) : "";
}

function sanitizeFileName(fileName: string): string {
  // Remove extension and sanitize
  const nameWithoutExt =
    fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
  return nameWithoutExt
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function generateUploadId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

async function handleUploadProcessing(
  event: APIGatewayProxyEvent
): Promise<any> {
  const request: UploadProcessingRequest = JSON.parse(event.body || "{}");

  // Validate request
  if (!request.documentId || !request.userId || !request.s3Key) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Missing required fields" }),
    };
  }

  try {
    // Initialize KYC document repository
    const kycRepo = new KYCDocumentRepository({
      tableName: TABLE_NAME,
      region: process.env.AWS_REGION || "us-east-1",
    });

    // Update document with actual file size and change status to pending review
    const document = await kycRepo.getKYCDocument(
      request.userId,
      request.documentId
    );
    if (!document) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Document not found" }),
      };
    }

    // Update document status to pending review
    await kycRepo.updateKYCDocument({
      userId: request.userId,
      documentId: request.documentId,
      status: "pending",
    });

    // Send SNS notification for admin review
    await sendAdminNotification({
      documentId: request.documentId,
      userId: request.userId,
      documentType: document.documentType,
      fileName: document.originalFileName,
      uploadedAt: document.uploadedAt,
    });

    await putMetric("UploadProcessed", 1);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Upload processed successfully",
        documentId: request.documentId,
        status: "pending_review",
      }),
    };
  } catch (error) {
    console.error("Error processing upload:", error);
    await putMetric("UploadProcessingError", 1);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Internal server error during processing",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
}

async function sendAdminNotification(data: {
  documentId: string;
  userId: string;
  documentType: string;
  fileName: string;
  uploadedAt: string;
}): Promise<void> {
  try {
    await notificationService.sendKYCReviewNotification(data);

    console.log("Admin notification sent successfully", {
      documentId: data.documentId,
      userId: data.userId,
    });

    await putMetric("AdminNotificationSent", 1);
  } catch (error) {
    console.error("Failed to send admin notification:", error);
    await putMetric("AdminNotificationError", 1);
    // Don't throw error as this is not critical for the upload process
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
