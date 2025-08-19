/**
 * Tests for Deployment Error Handler
 */

import {
  DeploymentErrorHandler,
  DeploymentFailureReason,
  RecoveryAction,
} from "../../lib/utils/deployment-error-handler";
import {
  CrossStackValidator,
  StackErrorType,
  CrossStackValidationError,
  StackDeploymentError,
} from "../../lib/utils/cross-stack-validator";

describe("DeploymentErrorHandler", () => {
  beforeEach(() => {
    DeploymentErrorHandler.clearFailureHistory();
    CrossStackValidator.clearDeploymentStatus();
  });

  describe("Error Analysis", () => {
    test("should correctly identify resource limit exceeded errors", () => {
      const error = new Error("Limit exceeded for resource type");
      const context = DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack",
        "dev",
        error
      );

      expect(context.failureReason).toBe(
        DeploymentFailureReason.RESOURCE_LIMIT_EXCEEDED
      );
      expect(context.suggestedRecoveryAction).toBe(
        RecoveryAction.CONTACT_SUPPORT
      );
    });

    test("should correctly identify permission errors", () => {
      const error = new Error("Access denied - insufficient permissions");
      const context = DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack",
        "dev",
        error
      );

      expect(context.failureReason).toBe(
        DeploymentFailureReason.INSUFFICIENT_PERMISSIONS
      );
      expect(context.suggestedRecoveryAction).toBe(
        RecoveryAction.UPDATE_CONFIGURATION
      );
    });

    test("should correctly identify resource conflict errors", () => {
      const error = new Error("Resource already exists with the same name");
      const context = DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack",
        "dev",
        error
      );

      expect(context.failureReason).toBe(
        DeploymentFailureReason.RESOURCE_ALREADY_EXISTS
      );
      expect(context.suggestedRecoveryAction).toBe(
        RecoveryAction.UPDATE_CONFIGURATION
      );
    });

    test("should correctly identify timeout errors", () => {
      const error = new Error("Operation timed out after 30 minutes");
      const context = DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack",
        "dev",
        error
      );

      expect(context.failureReason).toBe(DeploymentFailureReason.TIMEOUT);
      expect(context.suggestedRecoveryAction).toBe(
        RecoveryAction.RETRY_DEPLOYMENT
      );
    });

    test("should handle unknown errors", () => {
      const error = new Error("Some unknown deployment error");
      const context = DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack",
        "dev",
        error
      );

      expect(context.failureReason).toBe(DeploymentFailureReason.UNKNOWN);
      expect(context.suggestedRecoveryAction).toBe(
        RecoveryAction.RETRY_DEPLOYMENT
      );
    });
  });

  describe("Recovery Actions", () => {
    test("should escalate to manual intervention after multiple failures", () => {
      const error = new Error("Some deployment error");

      // First failure
      DeploymentErrorHandler.handleDeploymentFailure("TestStack", "dev", error);

      // Second failure
      DeploymentErrorHandler.handleDeploymentFailure("TestStack", "dev", error);

      // Third failure - should escalate
      DeploymentErrorHandler.handleDeploymentFailure("TestStack", "dev", error);

      // Fourth failure - should escalate to manual intervention
      const context = DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack",
        "dev",
        error
      );

      expect(context.suggestedRecoveryAction).toBe(
        RecoveryAction.MANUAL_INTERVENTION
      );
    });

    test("should suggest delete and recreate for repeated resource conflicts", () => {
      const error = new Error("Resource already exists");

      // Multiple failures (need 3 for DELETE_AND_RECREATE)
      DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack2",
        "dev",
        error
      );
      DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack2",
        "dev",
        error
      );
      DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack2",
        "dev",
        error
      );
      const context = DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack2",
        "dev",
        error
      );

      expect(context.suggestedRecoveryAction).toBe(
        RecoveryAction.DELETE_AND_RECREATE
      );
    });
  });

  describe("Recovery Instructions", () => {
    test("should provide detailed instructions for permission errors", () => {
      const error = new Error("Access denied");
      const context = DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack",
        "dev",
        error
      );

      expect(context.detailedInstructions.join(" ")).toContain(
        "Check IAM permissions"
      );
      expect(context.detailedInstructions.join(" ")).toContain("cdk bootstrap");
    });

    test("should provide stack-specific commands in instructions", () => {
      const error = new Error("Some error");
      const context = DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack",
        "prod",
        error
      );

      const instructionsText = context.detailedInstructions.join(" ");
      expect(instructionsText).toContain("TestStack-prod");
    });
  });

  describe("Failure History", () => {
    test("should track failure history for stacks", () => {
      const error1 = new Error("First error");
      const error2 = new Error("Second error");

      DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack",
        "dev",
        error1
      );
      DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack",
        "dev",
        error2
      );

      const history = DeploymentErrorHandler.getFailureHistory("TestStack");
      expect(history).toHaveLength(2);
      expect(history[0].errorMessage).toBe("First error");
      expect(history[1].errorMessage).toBe("Second error");
    });

    test("should generate comprehensive failure report", () => {
      const error = new Error("Test error");
      DeploymentErrorHandler.handleDeploymentFailure("Stack1", "dev", error);
      DeploymentErrorHandler.handleDeploymentFailure("Stack2", "dev", error);

      const report = DeploymentErrorHandler.generateFailureReport();
      expect(report).toContain("Stack1");
      expect(report).toContain("Stack2");
      expect(report).toContain("UNKNOWN"); // The error reason, not the message
    });
  });

  describe("Rollback Handling", () => {
    test("should initialize error handling with rollback strategy", () => {
      const rollbackStrategy = {
        enabled: true,
        maxRetries: 2,
        retryDelaySeconds: 10,
        preserveData: true,
        notifyOnFailure: true,
        manualApprovalRequired: false,
      };

      expect(() => {
        DeploymentErrorHandler.initializeErrorHandling(
          "TestStack",
          rollbackStrategy
        );
      }).not.toThrow();
    });

    test("should handle rollback failure scenarios", async () => {
      const error = new Error("Deployment failed");

      // This should trigger rollback attempt
      const context = DeploymentErrorHandler.handleDeploymentFailure(
        "TestStack",
        "dev",
        error
      );

      expect(context.rollbackAttempted).toBe(true);
      // Note: In real implementation, we would test actual rollback logic
    });
  });
});

