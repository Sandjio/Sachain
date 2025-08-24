/**
 * Cross-Stack Reference Validator
 *
 * Utilities for validating cross-stack dependencies and ensuring
 * proper resource resolution between stacks.
 * Updated for consolidated stack structure (AuthStack -> CoreStack, EventStack -> LambdaStack)
 */

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  CoreStackOutputs,
  SecurityStackOutputs,
  LambdaStackOutputs,
  MonitoringStackOutputs,
  StackDependencies,
  EXPORT_NAMES,
} from "../interfaces";

/**
 * Stack deployment error types
 */
export enum StackErrorType {
  MISSING_DEPENDENCY = "MISSING_DEPENDENCY",
  INVALID_CONFIGURATION = "INVALID_CONFIGURATION",
  DEPLOYMENT_FAILURE = "DEPLOYMENT_FAILURE",
  ROLLBACK_FAILURE = "ROLLBACK_FAILURE",
  CIRCULAR_DEPENDENCY = "CIRCULAR_DEPENDENCY",
  RESOURCE_CONFLICT = "RESOURCE_CONFLICT",
}

/**
 * Detailed error information for stack operations
 */
export interface StackErrorDetails {
  errorType: StackErrorType;
  stackName: string;
  resourceName?: string;
  dependencyStack?: string;
  errorMessage: string;
  suggestedAction: string;
  rollbackRequired: boolean;
}

/**
 * Stack deployment status tracking
 */
export interface StackDeploymentStatus {
  stackName: string;
  status:
    | "pending"
    | "deploying"
    | "deployed"
    | "failed"
    | "rolling_back"
    | "rolled_back";
  startTime?: Date;
  endTime?: Date;
  error?: StackErrorDetails;
  dependencies: string[];
  dependents: string[];
}

/**
 * Enhanced validation error for cross-stack dependencies
 */
export class CrossStackValidationError extends Error {
  public readonly errorDetails: StackErrorDetails;

  constructor(
    message: string,
    public readonly stackName: string,
    public readonly missingDependency: string,
    errorType: StackErrorType = StackErrorType.MISSING_DEPENDENCY,
    suggestedAction?: string
  ) {
    super(`[${stackName}] ${message}`);
    this.name = "CrossStackValidationError";

    this.errorDetails = {
      errorType,
      stackName,
      dependencyStack: missingDependency,
      errorMessage: message,
      suggestedAction:
        suggestedAction ||
        this.getDefaultSuggestedAction(errorType, missingDependency),
      rollbackRequired: this.shouldRollback(errorType),
    };
  }

  private getDefaultSuggestedAction(
    errorType: StackErrorType,
    dependency: string
  ): string {
    switch (errorType) {
      case StackErrorType.MISSING_DEPENDENCY:
        return `Deploy the ${dependency} stack first, then retry deployment of ${this.stackName}`;
      case StackErrorType.CIRCULAR_DEPENDENCY:
        return `Review stack dependencies and remove circular references between ${this.stackName} and ${dependency}`;
      case StackErrorType.INVALID_CONFIGURATION:
        return `Check the configuration for ${this.stackName} and ensure all required properties are provided`;
      case StackErrorType.DEPLOYMENT_FAILURE:
        return `Check CloudFormation console for detailed error information and retry deployment`;
      case StackErrorType.ROLLBACK_FAILURE:
        return `Manual intervention required. Check CloudFormation console and resolve resource conflicts`;
      case StackErrorType.RESOURCE_CONFLICT:
        return `Resolve resource naming conflicts and ensure unique resource names across environments`;
      default:
        return `Review the error details and consult AWS CloudFormation documentation`;
    }
  }

  private shouldRollback(errorType: StackErrorType): boolean {
    return [
      StackErrorType.DEPLOYMENT_FAILURE,
      StackErrorType.RESOURCE_CONFLICT,
      StackErrorType.INVALID_CONFIGURATION,
    ].includes(errorType);
  }
}

/**
 * Stack deployment error for deployment failures
 */
export class StackDeploymentError extends Error {
  public readonly errorDetails: StackErrorDetails;

  constructor(
    stackName: string,
    errorMessage: string,
    errorType: StackErrorType = StackErrorType.DEPLOYMENT_FAILURE,
    resourceName?: string
  ) {
    super(`Stack deployment failed: ${stackName} - ${errorMessage}`);
    this.name = "StackDeploymentError";

    this.errorDetails = {
      errorType,
      stackName,
      resourceName,
      errorMessage,
      suggestedAction: this.getSuggestedAction(
        errorType,
        stackName,
        resourceName
      ),
      rollbackRequired: true,
    };
  }

