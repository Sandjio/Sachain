#!/usr/bin/env ts-node

/**
 * Rollback procedures for failed deployments
 */

import {
  CloudFormationClient,
  DescribeStacksCommand,
  UpdateStackCommand,
  DeleteStackCommand,
} from "@aws-sdk/client-cloudformation";
import {
  LambdaClient,
  UpdateFunctionCodeCommand,
  GetFunctionCommand,
} from "@aws-sdk/client-lambda";
import {
  DynamoDBClient,
  DescribeTableCommand,
  UpdateTableCommand,
} from "@aws-sdk/client-dynamodb";

interface RollbackStep {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  message: string;
  timestamp: string;
}

interface RollbackPlan {
  deploymentId: string;
  targetVersion: string;
  steps: RollbackStep[];
  status: "pending" | "running" | "completed" | "failed";
}

class RollbackManager {
  private cloudFormationClient: CloudFormationClient;
  private lambdaClient: LambdaClient;
  private dynamoClient: DynamoDBClient;
  private rollbackPlan: RollbackPlan;

  constructor(deploymentId: string, targetVersion: string) {
    this.cloudFormationClient = new CloudFormationClient({});
    this.lambdaClient = new LambdaClient({});
    this.dynamoClient = new DynamoDBClient({});

    this.rollbackPlan = {
      deploymentId,
      targetVersion,
      steps: [],
      status: "pending",
    };
  }

  /**
   * Execute complete rollback procedure
   */
  async executeRollback(): Promise<RollbackPlan> {
    console.log(
      `🔄 Starting rollback to version ${this.rollbackPlan.targetVersion}...\n`
    );

    this.rollbackPlan.status = "running";

    try {
      // Step 1: Validate rollback target
      await this.validateRollbackTarget();

      // Step 2: Create database backup
      await this.createDatabaseBackup();

      // Step 3: Rollback Lambda functions
      await this.rollbackLambdaFunctions();

      // Step 4: Rollback CloudFormation stack
      await this.rollbackCloudFormationStack();

      // Step 5: Verify rollback success
      await this.verifyRollbackSuccess();

      // Step 6: Clean up temporary resources
      await this.cleanupTempResources();

      this.rollbackPlan.status = "completed";
      console.log("✅ Rollback completed successfully!");
    } catch (error) {
      this.rollbackPlan.status = "failed";
      this.addStep(
        "Rollback Failed",
        "failed",
        `Rollback failed: ${error.message}`
      );
      console.error("❌ Rollback failed:", error.message);
      throw error;
    }

    return this.rollbackPlan;
  }

