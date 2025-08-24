#!/usr/bin/env node
/// <reference types="node" />
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import {
  CoreStack,
  SecurityStack,
  LambdaStack,
  MonitoringStack,
} from "../lib/stacks";
import { getEnvironmentConfig } from "../lib/config";
import {
  CrossStackValidator,
  DependencyResolver,
  CrossStackValidationError,
  StackDeploymentError,
} from "../lib/utils/cross-stack-validator";
import { DeploymentErrorHandler } from "../lib/utils/deployment-error-handler";

const app = new cdk.App();

// Get environment from context or environment variable, default to 'dev'
const environment =
  app.node.tryGetContext("environment") || process.env.ENVIRONMENT || "dev";

// Get AWS account and region from environment variables or CDK defaults
const account = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID;
const region =
  process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || "us-east-1";

// Load environment-specific configuration
const envConfig = getEnvironmentConfig(environment);

// Validate dependency graph before deployment
try {
  DependencyResolver.validateDependencyGraph();
  console.log("✓ Dependency graph validation passed");
} catch (error) {
  console.error("✗ Dependency graph validation failed:", error);
  process.exit(1);
}

// Initialize error handling for all stacks (consolidated structure)
const stackNames = [
  `SachainCoreStack-${environment}`,
  `SachainSecurityStack-${environment}`,
  `SachainLambdaStack-${environment}`,
  `SachainMonitoringStack-${environment}`,
];

stackNames.forEach((stackName) => {
  DeploymentErrorHandler.initializeErrorHandling(stackName);
  CrossStackValidator.initializeDeployment(
    stackName,
    DependencyResolver.getStackDependencies(stackName.split("-")[0])
  );
});

// Common stack properties
const commonProps = {
  env: {
    account,
    region: envConfig.region || region,
  },
  tags: {
    Environment: environment,
    Project: "Sachain",
    ManagedBy: "CDK",
  },
};

// 1. Create CoreStack first (foundational resources + auth resources)
let coreStack: CoreStack;
try {
  // CrossStackValidator.validateStackDeployment("CoreStack", {});

  coreStack = new CoreStack(app, `SachainCoreStack-${environment}`, {
    ...commonProps,
    environment,
    description: `Sachain Core infrastructure (DynamoDB, S3, Cognito, Post-Auth Lambda) for ${environment} environment`,
    tags: {
      ...commonProps.tags,
      Component: "Core",
    },
  });

  CrossStackValidator.markStackDeployed("CoreStack");
  console.log("✓ CoreStack created successfully");
} catch (error) {
  const failureContext = DeploymentErrorHandler.handleDeploymentFailure(
    "CoreStack",
    environment,
    error instanceof Error ? error : new Error(String(error))
  );
  console.error("✗ CoreStack creation failed:", failureContext.errorMessage);
  throw error;
}

// 2. Create SecurityStack (depends on CoreStack which now includes auth resources)
let securityStack: SecurityStack;
try {
  const securityDependencies = {
    table: coreStack.table,
    documentBucket: coreStack.documentBucket,
    encryptionKey: coreStack.encryptionKey,
    userPool: coreStack.userPool,
  };

  // CrossStackValidator.validateStackDeployment(
  //   "SecurityStack",
  //   securityDependencies
  // );

  securityStack = new SecurityStack(
    app,
    `SachainSecurityStack-${environment}`,
    {
      ...commonProps,
      environment,
      ...securityDependencies,
      description: `Sachain Security infrastructure (IAM roles, policies) for ${environment} environment`,
      tags: {
        ...commonProps.tags,
        Component: "Security",
      },
    }
  );

  CrossStackValidator.markStackDeployed("SecurityStack");
  console.log("✓ SecurityStack created successfully");
} catch (error) {
  const failureContext = DeploymentErrorHandler.handleDeploymentFailure(
    "SecurityStack",
    environment,
    error instanceof Error ? error : new Error(String(error))
  );
  console.error(
    "✗ SecurityStack creation failed:",
    failureContext.errorMessage
  );
  throw error;
}