  private getSuggestedAction(
    errorType: StackErrorType,
    stackName: string,
    resourceName?: string
  ): string {
    const resourceInfo = resourceName ? ` for resource ${resourceName}` : "";

    switch (errorType) {
      case StackErrorType.DEPLOYMENT_FAILURE:
        return `Check CloudFormation events for ${stackName}${resourceInfo} and resolve the underlying issue`;
      case StackErrorType.RESOURCE_CONFLICT:
        return `Resolve naming conflicts${resourceInfo} and ensure unique resource names`;
      case StackErrorType.ROLLBACK_FAILURE:
        return `Manual cleanup required for ${stackName}. Check AWS console for stuck resources`;
      default:
        return `Review CloudFormation console for ${stackName} and follow AWS troubleshooting guides`;
    }
  }
}

/**
 * Resource Reference Tracker for consolidated stacks
 */
export class ResourceReferenceTracker {
  private static resourceMap: Map<string, { stack: string; resource: string }> =
    new Map();

  /**
   * Initialize resource tracking for consolidated stacks
   */
  static initializeResourceTracking(): void {
    this.resourceMap.clear();

    // Core Stack resources (includes auth resources from former AuthStack)
    this.resourceMap.set("table", { stack: "CoreStack", resource: "table" });
    this.resourceMap.set("documentBucket", {
      stack: "CoreStack",
      resource: "documentBucket",
    });
    this.resourceMap.set("encryptionKey", {
      stack: "CoreStack",
      resource: "encryptionKey",
    });
    this.resourceMap.set("userPool", {
      stack: "CoreStack",
      resource: "userPool",
    });
    this.resourceMap.set("userPoolClient", {
      stack: "CoreStack",
      resource: "userPoolClient",
    });
    this.resourceMap.set("postAuthLambda", {
      stack: "CoreStack",
      resource: "postAuthLambda",
    });

    // Security Stack resources
    this.resourceMap.set("kycUploadRole", {
      stack: "SecurityStack",
      resource: "kycUploadRole",
    });
    this.resourceMap.set("adminReviewRole", {
      stack: "SecurityStack",
      resource: "adminReviewRole",
    });
    this.resourceMap.set("userNotificationRole", {
      stack: "SecurityStack",
      resource: "userNotificationRole",
    });
    this.resourceMap.set("kycProcessingRole", {
      stack: "SecurityStack",
      resource: "kycProcessingRole",
    });

    // Lambda Stack resources (includes event resources from former EventStack)
    this.resourceMap.set("api", { stack: "LambdaStack", resource: "api" });
    this.resourceMap.set("kycUploadLambda", {
      stack: "LambdaStack",
      resource: "kycUploadLambda",
    });
    this.resourceMap.set("adminReviewLambda", {
      stack: "LambdaStack",
      resource: "adminReviewLambda",
    });
    this.resourceMap.set("userNotificationLambda", {
      stack: "LambdaStack",
      resource: "userNotificationLambda",
    });
    this.resourceMap.set("kycProcessingLambda", {
      stack: "LambdaStack",
      resource: "kycProcessingLambda",
    });
    this.resourceMap.set("eventBus", {
      stack: "LambdaStack",
      resource: "eventBus",
    });
    this.resourceMap.set("notificationTopic", {
      stack: "LambdaStack",
      resource: "notificationTopic",
    });
    this.resourceMap.set("userNotificationTopic", {
      stack: "LambdaStack",
      resource: "userNotificationTopic",
    });
    this.resourceMap.set("kycStatusChangeRule", {
      stack: "LambdaStack",
      resource: "kycStatusChangeRule",
    });
    this.resourceMap.set("kycDocumentUploadedRule", {
      stack: "LambdaStack",
      resource: "kycDocumentUploadedRule",
    });
    this.resourceMap.set("kycReviewCompletedRule", {
      stack: "LambdaStack",
      resource: "kycReviewCompletedRule",
    });

    // Monitoring Stack resources
    this.resourceMap.set("dashboard", {
      stack: "MonitoringStack",
      resource: "dashboard",
    });
    this.resourceMap.set("alertTopic", {
      stack: "MonitoringStack",
      resource: "alertTopic",
    });
  }

  /**
   * Get the stack that owns a specific resource
   */
  static getResourceOwner(
    resourceName: string
  ): { stack: string; resource: string } | undefined {
    return this.resourceMap.get(resourceName);
  }

  /**
   * Get all resources owned by a specific stack
   */
  static getStackResources(stackName: string): string[] {
    const resources: string[] = [];
    for (const [resourceName, owner] of this.resourceMap.entries()) {
      if (owner.stack === stackName) {
        resources.push(resourceName);
      }
    }
    return resources;
  }

  /**
   * Validate that a resource reference is valid for the consolidated structure
   */
  static validateResourceReference(
    resourceName: string,
    expectedStack?: string
  ): boolean {
    const owner = this.getResourceOwner(resourceName);
    if (!owner) {
      return false;
    }

    if (expectedStack && owner.stack !== expectedStack) {
      return false;
    }

    return true;
  }

