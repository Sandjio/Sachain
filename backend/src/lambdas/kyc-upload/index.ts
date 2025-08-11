import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
// Removed S3UploadUtility import to avoid dependency issues
import { KYCDocumentRepository } from "../../repositories/kyc-document-repository";
import { ExponentialBackoff } from "../../utils/retry";
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

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("KYC Upload Lambda triggered", { 
    path: event.path,
    httpMethod: event.httpMethod,
    headers: event.headers 
  });

  try {
    const path = event.path;
    
    if (path.includes("/presigned-url") && event.httpMethod === "POST") {
      return await handlePresignedUrl(event);
    } else if (path.includes("/upload") && event.httpMethod === "POST") {
      return await handleDirectUpload(event);
    } else if (path.includes("/process-upload") && event.httpMethod === "POST") {
      return await handleUploadProcessing(event);
    }

    return {
      statusCode: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Endpoint not found" }),
    };
  } catch (error) {
    console.error("Error in KYC Upload Lambda:", error);
    
    await putMetric("UploadError", 1);
    
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ 
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error"
      }),
    };
  }
};

async function handlePresignedUrl(event: APIGatewayProxyEvent): Promise<any> {
  const request: PresignedUrlRequest = JSON.parse(event.body || '{}');
  
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
  const retry = new ExponentialBackoff({
    maxRetries: 3,
    baseDelay: 200,
    maxDelay: 5000,
    jitterType: "full",
  });

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
    () => docClient.send(
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
  const request: DirectUploadRequest = JSON.parse(event.body || '{}');
  
  // Validate request
  const validation = validateDirectUploadRequest(request);
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
  
  try {
    // Initialize KYC document repository
    const kycRepo = new KYCDocumentRepository({
      tableName: TABLE_NAME,
      region: process.env.AWS_REGION || 'us-east-1',
    });

    // Decode base64 file content
    const fileBuffer = Buffer.from(request.fileContent, 'base64');
    
    // Validate file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ 
          message: `File size ${fileBuffer.length} bytes exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes` 
        }),
      };
    }

    // Validate file type and format
    const validation = validateFileContent(fileBuffer, request.fileName, request.contentType);
    if (!validation.isValid) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ 
          message: validation.error 
        }),
      };
    }

    // Generate unique S3 key
    const s3Key = generateS3Key(request.userId, request.documentType, request.fileName, documentId);

    // Upload file to S3 with retry logic
    const retry = new ExponentialBackoff({
      maxRetries: 3,
      baseDelay: 200,
      maxDelay: 5000,
      jitterType: "full",
    });

    await retry.execute(
      () => s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: request.contentType,
          ServerSideEncryption: "aws:kms",
          ...(process.env.KMS_KEY_ID && { SSEKMSKeyId: process.env.KMS_KEY_ID }),
          Metadata: {
            "original-filename": request.fileName,
            "user-id": request.userId,
            "document-type": request.documentType,
            "document-id": documentId,
            "upload-timestamp": timestamp,
          },
          Tagging: `user-id=${request.userId}&document-type=${request.documentType}&data-classification=sensitive&purpose=kyc-verification`,
        })
      ),
      `S3Upload-${documentId}`
    );

    // Create KYC document record in DynamoDB
    const kycDocument = await kycRepo.createKYCDocument({
      userId: request.userId,
      documentType: 'national_id', // Map to model type
      s3Bucket: BUCKET_NAME,
      s3Key: s3Key,
      originalFileName: request.fileName,
      fileSize: fileBuffer.length,
      mimeType: request.contentType,
    });

    await putMetric("DirectUploadSuccess", 1);

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
    console.error("Error in direct upload:", error);
    await putMetric("DirectUploadError", 1);
    
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ 
        message: "Internal server error during upload",
        error: error instanceof Error ? error.message : "Unknown error"
      }),
    };
  }
}

