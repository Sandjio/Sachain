/**
 * Cross-Stack Reference Validator
 *
 * Utilities for validating cross-stack dependencies and ensuring
 * proper resource resolution between stacks.
 */

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  CoreStackOutputs,
  SecurityStackOutputs,
  EventStackOutputs,
  AuthStackOutputs,
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
      "EventStack",
      "AuthStack",
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
        case "AuthStack":
          this.validateAuthStackDeployment(dependencies);
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
   * Validate SecurityStack deployment requirements
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
  }

  /**
   * Validate AuthStack deployment requirements
   */
  private static validateAuthStackDeployment(dependencies: any): void {
    // AuthStack has minimal dependencies, but we can validate configuration
    if (
      dependencies.postAuthLambda &&
      !dependencies.postAuthLambda.functionArn
    ) {
      throw new CrossStackValidationError(
        "Invalid post-auth Lambda configuration",
        "AuthStack",
        "LambdaStack.postAuthLambda",
        StackErrorType.INVALID_CONFIGURATION,
        "Ensure the post-auth Lambda function is properly configured"
      );
    }
  }

  /**
   * Validate LambdaStack deployment requirements
   */
  private static validateLambdaStackDeployment(dependencies: any): void {
    const requiredRoles = [
      "postAuthRole",
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
        "Cognito User Pool is required for LambdaStack",
        "LambdaStack",
        "AuthStack.userPool",
        StackErrorType.MISSING_DEPENDENCY
      );
    }
  }

  /**
   * Validate MonitoringStack deployment requirements
   */
  private static validateMonitoringStackDeployment(dependencies: any): void {
    const requiredLambdas = [
      "postAuthLambda",
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
  }
  /**
   * Validates CoreStack outputs with enhanced error handling
   */
  static validateCoreStackOutputs(
    outputs: Partial<CoreStackOutputs>,
    stackName: string
  ): void {
    // Skip validation for test stacks
    if (stackName.includes("Test")) {
      return;
    }

    const required = ["table", "documentBucket", "encryptionKey"];

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
  }

  /**
   * Validates SecurityStack outputs with enhanced error handling
   */
  static validateSecurityStackOutputs(
    outputs: Partial<SecurityStackOutputs>,
    stackName: string
  ): void {
    const required = [
      "postAuthRole",
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
   * Validates EventStack outputs with enhanced error handling
   */
  static validateEventStackOutputs(
    outputs: Partial<EventStackOutputs>,
    stackName: string
  ): void {
    const required = [
      "eventBus",
      "notificationTopic",
      "kycDocumentUploadedRule",
      "kycStatusChangeRule",
    ];

    for (const prop of required) {
      if (!outputs[prop as keyof EventStackOutputs]) {
        throw new CrossStackValidationError(
          `Missing required EventStack output: ${prop}. Ensure EventStack is deployed successfully.`,
          stackName,
          `EventStack.${prop}`,
          StackErrorType.MISSING_DEPENDENCY,
          `Deploy EventStack first: cdk deploy SachainEventStack-{environment}`
        );
      }
    }

    // Validate event resource properties
    if (outputs.eventBus && !outputs.eventBus.eventBusName) {
      throw new CrossStackValidationError(
        "EventStack eventBus is missing eventBusName property",
        stackName,
        "EventStack.eventBus",
        StackErrorType.INVALID_CONFIGURATION,
        "Check EventStack EventBridge configuration"
      );
    }

    if (outputs.notificationTopic && !outputs.notificationTopic.topicArn) {
      throw new CrossStackValidationError(
        "EventStack notificationTopic is missing topicArn property",
        stackName,
        "EventStack.notificationTopic",
        StackErrorType.INVALID_CONFIGURATION,
        "Check EventStack SNS topic configuration"
      );
    }
  }

  /**
   * Validates AuthStack outputs with enhanced error handling
   */
  static validateAuthStackOutputs(
    outputs: Partial<AuthStackOutputs>,
    stackName: string
  ): void {
    const required = ["userPool", "userPoolClient"];

    for (const prop of required) {
      if (!outputs[prop as keyof AuthStackOutputs]) {
        throw new CrossStackValidationError(
          `Missing required AuthStack output: ${prop}. Ensure AuthStack is deployed successfully.`,
          stackName,
          `AuthStack.${prop}`,
          StackErrorType.MISSING_DEPENDENCY,
          `Deploy AuthStack first: cdk deploy SachainAuthStack-{environment}`
        );
      }
    }

    // Validate Cognito resource properties
    if (outputs.userPool && !outputs.userPool.userPoolId) {
      throw new CrossStackValidationError(
        "AuthStack userPool is missing userPoolId property",
        stackName,
        "AuthStack.userPool",
        StackErrorType.INVALID_CONFIGURATION,
        "Check AuthStack Cognito User Pool configuration"
      );
    }

    if (outputs.userPoolClient && !outputs.userPoolClient.userPoolClientId) {
      throw new CrossStackValidationError(
        "AuthStack userPoolClient is missing userPoolClientId property",
        stackName,
        "AuthStack.userPoolClient",
        StackErrorType.INVALID_CONFIGURATION,
        "Check AuthStack Cognito User Pool Client configuration"
      );
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
    this.validateEventStackOutputs(deps.eventOutputs, stackName);
    this.validateAuthStackOutputs(deps.authOutputs, stackName);
  }

  /**
   * Validates MonitoringStack dependencies before stack creation
   */
  static validateMonitoringStackDependencies(
    deps: StackDependencies["monitoring"],
    stackName: string
  ): void {
    const required = [
      "postAuthLambda",
      "kycUploadLambda",
      "adminReviewLambda",
      "userNotificationLambda",
      "kycProcessingLambda",
    ];

    for (const prop of required) {
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

/**
 * Enhanced cross-stack dependency resolver with error handling
 */
export class DependencyResolver {
  private static readonly STACK_ORDER = [
    "CoreStack",
    "EventStack",
    "SecurityStack",
    "AuthStack",
    "LambdaStack",
    "MonitoringStack",
  ];

  private static readonly STACK_DEPENDENCIES: Record<string, string[]> = {
    CoreStack: [],
    EventStack: [],
    SecurityStack: ["CoreStack", "EventStack"],
    AuthStack: ["SecurityStack"],
    LambdaStack: ["CoreStack", "SecurityStack", "EventStack", "AuthStack"],
    MonitoringStack: ["LambdaStack"],
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
 * Resource reference tracker for debugging cross-stack issues
 */
export class ResourceReferenceTracker {
  private static references: Map<string, Set<string>> = new Map();

  /**
   * Records a cross-stack reference
   */
  static recordReference(
    fromStack: string,
    toStack: string,
    resourceName: string
  ): void {
    const key = `${fromStack}->${toStack}`;
    if (!this.references.has(key)) {
      this.references.set(key, new Set());
    }
    this.references.get(key)!.add(resourceName);
  }

  /**
   * Gets all recorded references
   */
  static getAllReferences(): Map<string, Set<string>> {
    return new Map(this.references);
  }

  /**
   * Gets references from a specific stack
   */
  static getReferencesFromStack(stackName: string): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();

    for (const [key, resources] of this.references) {
      if (key.startsWith(`${stackName}->`)) {
        result.set(key, resources);
      }
    }

    return result;
  }

  /**
   * Gets references to a specific stack
   */
  static getReferencesToStack(stackName: string): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();

    for (const [key, resources] of this.references) {
      if (key.endsWith(`->${stackName}`)) {
        result.set(key, resources);
      }
    }

    return result;
  }

  /**
   * Clears all recorded references (useful for testing)
   */
  static clearReferences(): void {
    this.references.clear();
  }

  /**
   * Generates a dependency report
   */
  static generateDependencyReport(): string {
    const lines: string[] = [
      "Cross-Stack Dependency Report",
      "=".repeat(35),
      "",
    ];

    for (const [key, resources] of this.references) {
      lines.push(`${key}:`);
      for (const resource of resources) {
        lines.push(`  - ${resource}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }
}
