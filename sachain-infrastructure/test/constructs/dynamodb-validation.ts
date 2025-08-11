import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { DynamoDBConstruct } from "../../lib/constructs/dynamodb";

/**
 * Validation script for DynamoDB construct
 * This validates the construct configuration without relying on Jest
 */

function validateDynamoDBConstruct() {
  console.log("🧪 Starting DynamoDB construct validation...");

  // Create test stack
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");

  // Create construct
  const construct = new DynamoDBConstruct(stack, "TestDynamoDB", {
    environment: "test",
  });

  // Generate CloudFormation template
  const template = Template.fromStack(stack);

  // Validation 1: Basic table configuration
  console.log("✅ Validating basic table configuration...");
  template.hasResourceProperties("AWS::DynamoDB::Table", {
    TableName: "sachain-kyc-table-test",
    KeySchema: [
      {
        AttributeName: "PK",
        KeyType: "HASH",
      },
      {
        AttributeName: "SK",
        KeyType: "RANGE",
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  });

  // Validation 2: Encryption at rest
  console.log("✅ Validating encryption at rest...");
  template.hasResourceProperties("AWS::DynamoDB::Table", {
    SSESpecification: {
      SSEEnabled: true,
    },
  });

  // Validation 3: Point-in-time recovery
  console.log("✅ Validating point-in-time recovery...");
  template.hasResourceProperties("AWS::DynamoDB::Table", {
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true,
    },
  });

  // Validation 4: DynamoDB streams
  console.log("✅ Validating DynamoDB streams...");
  template.hasResourceProperties("AWS::DynamoDB::Table", {
    StreamSpecification: {
      StreamViewType: "NEW_AND_OLD_IMAGES",
    },
  });

  // Validation 5: Global Secondary Indexes
  console.log("✅ Validating Global Secondary Indexes...");
  template.hasResourceProperties("AWS::DynamoDB::Table", {
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1",
        KeySchema: [
          {
            AttributeName: "GSI1PK",
            KeyType: "HASH",
          },
          {
            AttributeName: "GSI1SK",
            KeyType: "RANGE",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
      {
        IndexName: "GSI2",
        KeySchema: [
          {
            AttributeName: "GSI2PK",
            KeyType: "HASH",
          },
          {
            AttributeName: "GSI2SK",
            KeyType: "RANGE",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
    ],
  });

  // Validation 6: Environment-specific configuration
  console.log("✅ Validating environment-specific configuration...");

  // Test production environment
  const prodStack = new cdk.Stack(app, "ProdTestStack");
  new DynamoDBConstruct(prodStack, "ProdTestDynamoDB", {
    environment: "prod",
  });
  const prodTemplate = Template.fromStack(prodStack);

  prodTemplate.hasResource("AWS::DynamoDB::Table", {
    DeletionPolicy: "Retain",
  });

  // Validation 7: Resource tags
  console.log("✅ Validating resource tags...");
  template.hasResourceProperties("AWS::DynamoDB::Table", {
    Tags: [
      {
        Key: "Component",
        Value: "DynamoDB",
      },
      {
        Key: "Purpose",
        Value: "KYC-UserData",
      },
      {
        Key: "Environment",
        Value: "test",
      },
    ],
  });

  // Validation 8: Construct properties
  console.log("✅ Validating construct properties...");
  if (!construct.table) {
    throw new Error("Table property is not defined");
  }

  if (construct.table.schema().partitionKey.name !== "PK") {
    throw new Error("Partition key name is incorrect");
  }

  if (construct.table.schema().sortKey?.name !== "SK") {
    throw new Error("Sort key name is incorrect");
  }

  console.log("🎉 All DynamoDB construct validations passed!");
  return true;
}

// Run validation
try {
  validateDynamoDBConstruct();
  process.exit(0);
} catch (error) {
  console.error("❌ Validation failed:", error);
  process.exit(1);
}
