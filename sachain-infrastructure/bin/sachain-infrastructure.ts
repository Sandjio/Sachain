#!/usr/bin/env node
/// <reference types="node" />
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import {
  CoreStack,
  SecurityStack,
  EventStack,
  AuthStack,
  LambdaStack,
  MonitoringStack,
} from "../lib/stacks";
import { PostAuthConfiguratorStack } from "../lib/stacks/post-auth-configurator-stack";
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

// Initialize error handling for all stacks
const stackNames = [
  `SachainCoreStack-${environment}`,
  `SachainEventStack-${environment}`,
  `SachainSecurityStack-${environment}`,
  `SachainAuthStack-${environment}`,
  `SachainLambdaStack-${environment}`,
  `SachainMonitoringStack-${environment}`,
  `SachainPostAuthConfiguratorStack-${environment}`,
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

// 1. Create CoreStack first (foundational resources)
let coreStack: CoreStack;
try {
  // CrossStackValidator.validateStackDeployment("CoreStack", {});

  coreStack = new CoreStack(app, `SachainCoreStack-${environment}`, {
    ...commonProps,
    environment,
    description: `Sachain Core infrastructure (DynamoDB, S3) for ${environment} environment`,
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

// 2. Create EventStack (independent of other stacks)
let eventStack: EventStack;
try {
  // CrossStackValidator.validateStackDeployment("EventStack", {});

  eventStack = new EventStack(app, `SachainEventStack-${environment}`, {
    ...commonProps,
    environment,
    description: `Sachain Event infrastructure (EventBridge, SNS) for ${environment} environment`,
    tags: {
      ...commonProps.tags,
      Component: "Events",
    },
  });

  CrossStackValidator.markStackDeployed("EventStack");
  console.log("✓ EventStack created successfully");
} catch (error) {
  const failureContext = DeploymentErrorHandler.handleDeploymentFailure(
    "EventStack",
    environment,
    error instanceof Error ? error : new Error(String(error))
  );
  console.error("✗ EventStack creation failed:", failureContext.errorMessage);
  throw error;
}

// 3. Create SecurityStack (depends on CoreStack and EventStack)
let securityStack: SecurityStack;
try {
  const securityDependencies = {
    table: coreStack.table,
    documentBucket: coreStack.documentBucket,
    encryptionKey: coreStack.encryptionKey,
    notificationTopic: eventStack.notificationTopic,
    eventBus: eventStack.eventBus,
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

// 4. Create AuthStack without post-auth Lambda initially to break circular dependency
// The post-auth Lambda trigger will be configured later after LambdaStack is deployed
let authStack: AuthStack;
try {
  // CrossStackValidator.validateStackDeployment("AuthStack", {});

  authStack = new AuthStack(app, `SachainAuthStack-${environment}`, {
    ...commonProps,
    environment,
    // postAuthLambda will be configured later to avoid circular dependency
    postAuthLambda: undefined,
    description: `Sachain Authentication infrastructure (Cognito) for ${environment} environment`,
    tags: {
      ...commonProps.tags,
      Component: "Authentication",
    },
  });

  CrossStackValidator.markStackDeployed("AuthStack");
  console.log("✓ AuthStack created successfully");
} catch (error) {
  const failureContext = DeploymentErrorHandler.handleDeploymentFailure(
    "AuthStack",
    environment,
    error instanceof Error ? error : new Error(String(error))
  );
  console.error("✗ AuthStack creation failed:", failureContext.errorMessage);
  throw error;
}

// 5. Create LambdaStack (depends on CoreStack, SecurityStack, EventStack, and AuthStack)
let lambdaStack: LambdaStack;
try {
  const lambdaDependencies = {
    // Core resources
    table: coreStack.table,
    documentBucket: coreStack.documentBucket,
    encryptionKey: coreStack.encryptionKey,
    // Security resources
    postAuthRole: securityStack.postAuthRole,
    kycUploadRole: securityStack.kycUploadRole,
    adminReviewRole: securityStack.adminReviewRole,
    userNotificationRole: securityStack.userNotificationRole,
    kycProcessingRole: securityStack.kycProcessingRole,
    // Event resources
    eventBus: eventStack.eventBus,
    notificationTopic: eventStack.notificationTopic,
    kycDocumentUploadedRule: eventStack.kycDocumentUploadedRule,
    kycStatusChangeRule: eventStack.kycStatusChangeRule,
    // Auth resources
    userPool: authStack.userPool,
    userPoolClient: authStack.userPoolClient,
  };

  // CrossStackValidator.validateStackDeployment(
  //   "LambdaStack",
  //   lambdaDependencies
  // );

  lambdaStack = new LambdaStack(app, `SachainLambdaStack-${environment}`, {
    ...commonProps,
    environment,
    ...lambdaDependencies,
    description: `Sachain Lambda infrastructure (Functions, API Gateway) for ${environment} environment`,
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

// 6. Create PostAuthConfiguratorStack to wire Cognito post-auth trigger
let postAuthConfiguratorStack: PostAuthConfiguratorStack;
try {
  const postAuthConfigDeps = {
    userPoolId: authStack.userPool.userPoolId,
    postAuthLambda: lambdaStack.postAuthLambda,
  };

  postAuthConfiguratorStack = new PostAuthConfiguratorStack(
    app,
    `SachainPostAuthConfiguratorStack-${environment}`,
    {
      ...commonProps,
      environment,
      userPoolId: postAuthConfigDeps.userPoolId,
      postAuthLambda: postAuthConfigDeps.postAuthLambda,
      description: `Configure Cognito PostAuth Lambda for ${environment}`,
      tags: {
        ...commonProps.tags,
        Component: "AuthConfigurator",
      },
    }
  );

  CrossStackValidator.markStackDeployed("PostAuthConfiguratorStack");
  console.log("✓ PostAuthConfiguratorStack created successfully");
} catch (error) {
  const failureContext = DeploymentErrorHandler.handleDeploymentFailure(
    "PostAuthConfiguratorStack",
    environment,
    error instanceof Error ? error : new Error(String(error))
  );
  console.error(
    "✗ PostAuthConfiguratorStack creation failed:",
    failureContext.errorMessage
  );
  throw error;
}

// 7. Create MonitoringStack (depends on LambdaStack)
let monitoringStack: MonitoringStack;
try {
  const monitoringDependencies = {
    postAuthLambda: lambdaStack.postAuthLambda,
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

// Set up explicit dependencies to ensure proper deployment order
securityStack.addDependency(coreStack);
securityStack.addDependency(eventStack);
authStack.addDependency(securityStack);
lambdaStack.addDependency(coreStack);
lambdaStack.addDependency(securityStack);
lambdaStack.addDependency(eventStack);
lambdaStack.addDependency(authStack);
// Ensure configurator runs after both Auth and Lambda stacks
postAuthConfiguratorStack.addDependency(lambdaStack);
postAuthConfiguratorStack.addDependency(authStack);
monitoringStack.addDependency(lambdaStack);

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

// Note: Post-deployment configuration needed:
// 1. Configure Cognito User Pool post-auth trigger to use the actual Lambda from LambdaStack
// 2. Add EventBridge Lambda targets for event rules (removed to avoid circular dependencies)
// 3. Re-add Dead Letter Queues to Lambda functions (removed to avoid circular dependencies)
//
// These configurations can be added through:
// - AWS CLI/Console after deployment
// - A separate CDK stack deployed after the main stacks
// - Custom resources or CDK aspects

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