describe("CrossStackValidator Enhanced Error Handling", () => {
  beforeEach(() => {
    CrossStackValidator.clearDeploymentStatus();
  });

  describe("Deployment Status Tracking", () => {
    test("should initialize deployment tracking", () => {
      CrossStackValidator.initializeDeployment("TestStack", ["CoreStack"]);

      const status = CrossStackValidator.getDeploymentStatus();
      expect(status.has("TestStack")).toBe(true);
      expect(status.get("TestStack")?.status).toBe("pending");
    });

    test("should update deployment status", () => {
      CrossStackValidator.initializeDeployment("TestStack", []);
      CrossStackValidator.updateDeploymentStatus("TestStack", "deploying");

      const status = CrossStackValidator.getDeploymentStatus().get("TestStack");
      expect(status?.status).toBe("deploying");
      expect(status?.startTime).toBeDefined();
    });

    test("should mark stack as deployed", () => {
      CrossStackValidator.initializeDeployment("TestStack", []);
      CrossStackValidator.markStackDeployed("TestStack");

      const status = CrossStackValidator.getDeploymentStatus().get("TestStack");
      expect(status?.status).toBe("deployed");
    });
  });

  describe("Enhanced Validation", () => {
    test("should provide detailed error messages for missing dependencies", () => {
      expect(() => {
        CrossStackValidator.validateCoreStackOutputs({}, "TestStack");
      }).toThrow(CrossStackValidationError);

      try {
        CrossStackValidator.validateCoreStackOutputs({}, "TestStack");
      } catch (error) {
        if (error instanceof CrossStackValidationError) {
          expect(error.errorDetails.suggestedAction).toContain(
            "Deploy CoreStack first"
          );
          expect(error.errorDetails.errorType).toBe(
            StackErrorType.MISSING_DEPENDENCY
          );
        }
      }
    });

    test("should validate resource properties", () => {
      const mockTable = { tableName: "" } as any; // Invalid table without name

      expect(() => {
        CrossStackValidator.validateCoreStackOutputs(
          {
            table: mockTable,
            documentBucket: undefined,
            encryptionKey: undefined,
          },
          "TestStack"
        );
      }).toThrow(CrossStackValidationError);
    });
  });

  describe("Deployment Failure Handling", () => {
    test("should handle deployment failures with rollback", () => {
      const error = new Error("Deployment failed");

      const errorDetails = CrossStackValidator.handleDeploymentFailure(
        "TestStack",
        error,
        true
      );

      expect(errorDetails.errorType).toBe(StackErrorType.DEPLOYMENT_FAILURE);
      expect(errorDetails.rollbackRequired).toBe(true);
    });

    test("should validate dependencies are deployed", () => {
      // Initialize CoreStack as deployed
      CrossStackValidator.initializeDeployment("CoreStack", []);
      CrossStackValidator.markStackDeployed("CoreStack");

      // Initialize EventStack as deployed
      CrossStackValidator.initializeDeployment("EventStack", []);
      CrossStackValidator.markStackDeployed("EventStack");

      // SecurityStack should pass validation (depends on CoreStack and EventStack)
      expect(() => {
        CrossStackValidator.validateDependenciesDeployed("SecurityStack");
      }).not.toThrow();

      // LambdaStack should fail without SecurityStack deployed
      expect(() => {
        CrossStackValidator.validateDependenciesDeployed("LambdaStack");
      }).toThrow(CrossStackValidationError);
    });
  });

  describe("Deployment Report", () => {
    test("should generate comprehensive deployment report", () => {
      CrossStackValidator.initializeDeployment("CoreStack", []);
      CrossStackValidator.markStackDeployed("CoreStack");

      CrossStackValidator.initializeDeployment("SecurityStack", ["CoreStack"]);
      CrossStackValidator.updateDeploymentStatus("SecurityStack", "failed", {
        errorType: StackErrorType.DEPLOYMENT_FAILURE,
        stackName: "SecurityStack",
        errorMessage: "Test failure",
        suggestedAction: "Retry deployment",
        rollbackRequired: true,
      });

      const report = CrossStackValidator.getDeploymentReport();
      expect(report).toContain("CoreStack");
      expect(report).toContain("SecurityStack");
      expect(report).toContain("deployed");
      expect(report).toContain("failed");
      expect(report).toContain("Test failure");
    });
  });
});