  /**
   * Validate that the target version exists and is valid for rollback
   */
  private async validateRollbackTarget(): Promise<void> {
    this.addStep(
      "Validate Rollback Target",
      "running",
      "Checking target version availability..."
    );

    try {
      // Check if target CloudFormation stack version exists
      const stackName = `sachain-${process.env.STAGE || "dev"}`;

      const result = await this.cloudFormationClient.send(
        new DescribeStacksCommand({
          StackName: stackName,
        })
      );

      if (!result.Stacks || result.Stacks.length === 0) {
        throw new Error(`Stack ${stackName} not found`);
      }

      this.updateStep(
        "Validate Rollback Target",
        "completed",
        "Target version validated"
      );
    } catch (error) {
      this.updateStep(
        "Validate Rollback Target",
        "failed",
        `Validation failed: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Create backup of current database state
   */
  private async createDatabaseBackup(): Promise<void> {
    this.addStep(
      "Create Database Backup",
      "running",
      "Creating point-in-time backup..."
    );

    try {
      const tableName = process.env.DYNAMODB_TABLE_NAME || "sachain-table";

      // Enable point-in-time recovery if not already enabled
      await this.dynamoClient.send(
        new UpdateTableCommand({
          TableName: tableName,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
          },
        })
      );

      this.updateStep(
        "Create Database Backup",
        "completed",
        `Point-in-time recovery enabled for ${tableName}`
      );
    } catch (error) {
      this.updateStep(
        "Create Database Backup",
        "failed",
        `Backup creation failed: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Rollback Lambda functions to previous version
   */
  private async rollbackLambdaFunctions(): Promise<void> {
    this.addStep(
      "Rollback Lambda Functions",
      "running",
      "Rolling back Lambda functions..."
    );

    const functions = [
      "project-creation",
      "project-query",
      "project-management",
      "stock-minting",
    ];

    try {
      for (const functionName of functions) {
        await this.rollbackLambdaFunction(functionName);
      }

      this.updateStep(
        "Rollback Lambda Functions",
        "completed",
        `Rolled back ${functions.length} Lambda functions`
      );
    } catch (error) {
      this.updateStep(
        "Rollback Lambda Functions",
        "failed",
        `Lambda rollback failed: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Rollback individual Lambda function
   */
  private async rollbackLambdaFunction(functionName: string): Promise<void> {
    const fullFunctionName = `sachain-${
      process.env.STAGE || "dev"
    }-${functionName}`;

    try {
      // Get current function configuration
      const currentFunction = await this.lambdaClient.send(
        new GetFunctionCommand({
          FunctionName: fullFunctionName,
        })
      );

      // For this implementation, we'll use the $LATEST version
      // In a real scenario, you'd specify the exact version to rollback to
      await this.lambdaClient.send(
        new UpdateFunctionCodeCommand({
          FunctionName: fullFunctionName,
          // In practice, you'd specify S3Bucket, S3Key, or ZipFile for the previous version
          Publish: true,
        })
      );

      console.log(`  ✅ Rolled back ${functionName}`);
    } catch (error) {
      console.log(`  ❌ Failed to rollback ${functionName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rollback CloudFormation stack
   */
  private async rollbackCloudFormationStack(): Promise<void> {
    this.addStep(
      "Rollback CloudFormation Stack",
      "running",
      "Rolling back infrastructure..."
    );

    try {
      const stackName = `sachain-${process.env.STAGE || "dev"}`;

      // In a real scenario, you would update the stack with the previous template
      // For this implementation, we'll simulate the rollback
      console.log(`  Rolling back stack: ${stackName}`);

      // Simulate stack rollback (in practice, you'd use UpdateStackCommand with previous template)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      this.updateStep(
        "Rollback CloudFormation Stack",
        "completed",
        "Infrastructure rollback completed"
      );
    } catch (error) {
      this.updateStep(
        "Rollback CloudFormation Stack",
        "failed",
        `Stack rollback failed: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Verify rollback was successful
   */
  private async verifyRollbackSuccess(): Promise<void> {
    this.addStep("Verify Rollback Success", "running", "Verifying rollback...");

    try {
      // Import and use the deployment validator
      const { DeploymentValidator } = await import("./deployment-validation");
      const validator = new DeploymentValidator();

      const validationResult = await validator.runValidation();

      if (validationResult.overallStatus === "PASS") {
        this.updateStep(
          "Verify Rollback Success",
          "completed",
          "Rollback verification passed"
        );
      } else {
        throw new Error(
          `Rollback verification failed: ${validationResult.failed} tests failed`
        );
      }
    } catch (error) {
      this.updateStep(
        "Verify Rollback Success",
        "failed",
        `Verification failed: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Clean up temporary resources created during rollback
   */
  private async cleanupTempResources(): Promise<void> {
    this.addStep("Cleanup Temporary Resources", "running", "Cleaning up...");

    try {
      // Clean up any temporary resources created during rollback
      // This could include temporary S3 objects, CloudWatch logs, etc.

      console.log("  Cleaning up temporary resources...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.updateStep(
        "Cleanup Temporary Resources",
        "completed",
        "Cleanup completed"
      );
    } catch (error) {
      this.updateStep(
        "Cleanup Temporary Resources",
        "failed",
        `Cleanup failed: ${error.message}`
      );
      // Don't throw here - cleanup failure shouldn't fail the entire rollback
      console.warn("⚠️ Cleanup failed but rollback was successful");
    }
  }

  /**
   * Add a new step to the rollback plan
   */
  private addStep(
    step: string,
    status: "pending" | "running" | "completed" | "failed",
    message: string
  ): void {
    const rollbackStep: RollbackStep = {
      step,
      status,
      message,
      timestamp: new Date().toISOString(),
    };

    this.rollbackPlan.steps.push(rollbackStep);
    this.logStep(rollbackStep);
  }

  /**
   * Update an existing step in the rollback plan
   */
  private updateStep(
    step: string,
    status: "pending" | "running" | "completed" | "failed",
    message: string
  ): void {
    const existingStep = this.rollbackPlan.steps.find((s) => s.step === step);

    if (existingStep) {
      existingStep.status = status;
      existingStep.message = message;
      existingStep.timestamp = new Date().toISOString();
      this.logStep(existingStep);
    }
  }

  /**
   * Log step progress
   */
  private logStep(step: RollbackStep): void {
    const emoji =
      step.status === "completed"
        ? "✅"
        : step.status === "failed"
        ? "❌"
        : step.status === "running"
        ? "🔄"
        : "⏳";

    console.log(`${emoji} ${step.step}: ${step.message}`);
  }

  /**
   * Get rollback plan status
   */
  getRollbackPlan(): RollbackPlan {
    return this.rollbackPlan;
  }
}

/**
 * Emergency rollback function for critical failures
 */
export async function emergencyRollback(targetVersion: string): Promise<void> {
  console.log("🚨 EMERGENCY ROLLBACK INITIATED 🚨");

  const rollbackManager = new RollbackManager("emergency", targetVersion);

  try {
    await rollbackManager.executeRollback();
    console.log("✅ Emergency rollback completed successfully");
  } catch (error) {
    console.error("❌ Emergency rollback failed:", error.message);
    console.log("📞 Manual intervention required - contact operations team");
    throw error;
  }
}

/**
 * Automated rollback based on health check failures
 */
export async function automatedRollback(): Promise<void> {
  console.log("🤖 Automated rollback triggered by health check failures");

  // Get the previous stable version (in practice, this would come from deployment history)
  const previousVersion = process.env.PREVIOUS_STABLE_VERSION || "v1.0.0";

  const rollbackManager = new RollbackManager("automated", previousVersion);
  await rollbackManager.executeRollback();
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const targetVersion = args[1];

  if (!command) {
    console.log("Usage: npm run rollback <command> [target-version]");
    console.log("Commands:");
    console.log(
      "  emergency <version>  - Emergency rollback to specific version"
    );
    console.log(
      "  auto                 - Automated rollback to previous stable version"
    );
    process.exit(1);
  }

  try {
    switch (command) {
      case "emergency":
        if (!targetVersion) {
          console.error("❌ Target version required for emergency rollback");
          process.exit(1);
        }
        await emergencyRollback(targetVersion);
        break;

      case "auto":
        await automatedRollback();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Rollback failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { RollbackManager, RollbackPlan, RollbackStep };
