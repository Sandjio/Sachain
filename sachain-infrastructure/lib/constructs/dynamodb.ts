import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export interface DynamoDBConstructProps {
  environment: string;
}

export class DynamoDBConstruct extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDBConstructProps) {
    super(scope, id);

    // Single Table Design for KYC and User data
    this.table = new dynamodb.Table(this, "KYCTable", {
      tableName: `sachain-kyc-table-${props.environment}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },

      // Billing mode - On-demand for variable workloads
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,

      // Encryption at rest using AWS managed keys
      encryption: dynamodb.TableEncryption.AWS_MANAGED,

      // Point-in-time recovery for data protection
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },

      // Deletion protection for production
      removalPolicy:
        props.environment === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,

      // Stream for change data capture (if needed for audit logs)
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI1: For querying users by KYC status
    // Access pattern: Get all users with specific KYC status
    this.table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: For querying documents by status and upload date
    // Access pattern: Get all documents with specific status, ordered by upload date
    this.table.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: { name: "GSI2PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI2SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add tags for resource management
    cdk.Tags.of(this.table).add("Component", "DynamoDB");
    cdk.Tags.of(this.table).add("Purpose", "KYC-UserData");
    cdk.Tags.of(this.table).add("Environment", props.environment);
  }
}
