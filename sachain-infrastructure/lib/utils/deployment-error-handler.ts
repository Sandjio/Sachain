/**
 * Deployment Error Handler
 *
 * Comprehensive error handling for CDK stack deployments,
 * including rollback scenarios and recovery strategies.
 */

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  CrossStackValidationError,
  StackDeploymentError,
  StackErrorType,
  StackErrorDetails,
  StackDeploymentStatus,
} from "./cross-stack-validator";

/**
 * Deployment failure reasons
 */
export enum DeploymentFailureReason {
  RESOURCE_LIMIT_EXCEEDED = "RESOURCE_LIMIT_EXCEEDED",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS",
  INVALID_PARAMETER_VALUE = "INVALID_PARAMETER_VALUE",
  DEPENDENCY_FAILURE = "DEPENDENCY_FAILURE",
  TIMEOUT = "TIMEOUT",
  ROLLBACK_FAILED = "ROLLBACK_FAILED",
  UNKNOWN = "UNKNOWN",
}

/**
 * Recovery action types
 */
export enum RecoveryAction {
  RETRY_DEPLOYMENT = "RETRY_DEPLOYMENT",
  MANUAL_INTERVENTION = "MANUAL_INTERVENTION",
  DELETE_AND_RECREATE = "DELETE_AND_RECREATE",
  UPDATE_CONFIGURATION = "UPDATE_CONFIGURATION",
  CONTACT_SUPPORT = "CONTACT_SUPPORT",
}

/**
 * Deployment failure context
 */
export interface DeploymentFailureContext {
  stackName: string;
  environment: string;
  failureReason: DeploymentFailureReason;
  resourceName?: string;
  errorCode?: string;
  errorMessage: string;
  timestamp: Date;
  rollbackAttempted: boolean;
  rollbackSuccessful?: boolean;
  suggestedRecoveryAction: RecoveryAction;
  detailedInstructions: string[];
}

/**
 * Rollback strategy configuration
 */
export interface RollbackStrategy {
  enabled: boolean;
  maxRetries: number;
  retryDelaySeconds: number;
  preserveData: boolean;
  notifyOnFailure: boolean;
  manualApprovalRequired: boolean;
}

/**
 * Deployment error handler with comprehensive recovery strategies
 */
export class DeploymentErrorHandler {
  private static failureHistory: Map<string, DeploymentFailureContext[]> =
    new Map();
  private static rollbackStrategies: Map<string, RollbackStrategy> = new Map();

  /**
   * Initialize error handling for a stack
   */
  static initializeErrorHandling(
    stackName: string,
    rollbackStrategy: RollbackStrategy = this.getDefaultRollbackStrategy()
  ): void {
    this.rollbackStrategies.set(stackName, rollbackStrategy);

    if (!this.failureHistory.has(stackName)) {
      this.failureHistory.set(stackName, []);
    }
  }

  /**
   * Handle deployment failure with comprehensive error analysis
   */
  static handleDeploymentFailure(
    stackName: string,
    environment: string,
    error: Error,
    resourceName?: string
  ): DeploymentFailureContext {
    const failureReason = this.analyzeFailureReason(error);
    const recoveryAction = this.determineRecoveryAction(
      failureReason,
      stackName
    );

    const failureContext: DeploymentFailureContext = {
      stackName,
      environment,
      failureReason,
      resourceName,
      errorMessage: error.message,
      timestamp: new Date(),
      rollbackAttempted: false,
      suggestedRecoveryAction: recoveryAction,
      detailedInstructions: this.getRecoveryInstructions(
        failureReason,
        stackName,
        environment
      ),
    };

    // Record failure in history
    const history = this.failureHistory.get(stackName) || [];
    history.push(failureContext);
    this.failureHistory.set(stackName, history);

    // Attempt rollback if strategy allows
    const rollbackStrategy = this.rollbackStrategies.get(stackName);
    if (rollbackStrategy?.enabled) {
      this.attemptRollback(failureContext, rollbackStrategy);
    }

    // Log comprehensive error information
    this.logFailureDetails(failureContext);

    return failureContext;
  }

  /**
   * Analyze error to determine failure reason
   */
  private static analyzeFailureReason(error: Error): DeploymentFailureReason {
    const errorMessage = error.message.toLowerCase();

    if (
      errorMessage.includes("limit exceeded") ||
      errorMessage.includes("quota")
    ) {
      return DeploymentFailureReason.RESOURCE_LIMIT_EXCEEDED;
    }

    if (
      errorMessage.includes("access denied") ||
      errorMessage.includes("unauthorized")
    ) {
      return DeploymentFailureReason.INSUFFICIENT_PERMISSIONS;
    }

    if (
      errorMessage.includes("already exists") ||
      errorMessage.includes("duplicate")
    ) {
      return DeploymentFailureReason.RESOURCE_ALREADY_EXISTS;
    }

    if (
      errorMessage.includes("invalid parameter") ||
      errorMessage.includes("validation")
    ) {
      return DeploymentFailureReason.INVALID_PARAMETER_VALUE;
    }

    if (
      errorMessage.includes("dependency") ||
      errorMessage.includes("prerequisite")
    ) {
      return DeploymentFailureReason.DEPENDENCY_FAILURE;
    }

    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("timed out")
    ) {
      return DeploymentFailureReason.TIMEOUT;
    }

