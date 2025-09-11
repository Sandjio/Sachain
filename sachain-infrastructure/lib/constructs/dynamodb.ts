/**
 * DynamoDB Construct for Sachain Infrastructure
 * Provisions a DynamoDB table using Single Table Design (STD).
 * The configuration adapts to the environment (`dev`, `staging`, `prod`)
 * to balance **developer agility** and **production safety**.
 *
 *  * ## Features
 * - PK + SK schema for multi-entity storage
 * - On-demand billing for unpredictable workloads
 * - AWS-owned encryption at rest
 * - PITR and deletion protection only in production
 * - Automatic tagging for governance
 *
 *  * ## Environment Behaviors
 * - `dev`: destroyable table, PITR off, deletion protection off
 * - `staging`: destroyable table, PITR off, deletion protection off
 * - `prod`: retain table, PITR on, deletion protection on
 */

import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { EnvironmentType } from "../types";

export interface DynamoDBConstructProps {
  environment: EnvironmentType;
}

export class DynamoDBConstruct extends Construct {
  public readonly table: dynamodb.TableV2;

  constructor(scope: Construct, id: string, props: DynamoDBConstructProps) {
    super(scope, id);

    const allowedEnvs = ["dev", "staging", "prod"];
    if (!allowedEnvs.includes(props.environment)) {
      throw new Error(
        `Invalid environment "${
          props.environment
        }". Must be one of: ${allowedEnvs.join(", ")}`
      );
    }

    // Single Table Design for Sachain
    this.table = new dynamodb.TableV2(this, "SachainTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },

      // Billing mode - On-demand for variable workloads
      billing: dynamodb.Billing.onDemand(),

      // Encryption at rest using AWS owned keys
      encryption: dynamodb.TableEncryptionV2.dynamoOwnedKey(),

      // Point-in-time recovery for data protection
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: props.environment === "prod" ? true : false,
      },

      // Deletion protection for production
      deletionProtection: props.environment === "prod" ? true : false,

      // Removal policy protection for production
      removalPolicy:
        props.environment === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,

      // Stream for change data capture (if needed for audit logs)
      // stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI1: For querying users by KYC status
    // Access pattern: Get all users with specific KYC status
    // this.table.addGlobalSecondaryIndex({
    //   indexName: "GSI1",
    //   partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
    //   sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
    //   projectionType: dynamodb.ProjectionType.ALL,
    // });

    // GSI2: For querying documents by status and upload date
    // Access pattern: Get all documents with specific status, ordered by upload date
    // this.table.addGlobalSecondaryIndex({
    //   indexName: "GSI2",
    //   partitionKey: { name: "GSI2PK", type: dynamodb.AttributeType.STRING },
    //   sortKey: { name: "GSI2SK", type: dynamodb.AttributeType.STRING },
    //   projectionType: dynamodb.ProjectionType.ALL,
    // });

    // GSI3: For querying projects by status and creation date
    // Access pattern: Get all projects with specific status, ordered by creation date
    this.table.addGlobalSecondaryIndex({
      indexName: "GSI3",
      partitionKey: { name: "GSI3PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI3SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI4: For querying stocks by owner wallet address
    // Access pattern: Get all stocks owned by specific wallet address
    // this.table.addGlobalSecondaryIndex({
    //   indexName: "GSI4",
    //   partitionKey: { name: "GSI4PK", type: dynamodb.AttributeType.STRING },
    //   sortKey: { name: "GSI4SK", type: dynamodb.AttributeType.STRING },
    //   projectionType: dynamodb.ProjectionType.ALL,
    // });

    // Add tags for resource management
    cdk.Tags.of(this.table).add("Component", "DynamoDB");
    cdk.Tags.of(this.table).add("Purpose", "SachainSingleTableDesign");
    cdk.Tags.of(this.table).add("Environment", props.environment);
  }
}