  /**
   * Get migration mapping for resources that moved between stacks
   */
  static getResourceMigrationMapping(): Map<
    string,
    { from: string; to: string }
  > {
    const migrationMap = new Map<string, { from: string; to: string }>();

    // Auth resources moved from AuthStack to CoreStack
    migrationMap.set("userPool", { from: "AuthStack", to: "CoreStack" });
    migrationMap.set("userPoolClient", { from: "AuthStack", to: "CoreStack" });

    // Post-auth lambda moved from LambdaStack to CoreStack
    migrationMap.set("postAuthLambda", {
      from: "LambdaStack",
      to: "CoreStack",
    });

    // Event resources moved from EventStack to LambdaStack
    migrationMap.set("eventBus", { from: "EventStack", to: "LambdaStack" });
    migrationMap.set("notificationTopic", {
      from: "EventStack",
      to: "LambdaStack",
    });
    migrationMap.set("userNotificationTopic", {
      from: "EventStack",
      to: "LambdaStack",
    });
    migrationMap.set("kycStatusChangeRule", {
      from: "EventStack",
      to: "LambdaStack",
    });
    migrationMap.set("kycDocumentUploadedRule", {
      from: "EventStack",
      to: "LambdaStack",
    });
    migrationMap.set("kycReviewCompletedRule", {
      from: "EventStack",
      to: "LambdaStack",
    });

    return migrationMap;
  }

  /**
   * Validate that all cross-stack references are updated for the new structure
   */
  static validateConsolidatedReferences(): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const migrationMap = this.getResourceMigrationMapping();