    if (errorMessage.includes("rollback")) {
      return DeploymentFailureReason.ROLLBACK_FAILED;
    }

    return DeploymentFailureReason.UNKNOWN;
  }

  /**
   * Determine appropriate recovery action based on failure reason
   */
  private static determineRecoveryAction(
    failureReason: DeploymentFailureReason,
    stackName: string
  ): RecoveryAction {
    const failureCount = this.getFailureCount(stackName);

    switch (failureReason) {
      case DeploymentFailureReason.RESOURCE_LIMIT_EXCEEDED:
        return RecoveryAction.CONTACT_SUPPORT;

      case DeploymentFailureReason.INSUFFICIENT_PERMISSIONS:
        return RecoveryAction.UPDATE_CONFIGURATION;

      case DeploymentFailureReason.RESOURCE_ALREADY_EXISTS:
        return failureCount > 2
          ? RecoveryAction.DELETE_AND_RECREATE
          : RecoveryAction.UPDATE_CONFIGURATION;

      case DeploymentFailureReason.INVALID_PARAMETER_VALUE:
        return RecoveryAction.UPDATE_CONFIGURATION;

      case DeploymentFailureReason.DEPENDENCY_FAILURE:
        return RecoveryAction.RETRY_DEPLOYMENT;

      case DeploymentFailureReason.TIMEOUT:
        return failureCount > 1
          ? RecoveryAction.MANUAL_INTERVENTION
          : RecoveryAction.RETRY_DEPLOYMENT;

      case DeploymentFailureReason.ROLLBACK_FAILED:
        return RecoveryAction.MANUAL_INTERVENTION;

      default:
        return failureCount > 2
          ? RecoveryAction.MANUAL_INTERVENTION
          : RecoveryAction.RETRY_DEPLOYMENT;
    }
  }

  /**
   * Get detailed recovery instructions
   */
  private static getRecoveryInstructions(
    failureReason: DeploymentFailureReason,
    stackName: string,
    environment: string
  ): string[] {
    const baseCommands = {
      deploy: `cdk deploy ${stackName}-${environment}`,
      destroy: `cdk destroy ${stackName}-${environment}`,
      diff: `cdk diff ${stackName}-${environment}`,
      synth: `cdk synth ${stackName}-${environment}`,
    };

    switch (failureReason) {
      case DeploymentFailureReason.RESOURCE_LIMIT_EXCEEDED:
        return [
          "1. Check AWS service quotas in the AWS Console",
          "2. Request quota increases if needed",
          "3. Consider using different resource configurations",
          "4. Contact AWS support for assistance",
        ];

      case DeploymentFailureReason.INSUFFICIENT_PERMISSIONS:
        return [
          "1. Check IAM permissions for the deployment role",
          "2. Ensure CDK bootstrap has been run: cdk bootstrap",
          "3. Verify AWS credentials are configured correctly",
          `4. Review CloudFormation events for ${stackName}-${environment}`,
        ];

      case DeploymentFailureReason.RESOURCE_ALREADY_EXISTS:
        return [
          `1. Check if resources already exist: ${baseCommands.diff}`,
          "2. Import existing resources if appropriate",
          `3. Or delete existing resources and redeploy: ${baseCommands.destroy} && ${baseCommands.deploy}`,
          "4. Ensure resource names are unique across environments",
        ];

      case DeploymentFailureReason.INVALID_PARAMETER_VALUE:
        return [
          "1. Review stack configuration parameters",
          `2. Validate configuration: ${baseCommands.synth}`,
          "3. Check environment-specific settings",
          "4. Ensure all required parameters are provided",
        ];

      case DeploymentFailureReason.DEPENDENCY_FAILURE:
        return [
          "1. Verify all prerequisite stacks are deployed",
          "2. Check cross-stack references are correct",
          "3. Ensure dependency stacks are in COMPLETE state",
          `4. Retry deployment: ${baseCommands.deploy}`,
        ];

      case DeploymentFailureReason.TIMEOUT:
        return [
          `1. Retry deployment: ${baseCommands.deploy}`,
          "2. Check CloudFormation events for stuck resources",
          "3. Consider deploying in smaller batches",
          "4. Increase timeout values if configurable",
        ];

      case DeploymentFailureReason.ROLLBACK_FAILED:
        return [
          "1. Check CloudFormation console for stuck resources",
          "2. Manually resolve resource conflicts",
          "3. Delete problematic resources if safe",
          "4. Contact AWS support if resources cannot be cleaned up",
        ];

      default:
        return [
          `1. Check CloudFormation events: AWS Console > CloudFormation > ${stackName}-${environment}`,
          `2. Review stack outputs: ${baseCommands.diff}`,
          `3. Retry deployment: ${baseCommands.deploy}`,
          "4. Contact support if issue persists",
        ];
    }
  }

  /**
   * Attempt rollback with retry logic
   */
  private static async attemptRollback(
    failureContext: DeploymentFailureContext,
    strategy: RollbackStrategy
  ): Promise<void> {
    failureContext.rollbackAttempted = true;

    try {
      console.log(`Attempting rollback for ${failureContext.stackName}...`);

      // In a real implementation, this would call CDK rollback APIs
      // For now, we simulate the rollback process

      let retryCount = 0;
      while (retryCount < strategy.maxRetries) {
        try {
          // Simulate rollback operation
          await this.simulateRollback(failureContext.stackName, strategy);

          failureContext.rollbackSuccessful = true;
          console.log(`Rollback successful for ${failureContext.stackName}`);
          return;
        } catch (rollbackError) {
          retryCount++;
          console.warn(
            `Rollback attempt ${retryCount} failed for ${failureContext.stackName}: ${rollbackError}`
          );

          if (retryCount < strategy.maxRetries) {
            await this.delay(strategy.retryDelaySeconds * 1000);
          }
        }
      }

      failureContext.rollbackSuccessful = false;
      throw new Error(`Rollback failed after ${strategy.maxRetries} attempts`);
    } catch (error) {
      failureContext.rollbackSuccessful = false;
      console.error(
        `Rollback failed for ${failureContext.stackName}: ${error}`
      );

      if (strategy.notifyOnFailure) {
        this.notifyRollbackFailure(failureContext);
      }
    }
  }

  /**
   * Simulate rollback operation (replace with actual CDK rollback in real implementation)
   */
  private static async simulateRollback(
    stackName: string,
    strategy: RollbackStrategy
  ): Promise<void> {
    // Simulate rollback delay
    await this.delay(2000);

    // Simulate potential rollback failure for testing
    if (Math.random() < 0.1) {
      // 10% chance of rollback failure
      throw new Error("Simulated rollback failure");
    }
  }

  /**
   * Notify about rollback failure
   */
  private static notifyRollbackFailure(
    failureContext: DeploymentFailureContext
  ): void {
    console.error(`ROLLBACK FAILURE NOTIFICATION: ${failureContext.stackName}`);
    console.error(`Environment: ${failureContext.environment}`);
    console.error(`Original Error: ${failureContext.errorMessage}`);
    console.error(`Manual intervention required.`);
  }

  /**
   * Get failure count for a stack
   */
  private static getFailureCount(stackName: string): number {
    const history = this.failureHistory.get(stackName) || [];
    return history.length;
  }

  /**
   * Get default rollback strategy
   */
  private static getDefaultRollbackStrategy(): RollbackStrategy {
    return {
      enabled: true,
      maxRetries: 3,
      retryDelaySeconds: 30,
      preserveData: true,
      notifyOnFailure: true,
      manualApprovalRequired: false,
    };
  }

  /**
   * Log comprehensive failure details
   */
  private static logFailureDetails(
    failureContext: DeploymentFailureContext
  ): void {
    console.error("=".repeat(60));
    console.error("DEPLOYMENT FAILURE DETECTED");
    console.error("=".repeat(60));
    console.error(`Stack: ${failureContext.stackName}`);
    console.error(`Environment: ${failureContext.environment}`);
    console.error(`Failure Reason: ${failureContext.failureReason}`);
    console.error(`Resource: ${failureContext.resourceName || "N/A"}`);
    console.error(`Error: ${failureContext.errorMessage}`);
    console.error(`Timestamp: ${failureContext.timestamp.toISOString()}`);
    console.error(
      `Suggested Action: ${failureContext.suggestedRecoveryAction}`
    );
    console.error("");
    console.error("Recovery Instructions:");
    failureContext.detailedInstructions.forEach((instruction, index) => {
      console.error(`  ${instruction}`);
    });
    console.error("=".repeat(60));
  }

  /**
   * Get failure history for a stack
   */
  static getFailureHistory(stackName: string): DeploymentFailureContext[] {
    return this.failureHistory.get(stackName) || [];
  }

  /**
   * Clear failure history (useful for testing)
   */
  static clearFailureHistory(): void {
    this.failureHistory.clear();
  }

  /**
   * Generate failure report
   */
  static generateFailureReport(): string {
    const lines: string[] = ["Deployment Failure Report", "=".repeat(30), ""];

    for (const [stackName, failures] of this.failureHistory) {
      lines.push(`${stackName} (${failures.length} failures):`);

      failures.forEach((failure, index) => {
        lines.push(`  ${index + 1}. ${failure.timestamp.toISOString()}`);
        lines.push(`     Reason: ${failure.failureReason}`);
        lines.push(`     Action: ${failure.suggestedRecoveryAction}`);
        lines.push(
          `     Rollback: ${
            failure.rollbackAttempted
              ? failure.rollbackSuccessful
                ? "Success"
                : "Failed"
              : "Not Attempted"
          }`
        );
      });

      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Utility method for delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