describe("Integration Tests", () => {
  beforeEach(() => {
    DeploymentErrorHandler.clearFailureHistory();
    CrossStackValidator.clearDeploymentStatus();
  });

  test("should handle complete deployment failure scenario", () => {
    // Initialize stacks
    CrossStackValidator.initializeDeployment("CoreStack", []);
    DeploymentErrorHandler.initializeErrorHandling("CoreStack");

    // Simulate deployment failure
    const error = new Error("Resource limit exceeded");
    const failureContext = DeploymentErrorHandler.handleDeploymentFailure(
      "CoreStack",
      "dev",
      error
    );

    // Verify error handling
    expect(failureContext.failureReason).toBe(
      DeploymentFailureReason.RESOURCE_LIMIT_EXCEEDED
    );
    expect(failureContext.suggestedRecoveryAction).toBe(
      RecoveryAction.CONTACT_SUPPORT
    );

    // Manually update deployment status to simulate the integration
    CrossStackValidator.updateDeploymentStatus("CoreStack", "failed", {
      errorType: StackErrorType.DEPLOYMENT_FAILURE,
      stackName: "CoreStack",
      errorMessage: "Resource limit exceeded",
      suggestedAction: "Contact support",
      rollbackRequired: true,
    });

    // Verify deployment status updated
    const deploymentStatus =
      CrossStackValidator.getDeploymentStatus().get("CoreStack");
    expect(deploymentStatus?.status).toBe("failed");
    expect(deploymentStatus?.error).toBeDefined();
  });

  test("should handle dependency validation failure", () => {
    // Try to deploy SecurityStack without CoreStack
    expect(() => {
      CrossStackValidator.validateStackDeployment("SecurityStack", {
        table: undefined,
        documentBucket: undefined,
        encryptionKey: undefined,
      });
    }).toThrow(CrossStackValidationError);
  });
});
