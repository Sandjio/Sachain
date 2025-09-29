import { App, Stack } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { DynamoDBConstruct } from "../../lib/constructs/dynamodb";
import { EnvironmentType } from "../../lib/types";

describe("DynamoDBConstruct", () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "TestStack");
  });

  describe("Table Configuration", () => {
    test("should create a DynamoDB GlobalTable with correct partition and sort keys", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestConstruct", {
        environment: "dev",
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties("AWS::DynamoDB::GlobalTable", {
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
        AttributeDefinitions: Match.arrayWith([
          {
            AttributeName: "PK",
            AttributeType: "S",
          },
          {
            AttributeName: "SK",
            AttributeType: "S",
          },
        ]),
      });
    });

    test("should use on-demand billing mode", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestConstruct", {
        environment: "dev",
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties("AWS::DynamoDB::GlobalTable", {
        BillingMode: "PAY_PER_REQUEST",
      });
    });

    test("should use AWS owned key encryption", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestConstruct", {
        environment: "dev",
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties("AWS::DynamoDB::GlobalTable", {
        SSESpecification: {
          SSEEnabled: false,
        },
      });
    });
  });

  describe("Environment-specific configurations", () => {
    describe("Production environment", () => {
      test("should enable point-in-time recovery", () => {
        // Arrange & Act
        new DynamoDBConstruct(stack, "TestConstruct", {
          environment: "prod",
        });

        // Assert
        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::DynamoDB::GlobalTable", {
          Replicas: Match.arrayWith([
            Match.objectLike({
              PointInTimeRecoverySpecification: {
                PointInTimeRecoveryEnabled: true,
              },
            }),
          ]),
        });
      });

      test("should enable deletion protection", () => {
        // Arrange & Act
        new DynamoDBConstruct(stack, "TestConstruct", {
          environment: "prod",
        });

        // Assert
        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::DynamoDB::GlobalTable", {
          Replicas: Match.arrayWith([
            Match.objectLike({
              DeletionProtectionEnabled: true,
            }),
          ]),
        });
      });

      test("should set removal policy to RETAIN", () => {
        // Arrange & Act
        new DynamoDBConstruct(stack, "TestConstruct", {
          environment: "prod",
        });

        // Assert
        const template = Template.fromStack(stack);
        template.hasResource("AWS::DynamoDB::GlobalTable", {
          DeletionPolicy: "Retain",
          UpdateReplacePolicy: "Retain",
        });
      });
    });

    describe("Non-production environments", () => {
      const nonProdEnvironments: EnvironmentType[] = ["dev", "staging"];

      test.each(nonProdEnvironments)(
        "should disable point-in-time recovery for %s environment",
        (env) => {
          // Arrange & Act
          new DynamoDBConstruct(stack, "TestConstruct", {
            environment: env,
          });

          // Assert
          const template = Template.fromStack(stack);
          template.hasResourceProperties("AWS::DynamoDB::GlobalTable", {
            Replicas: Match.arrayWith([
              Match.objectLike({
                PointInTimeRecoverySpecification: {
                  PointInTimeRecoveryEnabled: false,
                },
              }),
            ]),
          });
        }
      );

      test.each(nonProdEnvironments)(
        "should disable deletion protection for %s environment",
        (env) => {
          // Arrange & Act
          new DynamoDBConstruct(stack, "TestConstruct", {
            environment: env,
          });

          // Assert
          const template = Template.fromStack(stack);
          template.hasResourceProperties("AWS::DynamoDB::GlobalTable", {
            Replicas: Match.arrayWith([
              Match.objectLike({
                DeletionProtectionEnabled: false,
              }),
            ]),
          });
        }
      );

      test.each(nonProdEnvironments)(
        "should set removal policy to DESTROY for %s environment",
        (env) => {
          // Arrange & Act
          new DynamoDBConstruct(stack, "TestConstruct", {
            environment: env,
          });

          // Assert
          const template = Template.fromStack(stack);
          template.hasResource("AWS::DynamoDB::GlobalTable", {
            DeletionPolicy: "Delete",
            UpdateReplacePolicy: "Delete",
          });
        }
      );
    });
  });

  describe("Tagging", () => {
    const environments: EnvironmentType[] = ["dev", "staging", "prod"];

    test.each(environments)(
      "should apply correct tags for %s environment",
      (env) => {
        // Arrange & Act
        new DynamoDBConstruct(stack, "TestConstruct", {
          environment: env,
        });

        // Assert
        const template = Template.fromStack(stack);
        // Check individual tags in replicas
        template.hasResourceProperties("AWS::DynamoDB::GlobalTable", {
          Replicas: Match.arrayWith([
            Match.objectLike({
              Tags: Match.arrayWith([{ Key: "Component", Value: "DynamoDB" }]),
            }),
          ]),
        });
        template.hasResourceProperties("AWS::DynamoDB::GlobalTable", {
          Replicas: Match.arrayWith([
            Match.objectLike({
              Tags: Match.arrayWith([
                { Key: "Purpose", Value: "SachainSingleTableDesign" },
              ]),
            }),
          ]),
        });
        template.hasResourceProperties("AWS::DynamoDB::GlobalTable", {
          Replicas: Match.arrayWith([
            Match.objectLike({
              Tags: Match.arrayWith([{ Key: "Environment", Value: env }]),
            }),
          ]),
        });
      }
    );
  });

  describe("Input validation", () => {
    test("should throw error for invalid environment", () => {
      // Arrange & Act & Assert
      expect(() => {
        // Create a props object that bypasses TypeScript checking
        const props = { environment: "invalid" };
        new DynamoDBConstruct(stack, "TestConstruct", props as any);
      }).toThrow(
        'Invalid environment "invalid". Must be one of: dev, staging, prod'
      );
    });

    test("should accept valid environments", () => {
      // Arrange
      const validEnvironments: EnvironmentType[] = ["dev", "staging", "prod"];

      // Act & Assert
      validEnvironments.forEach((env) => {
        const testStack = new Stack(app, `Stack-${env}`);
        expect(() => {
          new DynamoDBConstruct(testStack, "TestConstruct", {
            environment: env,
          });
        }).not.toThrow();
      });
    });
  });

  describe("Public API", () => {
    test("should expose table property", () => {
      // Arrange & Act
      const construct = new DynamoDBConstruct(stack, "TestConstruct", {
        environment: "dev",
      });

      // Assert
      expect(construct.table).toBeDefined();
      expect(construct.table.tableName).toBeDefined();
      expect(construct.table.tableArn).toBeDefined();
    });
  });

  describe("Snapshot tests", () => {
    test.each(["dev", "staging", "prod"] as EnvironmentType[])(
      "should match snapshot for %s environment",
      (env) => {
        // Arrange & Act
        new DynamoDBConstruct(stack, "TestConstruct", {
          environment: env,
        });

        // Assert
        const template = Template.fromStack(stack);
        expect(template.toJSON()).toMatchSnapshot(`dynamodb-${env}`);
      }
    );
  });

  describe("Integration with Stack", () => {
    test("should integrate correctly with parent stack", () => {
      // Arrange
      const customStack = new Stack(app, "CustomStack", {
        env: {
          account: "123456789012",
          region: "us-east-1",
        },
      });

      // Act
      const construct = new DynamoDBConstruct(customStack, "TestConstruct", {
        environment: "prod",
      });

      // Assert
      expect(construct.node.scope).toBe(customStack);
      expect(customStack.node.children).toContain(construct);
    });

    test("should allow multiple instances in same stack", () => {
      // Arrange & Act
      const construct1 = new DynamoDBConstruct(stack, "Construct1", {
        environment: "dev",
      });
      const construct2 = new DynamoDBConstruct(stack, "Construct2", {
        environment: "dev",
      });

      // Assert
      expect(construct1.table.tableName).not.toBe(construct2.table.tableName);
      const template = Template.fromStack(stack);
      template.resourceCountIs("AWS::DynamoDB::GlobalTable", 2);
    });
  });

  describe("CloudFormation output validation", () => {
    test("should generate valid CloudFormation template", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestConstruct", {
        environment: "prod",
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify the template has the expected structure
      expect(() => template.toJSON()).not.toThrow();

      // Verify essential CloudFormation sections exist
      const json = template.toJSON();
      expect(json).toHaveProperty("Resources");
      expect(Object.keys(json.Resources).length).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    test("should handle construct with minimum ID length", () => {
      // Arrange & Act & Assert
      expect(() => {
        new DynamoDBConstruct(stack, "A", {
          environment: "dev",
        });
      }).not.toThrow();
    });

    test("should handle construct with very long ID", () => {
      // Arrange
      const longId = "A".repeat(100);

      // Act & Assert
      expect(() => {
        new DynamoDBConstruct(stack, longId, {
          environment: "dev",
        });
      }).not.toThrow();
    });

    test("should maintain construct tree hierarchy", () => {
      // Arrange & Act
      const construct = new DynamoDBConstruct(stack, "TestConstruct", {
        environment: "dev",
      });

      // Assert
      expect(construct.node.path).toBe("TestStack/TestConstruct");
      expect(construct.table.node.path).toBe(
        "TestStack/TestConstruct/SachainTable"
      );
    });
  });

  describe("Security configurations", () => {
    test("should enforce encryption at rest", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestConstruct", {
        environment: "prod",
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify encryption is configured (AWS owned key = SSEEnabled: false)
      template.hasResourceProperties("AWS::DynamoDB::GlobalTable", {
        SSESpecification: Match.objectLike({
          SSEEnabled: false,
        }),
      });
    });
  });

  describe("Performance and cost optimization", () => {
    test("should use on-demand billing for cost optimization", () => {
      // Arrange & Act
      new DynamoDBConstruct(stack, "TestConstruct", {
        environment: "dev",
      });

      // Assert
      const template = Template.fromStack(stack);

      // Verify on-demand billing is set
      template.hasResourceProperties("AWS::DynamoDB::GlobalTable", {
        BillingMode: "PAY_PER_REQUEST",
      });

      // Ensure no provisioned throughput is set
      template.hasResourceProperties("AWS::DynamoDB::GlobalTable", {
        ProvisionedThroughput: Match.absent(),
      });
    });
  });
});