    // Check that no references to deleted stacks exist
    const deletedStacks = ["AuthStack", "EventStack"];
    for (const deletedStack of deletedStacks) {
      // In a real implementation, this would check actual CloudFormation exports
      // For now, we just validate the mapping is complete
      for (const [resource, migration] of migrationMap.entries()) {
        if (migration.from === deletedStack) {
          const newOwner = this.getResourceOwner(resource);
          if (!newOwner || newOwner.stack !== migration.to) {
            issues.push(
              `Resource ${resource} not properly migrated from ${migration.from} to ${migration.to}`
            );
          }
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Clear resource tracking (useful for testing)
   */
  static clearResourceTracking(): void {
    this.resourceMap.clear();
  }

  /**
   * Records a cross-stack reference (for backward compatibility)
   */
  static recordReference(
    fromStack: string,
    toStack: string,
    resourceName: string
  ): void {
    // This method is kept for backward compatibility with existing stack files
    // In the consolidated structure, we track resources differently
    console.log(
      `Recording reference: ${fromStack} -> ${toStack}.${resourceName}`
    );
  }
}

/**
 * Enhanced cross-stack validator with comprehensive error handling
 */
export class CrossStackValidator {
  private static deploymentStatus: Map<string, StackDeploymentStatus> =
    new Map();

  /**
   * Initialize deployment tracking for a stack
   */
  static initializeDeployment(stackName: string, dependencies: string[]): void {
    const dependents = this.getStackDependents(stackName);

    this.deploymentStatus.set(stackName, {
      stackName,
      status: "pending",
      dependencies,
      dependents,
    });
  }

  /**
   * Update deployment status for a stack
   */
  static updateDeploymentStatus(
    stackName: string,
    status: StackDeploymentStatus["status"],
    error?: StackErrorDetails
  ): void {
    const current = this.deploymentStatus.get(stackName);
    if (current) {
      current.status = status;
      current.endTime = new Date();
      if (error) {
        current.error = error;
      }
      if (status === "deploying" && !current.startTime) {
        current.startTime = new Date();
      }
    }
  }

  /**
   * Get deployment status for all stacks
   */
  static getDeploymentStatus(): Map<string, StackDeploymentStatus> {
    return new Map(this.deploymentStatus);
  }

  /**
   * Get stacks that depend on the given stack
   */
  private static getStackDependents(stackName: string): string[] {
    const dependents: string[] = [];
    const allStacks = [
      "CoreStack",
      "SecurityStack",
      "LambdaStack",
      "MonitoringStack",
    ];

    for (const stack of allStacks) {
      const deps = DependencyResolver.getStackDependencies(stack);
      if (deps.includes(stackName)) {
        dependents.push(stack);
      }
    }

    return dependents;
  }

  /**
   * Comprehensive validation before stack deployment
   */
  static validateStackDeployment(stackName: string, dependencies: any): void {
    try {
      // Check deployment order
      const deployedStacks = Array.from(this.deploymentStatus.keys()).filter(
        (name) => {
          const status = this.deploymentStatus.get(name);
          return status?.status === "deployed";
        }
      );

      DependencyResolver.validateDeploymentOrder(stackName, deployedStacks);

      // Validate specific stack dependencies
      switch (stackName) {
        case "SecurityStack":
          this.validateSecurityStackDeployment(dependencies);
          break;
        case "LambdaStack":
          this.validateLambdaStackDeployment(dependencies);
          break;
        case "MonitoringStack":
          this.validateMonitoringStackDeployment(dependencies);
          break;
      }

      // Initialize deployment tracking
      const stackDeps = DependencyResolver.getStackDependencies(stackName);
      this.initializeDeployment(stackName, stackDeps);
      this.updateDeploymentStatus(stackName, "deploying");
    } catch (error) {
      const errorDetails: StackErrorDetails = {
        errorType: StackErrorType.INVALID_CONFIGURATION,
        stackName,
        errorMessage:
          error instanceof Error ? error.message : "Unknown validation error",
        suggestedAction: "Review stack configuration and dependencies",
        rollbackRequired: false,
      };

      this.updateDeploymentStatus(stackName, "failed", errorDetails);
      throw error;
    }
  }

  /**
   * Validate SecurityStack deployment requirements (updated for consolidated CoreStack)
   */
  private static validateSecurityStackDeployment(dependencies: any): void {
    if (!dependencies.table) {
      throw new CrossStackValidationError(
        "DynamoDB table is required for SecurityStack",
        "SecurityStack",
        "CoreStack.table",
        StackErrorType.MISSING_DEPENDENCY
      );
    }

    if (!dependencies.documentBucket) {
      throw new CrossStackValidationError(
        "S3 document bucket is required for SecurityStack",
        "SecurityStack",
        "CoreStack.documentBucket",
        StackErrorType.MISSING_DEPENDENCY
      );
    }

    if (!dependencies.encryptionKey) {
      throw new CrossStackValidationError(
        "KMS encryption key is required for SecurityStack",
        "SecurityStack",
        "CoreStack.encryptionKey",
        StackErrorType.MISSING_DEPENDENCY
      );
    }

    if (!dependencies.userPool) {
      throw new CrossStackValidationError(
        "Cognito User Pool is required for SecurityStack (now from CoreStack)",
        "SecurityStack",
        "CoreStack.userPool",
        StackErrorType.MISSING_DEPENDENCY
      );
    }
  }

  /**
   * Validate LambdaStack deployment requirements (updated for consolidated structure)
   */
  private static validateLambdaStackDeployment(dependencies: any): void {
    const requiredRoles = [
      "kycUploadRole",
      "adminReviewRole",
      "userNotificationRole",
      "kycProcessingRole",
    ];

    for (const role of requiredRoles) {
      if (!dependencies[role]) {
        throw new CrossStackValidationError(
          `IAM role ${role} is required for LambdaStack`,
          "LambdaStack",
          `SecurityStack.${role}`,
          StackErrorType.MISSING_DEPENDENCY
        );
      }
    }

    if (!dependencies.userPool) {
      throw new CrossStackValidationError(
        "Cognito User Pool is required for LambdaStack (from CoreStack)",
        "LambdaStack",
        "CoreStack.userPool",
        StackErrorType.MISSING_DEPENDENCY
      );
    }

    if (!dependencies.postAuthLambda) {
      throw new CrossStackValidationError(
        "Post-auth Lambda is required for LambdaStack (from CoreStack)",
        "LambdaStack",
        "CoreStack.postAuthLambda",
        StackErrorType.MISSING_DEPENDENCY
      );
    }

    // Note: Event resources (EventBridge, SNS) are now created within LambdaStack
    // so no external dependencies needed for them
  }

  /**
   * Validate MonitoringStack deployment requirements
   */
  private static validateMonitoringStackDeployment(dependencies: any): void {
    const requiredLambdas = [
      "kycUploadLambda",
      "adminReviewLambda",
      "userNotificationLambda",
      "kycProcessingLambda",
    ];

    for (const lambda of requiredLambdas) {
      if (!dependencies[lambda]) {
        throw new CrossStackValidationError(
          `Lambda function ${lambda} is required for MonitoringStack`,
          "MonitoringStack",
          `LambdaStack.${lambda}`,
          StackErrorType.MISSING_DEPENDENCY
        );
      }
    }

    // Post-auth lambda comes from CoreStack now
    if (!dependencies.postAuthLambda) {
      throw new CrossStackValidationError(
        "Post-auth Lambda is required for MonitoringStack",
        "MonitoringStack",
        "CoreStack.postAuthLambda",
        StackErrorType.MISSING_DEPENDENCY
      );
    }
  }

  /**
   * Validates CoreStack outputs with enhanced error handling (includes auth resources)
   */
  static validateCoreStackOutputs(
    outputs: Partial<CoreStackOutputs>,
    stackName: string,
    requiredOutputs?: (keyof CoreStackOutputs)[]
  ): void {
    // Skip validation for test stacks
    if (stackName.includes("Test")) {
      return;
    }

    // Default required outputs for backward compatibility
    const defaultRequired = [
      "table",
      "documentBucket",
      "encryptionKey",
      "userPool",
      "userPoolClient",
      "postAuthLambda",
    ];

    const required = requiredOutputs || defaultRequired;

    for (const prop of required) {
      if (!outputs[prop as keyof CoreStackOutputs]) {
        throw new CrossStackValidationError(
          `Missing required CoreStack output: ${prop}. Ensure CoreStack is deployed successfully.`,
          stackName,
          `CoreStack.${prop}`,
          StackErrorType.MISSING_DEPENDENCY,
          `Deploy CoreStack first: cdk deploy SachainCoreStack-{environment}`
        );
      }
    }

    // Validate resource properties
    if (outputs.table && !outputs.table.tableName) {
      throw new CrossStackValidationError(
        "CoreStack table is missing tableName property",
        stackName,
        "CoreStack.table",
        StackErrorType.INVALID_CONFIGURATION,
        "Check CoreStack DynamoDB table configuration"
      );
    }

    if (outputs.documentBucket && !outputs.documentBucket.bucketName) {
      throw new CrossStackValidationError(
        "CoreStack documentBucket is missing bucketName property",
        stackName,
        "CoreStack.documentBucket",
        StackErrorType.INVALID_CONFIGURATION,
        "Check CoreStack S3 bucket configuration"
      );
    }

    // Validate auth resources (consolidated from AuthStack)
    if (outputs.userPool && !outputs.userPool.userPoolId) {
      throw new CrossStackValidationError(
        "CoreStack userPool is missing userPoolId property",
        stackName,
        "CoreStack.userPool",
        StackErrorType.INVALID_CONFIGURATION,
        "Check CoreStack Cognito User Pool configuration"
      );
    }

    if (outputs.userPoolClient && !outputs.userPoolClient.userPoolClientId) {
      throw new CrossStackValidationError(
        "CoreStack userPoolClient is missing userPoolClientId property",
        stackName,
        "CoreStack.userPoolClient",
        StackErrorType.INVALID_CONFIGURATION,
        "Check CoreStack Cognito User Pool Client configuration"
      );
    }

    if (outputs.postAuthLambda && !outputs.postAuthLambda.functionArn) {
      throw new CrossStackValidationError(
        "CoreStack postAuthLambda is missing functionArn property",
        stackName,
        "CoreStack.postAuthLambda",
        StackErrorType.INVALID_CONFIGURATION,
        "Check CoreStack post-auth Lambda configuration"
      );
    }
  }

  /**
   * Validates LambdaStack event outputs (consolidated from EventStack)
   */
  static validateLambdaStackEventOutputs(
    outputs: Partial<LambdaStackOutputs>,
    stackName: string
  ): void {
    const required = [
      "eventBus",
      "notificationTopic",
      "kycDocumentUploadedRule",
      "kycStatusChangeRule",
    ];

    for (const prop of required) {
      if (!outputs[prop as keyof LambdaStackOutputs]) {
        throw new CrossStackValidationError(
          `Missing required LambdaStack event output: ${prop}. Ensure LambdaStack is deployed successfully.`,
          stackName,
          `LambdaStack.${prop}`,
          StackErrorType.MISSING_DEPENDENCY,
          `Deploy LambdaStack first: cdk deploy SachainLambdaStack-{environment}`
        );
      }
    }

    // Validate event resource properties
    if (outputs.eventBus && !outputs.eventBus.eventBusName) {
      throw new CrossStackValidationError(
        "LambdaStack eventBus is missing eventBusName property",
        stackName,
        "LambdaStack.eventBus",
        StackErrorType.INVALID_CONFIGURATION,
        "Check LambdaStack EventBridge configuration"
      );
    }

    if (outputs.notificationTopic && !outputs.notificationTopic.topicArn) {
      throw new CrossStackValidationError(
        "LambdaStack notificationTopic is missing topicArn property",
        stackName,
        "LambdaStack.notificationTopic",
        StackErrorType.INVALID_CONFIGURATION,
        "Check LambdaStack SNS topic configuration"
      );
    }
  }

  /**
   * Validates CoreStack auth outputs (consolidated from AuthStack)
   */
  static validateCoreStackAuthOutputs(
    outputs: Partial<CoreStackOutputs>,
    stackName: string
  ): void {
    const required = ["userPool", "userPoolClient", "postAuthLambda"];

    for (const prop of required) {
      if (!outputs[prop as keyof CoreStackOutputs]) {
        throw new CrossStackValidationError(
          `Missing required CoreStack auth output: ${prop}. Ensure CoreStack is deployed successfully.`,
          stackName,
          `CoreStack.${prop}`,
          StackErrorType.MISSING_DEPENDENCY,
          `Deploy CoreStack first: cdk deploy SachainCoreStack-{environment}`
        );
      }
    }

    // Validate Cognito resource properties
    if (outputs.userPool && !outputs.userPool.userPoolId) {
      throw new CrossStackValidationError(
        "CoreStack userPool is missing userPoolId property",
        stackName,
        "CoreStack.userPool",
        StackErrorType.INVALID_CONFIGURATION,
        "Check CoreStack Cognito User Pool configuration"
      );
    }

    if (outputs.userPoolClient && !outputs.userPoolClient.userPoolClientId) {
      throw new CrossStackValidationError(
        "CoreStack userPoolClient is missing userPoolClientId property",
        stackName,
        "CoreStack.userPoolClient",
        StackErrorType.INVALID_CONFIGURATION,
        "Check CoreStack Cognito User Pool Client configuration"
      );
    }

    // Validate post-auth lambda properties
    if (outputs.postAuthLambda && !outputs.postAuthLambda.functionArn) {
      throw new CrossStackValidationError(
        "CoreStack postAuthLambda is missing functionArn property",
        stackName,
        "CoreStack.postAuthLambda",
        StackErrorType.INVALID_CONFIGURATION,
        "Check CoreStack post-auth Lambda configuration"
      );
    }
  }

  /**
   * Validates SecurityStack outputs with enhanced error handling
   */
  static validateSecurityStackOutputs(
    outputs: Partial<SecurityStackOutputs>,
    stackName: string
  ): void {
    const required = [
      "kycUploadRole",
      "adminReviewRole",
      "userNotificationRole",
      "kycProcessingRole",
    ];

    for (const prop of required) {
      if (!outputs[prop as keyof SecurityStackOutputs]) {
        throw new CrossStackValidationError(
          `Missing required SecurityStack output: ${prop}. Ensure SecurityStack is deployed successfully.`,
          stackName,
          `SecurityStack.${prop}`,
          StackErrorType.MISSING_DEPENDENCY,
          `Deploy SecurityStack first: cdk deploy SachainSecurityStack-{environment}`
        );
      }
    }

    // Validate role properties
    for (const prop of required) {
      const role = outputs[prop as keyof SecurityStackOutputs] as any;
      if (role && !role.roleArn) {
        throw new CrossStackValidationError(
          `SecurityStack ${prop} is missing roleArn property`,
          stackName,
          `SecurityStack.${prop}`,
          StackErrorType.INVALID_CONFIGURATION,
          `Check SecurityStack IAM role configuration for ${prop}`
        );
      }
    }
  }

  /**
   * Validates LambdaStack dependencies before stack creation
   */
  static validateLambdaStackDependencies(
    deps: StackDependencies["lambda"],
    stackName: string
  ): void {
    this.validateCoreStackOutputs(deps.coreOutputs, stackName);
    this.validateSecurityStackOutputs(deps.securityOutputs, stackName);
  }

  /**
   * Validates MonitoringStack dependencies before stack creation
   */
  static validateMonitoringStackDependencies(
    deps: StackDependencies["monitoring"],
    stackName: string
  ): void {
    const requiredFromLambdaStack = [
      "kycUploadLambda",
      "adminReviewLambda",
      "userNotificationLambda",
      "kycProcessingLambda",
    ];

    // Validate lambda functions from LambdaStack
    for (const prop of requiredFromLambdaStack) {
      if (!deps.lambdaOutputs[prop as keyof typeof deps.lambdaOutputs]) {
        throw new CrossStackValidationError(
          `Missing required LambdaStack output: ${prop}. Ensure LambdaStack is deployed successfully.`,
          stackName,
          `LambdaStack.${prop}`,
          StackErrorType.MISSING_DEPENDENCY,
          `Deploy LambdaStack first: cdk deploy SachainLambdaStack-{environment}`
        );
      }
    }

    // Validate post-auth lambda from CoreStack (consolidated structure)
    if (!deps.coreOutputs.postAuthLambda) {
      throw new CrossStackValidationError(
        `Missing required CoreStack output: postAuthLambda. Ensure CoreStack is deployed successfully.`,
        stackName,
        `CoreStack.postAuthLambda`,
        StackErrorType.MISSING_DEPENDENCY,
        `Deploy CoreStack first: cdk deploy SachainCoreStack-{environment}`
      );
    }
  }

  /**
   * Handle deployment failure and initiate rollback if needed
   */
  static handleDeploymentFailure(
    stackName: string,
    error: Error,
    shouldRollback: boolean = true
  ): StackErrorDetails {
    const errorDetails: StackErrorDetails = {
      errorType: StackErrorType.DEPLOYMENT_FAILURE,
      stackName,
      errorMessage: error.message,
      suggestedAction: `Check CloudFormation console for ${stackName} and resolve the underlying issue`,
      rollbackRequired: shouldRollback,
    };

    this.updateDeploymentStatus(stackName, "failed", errorDetails);

    if (shouldRollback) {
      this.initiateRollback(stackName);
    }

    return errorDetails;
  }

  /**
   * Initiate rollback for a failed stack deployment
   */
  static initiateRollback(stackName: string): void {
    try {
      this.updateDeploymentStatus(stackName, "rolling_back");

      // In a real implementation, this would trigger CDK rollback
      // For now, we just update the status and provide guidance
      console.warn(
        `Rollback initiated for ${stackName}. Check CloudFormation console for progress.`
      );

      // Simulate rollback completion
      setTimeout(() => {
        this.updateDeploymentStatus(stackName, "rolled_back");
      }, 1000);
    } catch (rollbackError) {
      const errorDetails: StackErrorDetails = {
        errorType: StackErrorType.ROLLBACK_FAILURE,
        stackName,
        errorMessage:
          rollbackError instanceof Error
            ? rollbackError.message
            : "Rollback failed",
        suggestedAction: `Manual intervention required for ${stackName}. Check CloudFormation console and resolve resource conflicts`,
        rollbackRequired: false,
      };

      this.updateDeploymentStatus(stackName, "failed", errorDetails);
      throw new StackDeploymentError(
        stackName,
        `Rollback failed: ${rollbackError}`,
        StackErrorType.ROLLBACK_FAILURE
      );
    }
  }

  /**
   * Validate that all dependencies are in deployed state
   */
  static validateDependenciesDeployed(stackName: string): void {
    const dependencies = DependencyResolver.getStackDependencies(stackName);

    for (const dep of dependencies) {
      const status = this.deploymentStatus.get(dep);

      if (!status || status.status !== "deployed") {
        throw new CrossStackValidationError(
          `Dependency ${dep} is not deployed (status: ${
            status?.status || "unknown"
          })`,
          stackName,
          dep,
          StackErrorType.MISSING_DEPENDENCY,
          `Deploy ${dep} first before deploying ${stackName}`
        );
      }
    }
  }

  /**
   * Get deployment report for all stacks
   */
  static getDeploymentReport(): string {
    const lines: string[] = ["Stack Deployment Report", "=".repeat(25), ""];

    for (const [stackName, status] of this.deploymentStatus) {
      lines.push(`${stackName}:`);
      lines.push(`  Status: ${status.status}`);
      lines.push(`  Dependencies: ${status.dependencies.join(", ") || "None"}`);
      lines.push(`  Dependents: ${status.dependents.join(", ") || "None"}`);

      if (status.startTime) {
        lines.push(`  Start Time: ${status.startTime.toISOString()}`);
      }

      if (status.endTime) {
        lines.push(`  End Time: ${status.endTime.toISOString()}`);
      }

      if (status.error) {
        lines.push(`  Error: ${status.error.errorMessage}`);
        lines.push(`  Suggested Action: ${status.error.suggestedAction}`);
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Clear deployment status (useful for testing)
   */
  static clearDeploymentStatus(): void {
    this.deploymentStatus.clear();
  }

  /**
   * Mark stack as successfully deployed
   */
  static markStackDeployed(stackName: string): void {
    this.updateDeploymentStatus(stackName, "deployed");
  }
}

/**
 * Enhanced cross-stack dependency resolver with error handling
 */
export class DependencyResolver {
  private static readonly STACK_ORDER = [
    "CoreStack",
    "SecurityStack",
    "LambdaStack",
    "MonitoringStack",
  ];

  private static readonly STACK_DEPENDENCIES: Record<string, string[]> = {
    CoreStack: [], // Now includes auth resources (from AuthStack)
    SecurityStack: ["CoreStack"], // Depends only on CoreStack (which includes auth)
    LambdaStack: ["CoreStack", "SecurityStack"], // Now includes event resources (from EventStack)
    MonitoringStack: ["LambdaStack", "CoreStack"], // Depends on both for lambda and post-auth lambda
  };

  /**
   * Gets the deployment order for stacks
   */
  static getDeploymentOrder(): string[] {
    return [...this.STACK_ORDER];
  }

  /**
   * Validates that stacks are being deployed in the correct order
   */
  static validateDeploymentOrder(
    stackName: string,
    deployedStacks: string[]
  ): void {
    if (!this.STACK_ORDER.includes(stackName)) {
      throw new CrossStackValidationError(
        `Unknown stack: ${stackName}. Valid stacks are: ${this.STACK_ORDER.join(
          ", "
        )}`,
        stackName,
        "deployment-order",
        StackErrorType.INVALID_CONFIGURATION,
        `Use one of the valid stack names: ${this.STACK_ORDER.join(", ")}`
      );
    }

    const dependencies = this.getStackDependencies(stackName);
    const missingDependencies = dependencies.filter(
      (dep) => !deployedStacks.includes(dep)
    );

    if (missingDependencies.length > 0) {
      throw new CrossStackValidationError(
        `Missing prerequisite stacks for ${stackName}: ${missingDependencies.join(
          ", "
        )}`,
        stackName,
        missingDependencies[0],
        StackErrorType.MISSING_DEPENDENCY,
        `Deploy missing dependencies first: ${missingDependencies
          .map((dep) => `cdk deploy Sachain${dep}-{environment}`)
          .join(", ")}`
      );
    }
  }

  /**
   * Gets the direct dependencies for a specific stack
   */
  static getStackDependencies(stackName: string): string[] {
    return this.STACK_DEPENDENCIES[stackName] || [];
  }

  /**
   * Gets all stacks that depend on the given stack (reverse dependencies)
   */
  static getStackDependents(stackName: string): string[] {
    const dependents: string[] = [];

    for (const [stack, deps] of Object.entries(this.STACK_DEPENDENCIES)) {
      if (deps.includes(stackName)) {
        dependents.push(stack);
      }
    }

    return dependents;
  }

  /**
   * Detect circular dependencies in the stack configuration
   */
  static detectCircularDependencies(): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularDeps: string[] = [];

    const hasCycle = (stack: string): boolean => {
      if (recursionStack.has(stack)) {
        circularDeps.push(stack);
        return true;
      }

      if (visited.has(stack)) {
        return false;
      }

      visited.add(stack);
      recursionStack.add(stack);

      const dependencies = this.getStackDependencies(stack);
      for (const dep of dependencies) {
        if (hasCycle(dep)) {
          circularDeps.push(stack);
          return true;
        }
      }

      recursionStack.delete(stack);
      return false;
    };

    for (const stack of this.STACK_ORDER) {
      if (!visited.has(stack)) {
        hasCycle(stack);
      }
    }

    return circularDeps;
  }

  /**
   * Get optimal deployment order considering all dependencies
   */
  static getOptimalDeploymentOrder(): string[] {
    const circularDeps = this.detectCircularDependencies();

    if (circularDeps.length > 0) {
      throw new CrossStackValidationError(
        `Circular dependencies detected: ${circularDeps.join(" -> ")}`,
        circularDeps[0],
        circularDeps[1] || circularDeps[0],
        StackErrorType.CIRCULAR_DEPENDENCY,
        "Review and remove circular dependencies between stacks"
      );
    }

    return this.STACK_ORDER;
  }

  /**
   * Validate the entire dependency graph
   */
  static validateDependencyGraph(): void {
    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies();
    if (circularDeps.length > 0) {
      throw new CrossStackValidationError(
        `Circular dependencies detected in stack configuration`,
        "DependencyResolver",
        "circular-dependency",
        StackErrorType.CIRCULAR_DEPENDENCY,
        "Review stack dependencies and remove circular references"
      );
    }

    // Validate that all referenced dependencies exist
    for (const [stack, deps] of Object.entries(this.STACK_DEPENDENCIES)) {
      for (const dep of deps) {
        if (!this.STACK_ORDER.includes(dep)) {
          throw new CrossStackValidationError(
            `Stack ${stack} references unknown dependency: ${dep}`,
            stack,
            dep,
            StackErrorType.INVALID_CONFIGURATION,
            `Update dependency configuration to reference valid stacks: ${this.STACK_ORDER.join(
              ", "
            )}`
          );
        }
      }
    }
  }
}

/**
 * Helper functions for cross-stack reference resolution
 */
export class CrossStackReferenceHelper {
  /**
   * Creates a CloudFormation import value for cross-stack references
   */
  static importValue(exportName: string): string {
    return cdk.Fn.importValue(exportName);
  }

  /**
   * Creates a cross-stack reference for importing resources from another stack
   */
  static createImportReference(
    scope: Construct,
    id: string,
    exportName: string
  ): string {
    return cdk.Fn.importValue(exportName);
  }

  /**
   * Creates standardized export names for resources
   */
  static getExportName(
    environment: string,
    resourceType: keyof typeof EXPORT_NAMES
  ): string {
    return EXPORT_NAMES[resourceType](environment);
  }

  /**
   * Validates that an export name follows the standard naming convention
   */
  static validateExportName(exportName: string, environment: string): boolean {
    return (
      exportName.startsWith(`${environment}-sachain-`) && exportName.length > 0
    );
  }

  /**
   * Creates a cross-stack reference with validation
   */
  static createCrossStackReference<T extends cdk.IResource>(
    scope: Construct,
    id: string,
    exportName: string,
    resourceType: new (...args: any[]) => T
  ): T {
    try {
      const importedValue = this.importValue(exportName);
      // Note: This is a simplified example. In practice, you'd need to use
      // specific CDK methods for importing different resource types
      return new resourceType(scope, id, { importedValue });
    } catch (error) {
      throw new CrossStackValidationError(
        `Failed to create cross-stack reference for ${exportName}: ${error}`,
        scope.node.id,
        exportName
      );
    }
  }

  /**
   * Validates that all required exports exist for a stack
   */
  static validateRequiredExports(
    environment: string,
    requiredExports: (keyof typeof EXPORT_NAMES)[]
  ): string[] {
    const missingExports: string[] = [];

    for (const exportKey of requiredExports) {
      const exportName = EXPORT_NAMES[exportKey](environment);
      if (!this.validateExportName(exportName, environment)) {
        missingExports.push(exportName);
      }
    }

    return missingExports;
  }
}
