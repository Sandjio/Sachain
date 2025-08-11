import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import {
  UploadRequest,
  PresignedUrlRequest,
  UploadResponse,
  KYCDocument,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  DOCUMENT_TYPES,
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

  // Create document record in DynamoDB
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

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: document,
    })
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
  // This would handle direct file upload via API Gateway
  // For now, return method not implemented
  return {
    statusCode: 501,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ 
      message: "Direct upload not implemented. Use presigned URL endpoint." 
    }),
  };
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

  return { isValid: true };
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