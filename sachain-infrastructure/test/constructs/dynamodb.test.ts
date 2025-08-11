import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { DynamoDBConstruct } from "../../lib/constructs/dynamodb";

describe("DynamoDBConstruct", () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");
  });

  describe("Table Configuration", () => {
    it("should create DynamoDB table with correct basic configuration", () => {
      // Arrange & Act
      const construct = new DynamoDBConstruct(stack, "TestDynamoDB", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
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
        AttributeDefinitions: [
          {
            AttributeName: "PK",
            AttributeType: "S",
          },
          {
            AttributeName: "SK",
            AttributeType: "S",
          },
          {
            AttributeName: "GSI1PK",
            AttributeType: "S",
          },
          {
            AttributeName: "GSI1SK",
            AttributeType: "S",
          },
          {
            AttributeName: "GSI2PK",
            AttributeType: "S",
          },
          {
            AttributeName: "GSI2SK",
            AttributeType: "S",
          },
        ],
        BillingMode: "PAY_PER_REQUEST",
      });

      expect(construct.table).toBeDefined();
    });

    it("should enable encryption at rest", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestDynamoDB", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        SSESpecification: {
          SSEEnabled: true,
        },
      });
    });

    it("should enable point-in-time recovery", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestDynamoDB", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      });
    });

    it("should enable DynamoDB streams", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestDynamoDB", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        StreamSpecification: {
          StreamViewType: "NEW_AND_OLD_IMAGES",
        },
      });
    });
  });

  describe("Global Secondary Indexes", () => {
    it("should create GSI1 for KYC status queries", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestDynamoDB", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
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
    });

    it("should create GSI2 for document status queries", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestDynamoDB", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert - GSI2 is already tested in the previous test
      // This test verifies the specific purpose of GSI2
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        GlobalSecondaryIndexes: [
          {
            IndexName: "GSI1",
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
          },
        ],
      });
    });
  });

  describe("Environment-specific Configuration", () => {
    it("should use RETAIN removal policy for production environment", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestDynamoDB", {
        environment: "prod",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResource("AWS::DynamoDB::Table", {
        DeletionPolicy: "Retain",
      });
    });

    it("should use DESTROY removal policy for non-production environments", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestDynamoDB", {
        environment: "dev",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResource("AWS::DynamoDB::Table", {
        DeletionPolicy: "Delete",
      });
    });

    it("should include correct table name with environment suffix", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestDynamoDB", {
        environment: "staging",
      });

      const template = Template.fromStack(stack);

      // Assert
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        TableName: "sachain-kyc-table-staging",
      });
    });
  });

  describe("Resource Tags", () => {
    it("should apply correct tags to the table", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestDynamoDB", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert
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
    });
  });

  describe("Access Patterns Validation", () => {
    it("should support user profile access pattern", () => {
      // Arrange & Act
      const construct = new DynamoDBConstruct(stack, "TestDynamoDB", {
        environment: "test",
      });

      // Assert - Verify the table has the correct key structure for user profiles
      // Access pattern: PK=USER#${userId}, SK=PROFILE
      expect(construct.table.schema()).toEqual({
        partitionKey: {
          name: "PK",
          type: cdk.aws_dynamodb.AttributeType.STRING,
        },
        sortKey: { name: "SK", type: cdk.aws_dynamodb.AttributeType.STRING },
      });
    });

    it("should support KYC document access pattern", () => {
      // Arrange & Act
      const construct = new DynamoDBConstruct(stack, "TestDynamoDB", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert - Verify GSI structure supports document queries
      // Access pattern: GSI2PK=DOCUMENT_STATUS#${status}, GSI2SK=${uploadedAt}
      template.hasResourceProperties("AWS::DynamoDB::Table", {
        GlobalSecondaryIndexes: [
          {
            IndexName: "GSI1",
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
          },
        ],
      });
    });

    it("should support KYC status queries access pattern", () => {
      // Arrange & Act
      const construct = new DynamoDBConstruct(stack, "TestDynamoDB", {
        environment: "test",
      });

      const template = Template.fromStack(stack);

      // Assert - Verify GSI1 structure supports status queries
      // Access pattern: GSI1PK=KYC_STATUS#${status}, GSI1SK=${createdAt}
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
          },
        ],
      });
    });
  });
});
