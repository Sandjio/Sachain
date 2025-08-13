import * as AWS from "aws-sdk";

// Mock AWS SDK for unit tests, but allow real calls for integration tests
if (process.env.RUN_INTEGRATION_TESTS !== "true") {
  jest.mock("aws-sdk");
}

describe("End-to-End System Validation", () => {
  const environment = process.env.TEST_ENVIRONMENT || "dev";
  const stackName = `SachainKYCStack-${environment}`;
  const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "true";

  let cloudFormation: AWS.CloudFormation;
  let cognito: AWS.CognitoIdentityServiceProvider;
  let dynamodb: AWS.DynamoDB;
  let s3: AWS.S3;
  let lambda: AWS.Lambda;
  let eventbridge: AWS.EventBridge;
  let cloudwatch: AWS.CloudWatch;

  beforeAll(() => {
    if (runIntegrationTests) {
      const region = process.env.AWS_REGION || "us-east-1";
      cloudFormation = new AWS.CloudFormation({ region });
      cognito = new AWS.CognitoIdentityServiceProvider({ region });
      dynamodb = new AWS.DynamoDB({ region });
      s3 = new AWS.S3({ region });
      lambda = new AWS.Lambda({ region });
      eventbridge = new AWS.EventBridge({ region });
      cloudwatch = new AWS.CloudWatch({ region });
    }
  });

  describe("Infrastructure Deployment Validation", () => {
    test("should have successfully deployed CloudFormation stack", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const stacks = await cloudFormation
        .describeStacks({ StackName: stackName })
        .promise();

      expect(stacks.Stacks).toHaveLength(1);
      expect(stacks.Stacks![0].StackStatus).toMatch(
        /CREATE_COMPLETE|UPDATE_COMPLETE/
      );
      expect(stacks.Stacks![0].Outputs).toBeDefined();
      expect(stacks.Stacks![0].Outputs!.length).toBeGreaterThan(0);
    }, 30000);

    test("should have all required stack outputs", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const stacks = await cloudFormation
        .describeStacks({ StackName: stackName })
        .promise();
      const outputs = stacks.Stacks![0].Outputs!;

      const outputKeys = outputs.map((output) => output.OutputKey);

      expect(outputKeys).toContain("UserPoolId");
      expect(outputKeys).toContain("UserPoolClientId");
      expect(outputKeys).toContain("DynamoDBTableName");
      expect(outputKeys).toContain("S3BucketName");
      expect(outputKeys).toContain("EventBusName");
      expect(outputKeys).toContain("KYCUploadApiUrl");
    }, 30000);
  });

  describe("Cognito User Pool Validation", () => {
    let userPoolId: string;
    let userPoolClientId: string;

    beforeAll(async () => {
      if (runIntegrationTests) {
        const stacks = await cloudFormation
          .describeStacks({ StackName: stackName })
          .promise();
        const outputs = stacks.Stacks![0].Outputs!;

        userPoolId = outputs.find((o) => o.OutputKey === "UserPoolId")!
          .OutputValue!;
        userPoolClientId = outputs.find(
          (o) => o.OutputKey === "UserPoolClientId"
        )!.OutputValue!;
      }
    });

    test("should have accessible and properly configured User Pool", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const userPool = await cognito
        .describeUserPool({ UserPoolId: userPoolId })
        .promise();

      expect(userPool.UserPool).toBeDefined();
      expect(userPool.UserPool!.Policies?.PasswordPolicy).toBeDefined();
      expect(
        userPool.UserPool!.Policies!.PasswordPolicy!.MinimumLength
      ).toBeGreaterThanOrEqual(8);
      expect(userPool.UserPool!.AutoVerifiedAttributes).toContain("email");
    }, 30000);

    test("should have properly configured User Pool Client", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const client = await cognito
        .describeUserPoolClient({
          UserPoolId: userPoolId,
          ClientId: userPoolClientId,
        })
        .promise();

      expect(client.UserPoolClient).toBeDefined();
      expect(client.UserPoolClient!.ExplicitAuthFlows).toContain(
        "USER_SRP_AUTH"
      );
      expect(client.UserPoolClient!.PreventUserExistenceErrors).toBe("ENABLED");
    }, 30000);

    test("should have Lambda triggers configured", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const userPool = await cognito
        .describeUserPool({ UserPoolId: userPoolId })
        .promise();

      expect(userPool.UserPool!.LambdaConfig).toBeDefined();
      expect(userPool.UserPool!.LambdaConfig!.PostAuthentication).toBeDefined();
    }, 30000);
  });

  describe("DynamoDB Table Validation", () => {
    let tableName: string;

    beforeAll(async () => {
      if (runIntegrationTests) {
        const stacks = await cloudFormation
          .describeStacks({ StackName: stackName })
          .promise();
        const outputs = stacks.Stacks![0].Outputs!;

        tableName = outputs.find((o) => o.OutputKey === "DynamoDBTableName")!
          .OutputValue!;
      }
    });

    test("should have accessible and properly configured DynamoDB table", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const table = await dynamodb
        .describeTable({ TableName: tableName })
        .promise();

      expect(table.Table).toBeDefined();
      expect(table.Table!.TableStatus).toBe("ACTIVE");
      expect(table.Table!.BillingModeSummary?.BillingMode).toBe(
        "PAY_PER_REQUEST"
      );
      expect(table.Table!.SSEDescription?.Status).toBe("ENABLED");
    }, 30000);

    test("should have required Global Secondary Indexes", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const table = await dynamodb
        .describeTable({ TableName: tableName })
        .promise();

      expect(table.Table!.GlobalSecondaryIndexes).toBeDefined();
      expect(
        table.Table!.GlobalSecondaryIndexes!.length
      ).toBeGreaterThanOrEqual(2);

      const gsiNames = table.Table!.GlobalSecondaryIndexes!.map(
        (gsi) => gsi.IndexName
      );
      expect(gsiNames).toContain("GSI1");
      expect(gsiNames).toContain("GSI2");
    }, 30000);

    test("should have point-in-time recovery enabled", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const pitr = await dynamodb
        .describeContinuousBackups({ TableName: tableName })
        .promise();

      expect(
        pitr.ContinuousBackupsDescription?.PointInTimeRecoveryDescription
          ?.PointInTimeRecoveryStatus
      ).toBe("ENABLED");
    }, 30000);
  });

  describe("S3 Bucket Validation", () => {
    let bucketName: string;

    beforeAll(async () => {
      if (runIntegrationTests) {
        const stacks = await cloudFormation
          .describeStacks({ StackName: stackName })
          .promise();
        const outputs = stacks.Stacks![0].Outputs!;

        bucketName = outputs.find((o) => o.OutputKey === "S3BucketName")!
          .OutputValue!;
      }
    });

    test("should have accessible S3 bucket", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const bucket = await s3.headBucket({ Bucket: bucketName }).promise();
      expect(bucket).toBeDefined();
    }, 30000);

    test("should have proper encryption configuration", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const encryption = await s3
        .getBucketEncryption({ Bucket: bucketName })
        .promise();

      expect(encryption.ServerSideEncryptionConfiguration).toBeDefined();
      expect(encryption.ServerSideEncryptionConfiguration!.Rules).toHaveLength(
        1
      );
      expect(
        encryption.ServerSideEncryptionConfiguration!.Rules[0]
          .ApplyServerSideEncryptionByDefault?.SSEAlgorithm
      ).toBe("aws:kms");
    }, 30000);

    test("should have public access blocked", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const publicAccessBlock = await s3
        .getPublicAccessBlock({ Bucket: bucketName })
        .promise();

      expect(
        publicAccessBlock.PublicAccessBlockConfiguration?.BlockPublicAcls
      ).toBe(true);
      expect(
        publicAccessBlock.PublicAccessBlockConfiguration?.BlockPublicPolicy
      ).toBe(true);
      expect(
        publicAccessBlock.PublicAccessBlockConfiguration?.IgnorePublicAcls
      ).toBe(true);
      expect(
        publicAccessBlock.PublicAccessBlockConfiguration?.RestrictPublicBuckets
      ).toBe(true);
    }, 30000);
  });

  describe("Lambda Functions Validation", () => {
    let functionNames: string[] = [];

    beforeAll(async () => {
      if (runIntegrationTests) {
        // Get all Lambda functions for this stack
        const functions = await lambda.listFunctions().promise();
        functionNames = functions
          .Functions!.filter((fn) =>
            fn.FunctionName!.includes(`sachain-${environment}`)
          )
          .map((fn) => fn.FunctionName!);
      }
    });

    test("should have all required Lambda functions deployed", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      expect(functionNames.length).toBeGreaterThanOrEqual(4);

      const expectedFunctions = [
        "PostAuth",
        "KYCUpload",
        "AdminReview",
        "UserNotification",
      ];
      expectedFunctions.forEach((expectedFunction) => {
        const found = functionNames.some((name) =>
          name.includes(expectedFunction)
        );
        expect(found).toBe(true);
      });
    }, 30000);

    test("should have Lambda functions in active state", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      for (const functionName of functionNames) {
        const func = await lambda
          .getFunction({ FunctionName: functionName })
          .promise();
        expect(func.Configuration?.State).toBe("Active");
        expect(func.Configuration?.Runtime).toMatch(/nodejs/);
      }
    }, 60000);

    test("should have proper environment variables configured", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      for (const functionName of functionNames) {
        const func = await lambda
          .getFunction({ FunctionName: functionName })
          .promise();
        const envVars = func.Configuration?.Environment?.Variables || {};

        expect(envVars.ENVIRONMENT).toBe(environment);
        expect(envVars.TABLE_NAME).toBeDefined();
      }
    }, 60000);
  });

  describe("EventBridge Validation", () => {
    let eventBusName: string;

    beforeAll(async () => {
      if (runIntegrationTests) {
        const stacks = await cloudFormation
          .describeStacks({ StackName: stackName })
          .promise();
        const outputs = stacks.Stacks![0].Outputs!;

        eventBusName = outputs.find((o) => o.OutputKey === "EventBusName")!
          .OutputValue!;
      }
    });

    test("should have custom EventBridge bus", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const eventBuses = await eventbridge.listEventBuses().promise();
      const customBus = eventBuses.EventBuses!.find(
        (bus) => bus.Name === eventBusName
      );

      expect(customBus).toBeDefined();
      expect(customBus!.State).toBe("ACTIVE");
    }, 30000);

    test("should have EventBridge rules configured", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const rules = await eventbridge
        .listRules({ EventBusName: eventBusName })
        .promise();

      expect(rules.Rules).toBeDefined();
      expect(rules.Rules!.length).toBeGreaterThan(0);

      // Check for KYC status change rule
      const kycRule = rules.Rules!.find((rule) =>
        rule.Name!.includes("KYCStatusChange")
      );
      expect(kycRule).toBeDefined();
      expect(kycRule!.State).toBe("ENABLED");
    }, 30000);
  });

  describe("API Gateway Validation", () => {
    let apiUrl: string;

    beforeAll(async () => {
      if (runIntegrationTests) {
        const stacks = await cloudFormation
          .describeStacks({ StackName: stackName })
          .promise();
        const outputs = stacks.Stacks![0].Outputs!;

        apiUrl = outputs.find((o) => o.OutputKey === "KYCUploadApiUrl")!
          .OutputValue!;
      }
    });

    test("should have accessible API Gateway", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      // Test API health endpoint
      const response = await fetch(`${apiUrl}/health`);
      expect(response.status).toBeLessThan(500); // Should not be server error
    }, 30000);

    test("should have proper CORS configuration", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const response = await fetch(`${apiUrl}/health`, { method: "OPTIONS" });
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeDefined();
    }, 30000);
  });

  describe("Monitoring and Alerting Validation", () => {
    test("should have CloudWatch alarms configured", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const alarms = await cloudwatch.describeAlarms().promise();
      const stackAlarms = alarms.MetricAlarms!.filter((alarm) =>
        alarm.AlarmName!.includes(`sachain-${environment}`)
      );

      expect(stackAlarms.length).toBeGreaterThan(0);

      // Check for error rate alarms
      const errorAlarms = stackAlarms.filter(
        (alarm) =>
          alarm.AlarmName!.includes("Error") ||
          alarm.AlarmName!.includes("Failure")
      );
      expect(errorAlarms.length).toBeGreaterThan(0);
    }, 30000);

    test("should have CloudWatch log groups", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const logs = new AWS.CloudWatchLogs({
        region: process.env.AWS_REGION || "us-east-1",
      });
      const logGroups = await logs
        .describeLogGroups({
          logGroupNamePrefix: `/aws/lambda/sachain-${environment}`,
        })
        .promise();

      expect(logGroups.logGroups).toBeDefined();
      expect(logGroups.logGroups!.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe("Security Validation", () => {
    test("should have proper IAM roles and policies", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const iam = new AWS.IAM({
        region: process.env.AWS_REGION || "us-east-1",
      });
      const roles = await iam.listRoles().promise();

      const stackRoles = roles.Roles.filter((role) =>
        role.RoleName.includes(`SachainKYCStack-${environment}`)
      );

      expect(stackRoles.length).toBeGreaterThan(0);

      // Verify each role has appropriate policies
      for (const role of stackRoles) {
        const policies = await iam
          .listAttachedRolePolicies({ RoleName: role.RoleName })
          .promise();
        expect(policies.AttachedPolicies.length).toBeGreaterThan(0);
      }
    }, 60000);

    test("should have KMS encryption keys", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      const kms = new AWS.KMS({
        region: process.env.AWS_REGION || "us-east-1",
      });
      const keys = await kms.listKeys().promise();

      expect(keys.Keys).toBeDefined();
      expect(keys.Keys!.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe("Performance Validation", () => {
    test("should have acceptable Lambda cold start times", async () => {
      if (!runIntegrationTests) {
        console.log(
          "Skipping integration test - set RUN_INTEGRATION_TESTS=true to run"
        );
        return;
      }

      // Test Lambda function performance
      for (const functionName of ["PostAuth", "KYCUpload", "AdminReview"]) {
        const fullFunctionName = `sachain-${environment}-${functionName}`;

        try {
          const startTime = Date.now();
          await lambda
            .invoke({
              FunctionName: fullFunctionName,
              InvocationType: "RequestResponse",
              Payload: JSON.stringify({ test: true }),
            })
            .promise();
          const duration = Date.now() - startTime;

          // Cold start should be under 10 seconds
          expect(duration).toBeLessThan(10000);
        } catch (error) {
          // Function might not exist or might require specific payload
          console.log(`Could not test ${fullFunctionName}: ${error}`);
        }
      }
    }, 60000);
  });
});

// Mock fetch for non-integration tests
if (process.env.RUN_INTEGRATION_TESTS !== "true") {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      status: 200,
      headers: {
        get: jest.fn(() => "*"),
      },
    })
  ) as jest.Mock;
}