// 3. Create LambdaStack (depends on CoreStack and SecurityStack, now includes event resources)
let lambdaStack: LambdaStack;
try {
  const lambdaDependencies = {
    // Core resources (now includes auth)
    table: coreStack.table,
    documentBucket: coreStack.documentBucket,
    encryptionKey: coreStack.encryptionKey,
    userPool: coreStack.userPool,
    userPoolClient: coreStack.userPoolClient,
    postAuthLambda: coreStack.postAuthLambda,
    // Security resources
    kycUploadRole: securityStack.kycUploadRole,
    adminReviewRole: securityStack.adminReviewRole,
    userNotificationRole: securityStack.userNotificationRole,
    kycProcessingRole: securityStack.kycProcessingRole,
  };

  // CrossStackValidator.validateStackDeployment(
  //   "LambdaStack",
  //   lambdaDependencies
  // );

  lambdaStack = new LambdaStack(app, `SachainLambdaStack-${environment}`, {
    ...commonProps,
    environment,
    ...lambdaDependencies,
    description: `Sachain Lambda infrastructure (Functions, API Gateway, EventBridge, SNS) for ${environment} environment`,
    tags: {
      ...commonProps.tags,
      Component: "Lambda",
    },
  });

  CrossStackValidator.markStackDeployed("LambdaStack");
  console.log("✓ LambdaStack created successfully");
} catch (error) {
  const failureContext = DeploymentErrorHandler.handleDeploymentFailure(
    "LambdaStack",
    environment,
    error instanceof Error ? error : new Error(String(error))
  );
  console.error("✗ LambdaStack creation failed:", failureContext.errorMessage);
  throw error;
}

// 4. Create MonitoringStack (depends on LambdaStack and CoreStack)
let monitoringStack: MonitoringStack;
try {
  const monitoringDependencies = {
    postAuthLambda: coreStack.postAuthLambda,
    kycUploadLambda: lambdaStack.kycUploadLambda,
    adminReviewLambda: lambdaStack.adminReviewLambda,
    userNotificationLambda: lambdaStack.userNotificationLambda,
    kycProcessingLambda: lambdaStack.kycProcessingLambda,
  };

  // CrossStackValidator.validateStackDeployment(
  //   "MonitoringStack",
  //   monitoringDependencies
  // );

  monitoringStack = new MonitoringStack(
    app,
    `SachainMonitoringStack-${environment}`,
    {
      ...commonProps,
      environment,
      ...monitoringDependencies,
      enableDetailedMonitoring: envConfig.enableDetailedMonitoring,
      description: `Sachain Monitoring infrastructure (CloudWatch) for ${environment} environment`,
      tags: {
        ...commonProps.tags,
        Component: "Monitoring",
      },
    }
  );

  CrossStackValidator.markStackDeployed("MonitoringStack");
  console.log("✓ MonitoringStack created successfully");
} catch (error) {
  const failureContext = DeploymentErrorHandler.handleDeploymentFailure(
    "MonitoringStack",
    environment,
    error instanceof Error ? error : new Error(String(error))
  );
  console.error(
    "✗ MonitoringStack creation failed:",
    failureContext.errorMessage
  );
  throw error;
}

// Set up explicit dependencies to ensure proper deployment order (consolidated structure)
securityStack.addDependency(coreStack);
lambdaStack.addDependency(coreStack);
lambdaStack.addDependency(securityStack);
monitoringStack.addDependency(lambdaStack);
monitoringStack.addDependency(coreStack);

// Generate deployment report
console.log("\n" + "=".repeat(60));
console.log("DEPLOYMENT SUMMARY");
console.log("=".repeat(60));
console.log(CrossStackValidator.getDeploymentReport());

// Check for any deployment failures
const deploymentStatus = CrossStackValidator.getDeploymentStatus();
const failedStacks = Array.from(deploymentStatus.values()).filter(
  (status) => status.status === "failed"
);

if (failedStacks.length > 0) {
  console.error("⚠️  Some stacks failed to deploy:");
  failedStacks.forEach((stack) => {
    console.error(
      `   - ${stack.stackName}: ${stack.error?.errorMessage || "Unknown error"}`
    );
  });
  console.log("\nFailure Report:");
  console.log(DeploymentErrorHandler.generateFailureReport());
} else {
  console.log("✅ All stacks created successfully!");
}

// Note: Consolidated stack structure deployed successfully:
// 1. CoreStack now includes auth resources (Cognito, Post-Auth Lambda)
// 2. LambdaStack now includes event resources (EventBridge, SNS)
// 3. SecurityStack depends only on CoreStack
// 4. MonitoringStack depends on both LambdaStack and CoreStack
//
// This eliminates the need for separate AuthStack and EventStack,
// reducing complexity and cross-stack dependencies.

// Handle process exit for deployment failures
process.on("exit", (code) => {
  if (code !== 0) {
    console.error("\n🚨 Deployment process exited with errors");
    console.error("Check the logs above for detailed error information");
    console.error("Use the suggested recovery actions to resolve issues");
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("\n🚨 Uncaught exception during deployment:");
  console.error(error);

  DeploymentErrorHandler.handleDeploymentFailure("Unknown", environment, error);

  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("\n🚨 Unhandled promise rejection during deployment:");
  console.error(reason);

  const error = reason instanceof Error ? reason : new Error(String(reason));
  DeploymentErrorHandler.handleDeploymentFailure("Unknown", environment, error);

  process.exit(1);
});