function validateUploadRequest(request: any): { isValid: boolean; error?: string } {
  if (!request.documentType || !DOCUMENT_TYPES.includes(request.documentType)) {
    return { isValid: false, error: "Invalid document type" };
  }

  if (!request.fileName || typeof request.fileName !== "string") {
    return { isValid: false, error: "Invalid file name" };
  }

  if (!request.contentType || !ALLOWED_FILE_TYPES.includes(request.contentType as any)) {
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

function validateDirectUploadRequest(request: any): { isValid: boolean; error?: string } {
  // First validate common fields
  const baseValidation = validateUploadRequest(request);
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  // Validate file content
  if (!request.fileContent || typeof request.fileContent !== "string") {
    return { isValid: false, error: "Missing or invalid file content" };
  }

  // Validate base64 format
  try {
    const buffer = Buffer.from(request.fileContent, 'base64');
    if (buffer.length === 0) {
      return { isValid: false, error: "Empty file content" };
    }
  } catch (error) {
    return { isValid: false, error: "Invalid base64 file content" };
  }

  return { isValid: true };
}

function validateFileContent(fileBuffer: Buffer, fileName: string, contentType: string): { isValid: boolean; error?: string } {
  // Check file header for basic format verification
  if (fileBuffer.length < 4) {
    return { isValid: false, error: "File is too small to validate format" };
  }

  const header = fileBuffer.subarray(0, 8);

  switch (contentType) {
    case "image/jpeg":
      if (header[0] !== 0xff || header[1] !== 0xd8) {
        return { isValid: false, error: "File does not appear to be a valid JPEG image" };
      }
      break;

    case "image/png":
      if (header[0] !== 0x89 || header[1] !== 0x50 || header[2] !== 0x4e || header[3] !== 0x47) {
        return { isValid: false, error: "File does not appear to be a valid PNG image" };
      }
      break;

    case "application/pdf":
      if (header[0] !== 0x25 || header[1] !== 0x50 || header[2] !== 0x44 || header[3] !== 0x46) {
        return { isValid: false, error: "File does not appear to be a valid PDF document" };
      }
      break;
  }

  return { isValid: true };
}

function generateS3Key(userId: string, documentType: string, fileName: string, documentId: string): string {
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
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
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

async function handleUploadProcessing(event: APIGatewayProxyEvent): Promise<any> {
  const request: UploadProcessingRequest = JSON.parse(event.body || '{}');
  
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
      region: process.env.AWS_REGION || 'us-east-1',
    });

    // Update document with actual file size and change status to pending review
    const document = await kycRepo.getKYCDocument(request.userId, request.documentId);
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
        status: "pending_review"
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
        error: error instanceof Error ? error.message : "Unknown error"
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
    const message = {
      subject: "New KYC Document Uploaded - Review Required",
      documentId: data.documentId,
      userId: data.userId,
      documentType: data.documentType,
      fileName: data.fileName,
      uploadedAt: data.uploadedAt,
      reviewUrl: `${process.env.ADMIN_PORTAL_URL}/kyc/review/${data.documentId}`,
      timestamp: new Date().toISOString(),
    };

    await snsClient.send(
      new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify(message),
        Subject: "KYC Document Review Required",
        MessageAttributes: {
          documentType: {
            DataType: "String",
            StringValue: data.documentType,
          },
          userId: {
            DataType: "String",
            StringValue: data.userId,
          },
          priority: {
            DataType: "String",
            StringValue: "normal",
          },
        },
      })
    );

    console.log("Admin notification sent successfully", {
      documentId: data.documentId,
      userId: data.userId,
    });
  } catch (error) {
    console.error("Failed to send admin notification:", error);
    // Don't throw error as this is not critical for the upload process
  }
}

async function putMetric(metricName: string, value: number): Promise<void> {
  try {
    await cloudWatchClient.send(
      new PutMetricDataCommand({
        Namespace: "Sachain/KYCUpload",
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: "Count",
            Dimensions: [
              {
                Name: "Environment",
                Value: ENVIRONMENT,
              },
            ],
          },
        ],
      })
    );
  } catch (error) {
    console.error("Failed to put CloudWatch metric:", error);
  }
}