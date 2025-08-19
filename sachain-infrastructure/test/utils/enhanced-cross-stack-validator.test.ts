/**
 * Tests for Enhanced Cross-Stack Validator
 */

import {
  CrossStackValidator,
  DependencyResolver,
  CrossStackValidationError,
  StackDeploymentError,
  StackErrorType,
} from "../../lib/utils/cross-stack-validator";

describe("Enhanced CrossStackValidator", () => {
  beforeEach(() => {
    CrossStackValidator.clearDeploymentStatus();
  });

  describe("Stack Deployment Validation", () => {
    test("should validate CoreStack deployment successfully", () => {
      expect(() => {
        CrossStackValidator.validateStackDeployment("CoreStack", {});
      }).not.toThrow();

      const status = CrossStackValidator.getDeploymentStatus().get("CoreStack");
      expect(status?.status).toBe("deploying");
    });

    test("should validate SecurityStack with proper dependencies", () => {
      // First deploy CoreStack
      CrossStackValidator.validateStackDeployment("CoreStack", {});
      CrossStackValidator.markStackDeployed("CoreStack");

      // Deploy EventStack
      CrossStackValidator.validateStackDeployment("EventStack", {});
      CrossStackValidator.markStackDeployed("EventStack");

      // Now SecurityStack should validate successfully
      const mockDependencies = {
        table: { tableName: "test-table" },
        documentBucket: { bucketName: "test-bucket" },
        encryptionKey: { keyId: "test-key" },
      };

      expect(() => {
        CrossStackValidator.validateStackDeployment(
          "SecurityStack",
          mockDependencies
        );
      }).not.toThrow();
    });

    test("should fail SecurityStack validation without dependencies", () => {
      expect(() => {
        CrossStackValidator.validateStackDeployment("SecurityStack", {
          table: undefined,
          documentBucket: undefined,
          encryptionKey: undefined,
        });
      }).toThrow(CrossStackValidationError);
    });

    test("should validate LambdaStack with all dependencies", () => {
      // Deploy CoreStack with proper dependencies
      CrossStackValidator.validateStackDeployment("CoreStack", {});
      CrossStackValidator.markStackDeployed("CoreStack");

      // Deploy EventStack
      CrossStackValidator.validateStackDeployment("EventStack", {});
      CrossStackValidator.markStackDeployed("EventStack");

      // Deploy SecurityStack with proper dependencies
      const securityDeps = {
        table: { tableName: "test-table" },
        documentBucket: { bucketName: "test-bucket" },
        encryptionKey: { keyId: "test-key" },
      };
      CrossStackValidator.validateStackDeployment(
        "SecurityStack",
        securityDeps
      );
      CrossStackValidator.markStackDeployed("SecurityStack");

      // Deploy AuthStack
      CrossStackValidator.validateStackDeployment("AuthStack", {});
      CrossStackValidator.markStackDeployed("AuthStack");

      const mockDependencies = {
        postAuthRole: { roleArn: "arn:aws:iam::123456789012:role/test" },
        kycUploadRole: { roleArn: "arn:aws:iam::123456789012:role/test" },
        adminReviewRole: { roleArn: "arn:aws:iam::123456789012:role/test" },
        userNotificationRole: {
          roleArn: "arn:aws:iam::123456789012:role/test",
        },
        kycProcessingRole: { roleArn: "arn:aws:iam::123456789012:role/test" },
        userPool: { userPoolId: "test-pool" },
      };

      expect(() => {
        CrossStackValidator.validateStackDeployment(
          "LambdaStack",
          mockDependencies
        );
      }).not.toThrow();
    });
  });

  describe("Enhanced Validation Methods", () => {
    test("should validate CoreStack outputs with detailed errors", () => {
      const invalidOutputs = {
        table: { tableName: "" }, // Invalid - empty name
        documentBucket: undefined,
        encryptionKey: undefined,
      };

      expect(() => {
        CrossStackValidator.validateCoreStackOutputs(
          invalidOutputs,
          "TestStack"
        );
      }).toThrow(CrossStackValidationError);

      try {
        CrossStackValidator.validateCoreStackOutputs(
          invalidOutputs,
          "TestStack"
        );
      } catch (error) {
        if (error instanceof CrossStackValidationError) {
          expect(error.errorDetails.errorType).toBe(
            StackErrorType.MISSING_DEPENDENCY
          );
          expect(error.errorDetails.suggestedAction).toContain(
            "Deploy CoreStack first"
          );
        }
      }
    });

    test("should validate SecurityStack outputs with role validation", () => {
      const invalidOutputs = {
        postAuthRole: { roleArn: "" }, // Invalid - empty ARN
        kycUploadRole: undefined,
        adminReviewRole: undefined,
        userNotificationRole: undefined,
        kycProcessingRole: undefined,
      };

      expect(() => {
        CrossStackValidator.validateSecurityStackOutputs(
          invalidOutputs,
          "TestStack"
        );
      }).toThrow(CrossStackValidationError);
    });

    test("should validate EventStack outputs with resource properties", () => {
      const invalidOutputs = {
        eventBus: { eventBusName: "" }, // Invalid - empty name
        notificationTopic: undefined,
        kycDocumentUploadedRule: undefined,
        kycStatusChangeRule: undefined,
      };

      expect(() => {
        CrossStackValidator.validateEventStackOutputs(
          invalidOutputs,
          "TestStack"
        );
      }).toThrow(CrossStackValidationError);
    });

    test("should validate AuthStack outputs with Cognito validation", () => {
      const invalidOutputs = {
        userPool: { userPoolId: "" }, // Invalid - empty ID
        userPoolClient: undefined,
      };

      expect(() => {
        CrossStackValidator.validateAuthStackOutputs(
          invalidOutputs,
          "TestStack"
        );
      }).toThrow(CrossStackValidationError);
    });
  });

  describe("Deployment Status Management", () => {
    test("should track deployment lifecycle", () => {
      // Initialize
      CrossStackValidator.initializeDeployment("TestStack", ["CoreStack"]);
      let status = CrossStackValidator.getDeploymentStatus().get("TestStack");
      expect(status?.status).toBe("pending");

      // Start deployment
      CrossStackValidator.updateDeploymentStatus("TestStack", "deploying");
      status = CrossStackValidator.getDeploymentStatus().get("TestStack");
      expect(status?.status).toBe("deploying");
      expect(status?.startTime).toBeDefined();

      // Complete deployment
      CrossStackValidator.markStackDeployed("TestStack");
      status = CrossStackValidator.getDeploymentStatus().get("TestStack");
      expect(status?.status).toBe("deployed");
      expect(status?.endTime).toBeDefined();
    });

    test("should handle deployment failures", () => {
      CrossStackValidator.initializeDeployment("TestStack", []);

      const error = new Error("Test deployment failure");
      const errorDetails = CrossStackValidator.handleDeploymentFailure(
        "TestStack",
        error,
        false // Don't rollback to keep status as "failed"
      );

      expect(errorDetails.errorType).toBe(StackErrorType.DEPLOYMENT_FAILURE);
      expect(errorDetails.rollbackRequired).toBe(false); // We disabled rollback

      const status = CrossStackValidator.getDeploymentStatus().get("TestStack");
      expect(status?.status).toBe("failed");
      expect(status?.error).toBeDefined();
    });

    test("should validate dependencies are deployed before deployment", () => {
      // CoreStack not deployed
      expect(() => {
        CrossStackValidator.validateDependenciesDeployed("SecurityStack");
      }).toThrow(CrossStackValidationError);

      // Deploy CoreStack
      CrossStackValidator.initializeDeployment("CoreStack", []);
      CrossStackValidator.markStackDeployed("CoreStack");

      // Deploy EventStack
      CrossStackValidator.initializeDeployment("EventStack", []);
      CrossStackValidator.markStackDeployed("EventStack");

      // Now SecurityStack should pass
      expect(() => {
        CrossStackValidator.validateDependenciesDeployed("SecurityStack");
      }).not.toThrow();
    });
  });

  describe("Rollback Handling", () => {
    test("should initiate rollback on deployment failure", () => {
      CrossStackValidator.initializeDeployment("TestStack", []);

      // Mock console.warn to capture rollback message
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      CrossStackValidator.initiateRollback("TestStack");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Rollback initiated for TestStack")
      );

      const status = CrossStackValidator.getDeploymentStatus().get("TestStack");
      expect(status?.status).toBe("rolling_back");

      consoleSpy.mockRestore();
    });

    test("should handle rollback failures", () => {
      CrossStackValidator.initializeDeployment("TestStack", []);

      // Mock rollback to fail
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback) => {
        throw new Error("Rollback failed");
      }) as any;

      expect(() => {
        CrossStackValidator.initiateRollback("TestStack");
      }).toThrow(StackDeploymentError);

      global.setTimeout = originalSetTimeout;
    });
  });

  describe("Deployment Reporting", () => {
    test("should generate comprehensive deployment report", () => {
      // Set up multiple stacks with different statuses
      CrossStackValidator.initializeDeployment("CoreStack", []);
      CrossStackValidator.markStackDeployed("CoreStack");

      CrossStackValidator.initializeDeployment("SecurityStack", ["CoreStack"]);
      CrossStackValidator.updateDeploymentStatus("SecurityStack", "failed", {
        errorType: StackErrorType.DEPLOYMENT_FAILURE,
        stackName: "SecurityStack",
        errorMessage: "Test deployment failure",
        suggestedAction: "Check CloudFormation console",
        rollbackRequired: true,
      });

      const report = CrossStackValidator.getDeploymentReport();

      expect(report).toContain("Stack Deployment Report");
      expect(report).toContain("CoreStack");
      expect(report).toContain("SecurityStack");
      expect(report).toContain("deployed");
      expect(report).toContain("failed");
      expect(report).toContain("Test deployment failure");
      expect(report).toContain("Check CloudFormation console");
    });
  });
});

describe("Enhanced DependencyResolver", () => {
  describe("Dependency Management", () => {
    test("should return correct deployment order", () => {
      const order = DependencyResolver.getDeploymentOrder();
      expect(order).toEqual([
        "CoreStack",
        "EventStack",
        "SecurityStack",
        "AuthStack",
        "LambdaStack",
        "MonitoringStack",
      ]);
    });

    test("should get stack dependencies correctly", () => {
      expect(DependencyResolver.getStackDependencies("CoreStack")).toEqual([]);
      expect(DependencyResolver.getStackDependencies("SecurityStack")).toEqual([
        "CoreStack",
        "EventStack",
      ]);
      expect(DependencyResolver.getStackDependencies("LambdaStack")).toEqual([
        "CoreStack",
        "SecurityStack",
        "EventStack",
        "AuthStack",
      ]);
    });

    test("should get stack dependents correctly", () => {
      expect(DependencyResolver.getStackDependents("CoreStack")).toContain(
        "SecurityStack"
      );
      expect(DependencyResolver.getStackDependents("CoreStack")).toContain(
        "LambdaStack"
      );
      expect(DependencyResolver.getStackDependents("LambdaStack")).toContain(
        "MonitoringStack"
      );
    });

    test("should validate deployment order with proper dependencies", () => {
      const deployedStacks = ["CoreStack", "EventStack"];

      expect(() => {
        DependencyResolver.validateDeploymentOrder(
          "SecurityStack",
          deployedStacks
        );
      }).not.toThrow();

      expect(() => {
        DependencyResolver.validateDeploymentOrder(
          "LambdaStack",
          deployedStacks
        );
      }).toThrow(CrossStackValidationError);
    });

    test("should provide detailed error for missing dependencies", () => {
      const deployedStacks = ["CoreStack"]; // Missing EventStack

      try {
        DependencyResolver.validateDeploymentOrder(
          "SecurityStack",
          deployedStacks
        );
      } catch (error) {
        if (error instanceof CrossStackValidationError) {
          expect(error.errorDetails.errorType).toBe(
            StackErrorType.MISSING_DEPENDENCY
          );
          expect(error.errorDetails.suggestedAction).toContain(
            "Deploy missing dependencies first"
          );
        }
      }
    });

    test("should reject unknown stack names", () => {
      expect(() => {
        DependencyResolver.validateDeploymentOrder("UnknownStack", []);
      }).toThrow(CrossStackValidationError);

      try {
        DependencyResolver.validateDeploymentOrder("UnknownStack", []);
      } catch (error) {
        if (error instanceof CrossStackValidationError) {
          expect(error.errorDetails.errorType).toBe(
            StackErrorType.INVALID_CONFIGURATION
          );
          expect(error.errorDetails.suggestedAction).toContain(
            "Use one of the valid stack names"
          );
        }
      }
    });
  });

  describe("Circular Dependency Detection", () => {
    test("should detect no circular dependencies in current configuration", () => {
      const circularDeps = DependencyResolver.detectCircularDependencies();
      expect(circularDeps).toHaveLength(0);
    });

    test("should validate dependency graph successfully", () => {
      expect(() => {
        DependencyResolver.validateDependencyGraph();
      }).not.toThrow();
    });

    test("should get optimal deployment order", () => {
      const order = DependencyResolver.getOptimalDeploymentOrder();
      expect(order).toEqual([
        "CoreStack",
        "EventStack",
        "SecurityStack",
        "AuthStack",
        "LambdaStack",
        "MonitoringStack",
      ]);
    });
  });
});

describe("Error Types and Details", () => {
  test("should create CrossStackValidationError with proper details", () => {
    const error = new CrossStackValidationError(
      "Test error message",
      "TestStack",
      "CoreStack.table",
      StackErrorType.MISSING_DEPENDENCY,
      "Custom suggested action"
    );

    expect(error.errorDetails.errorType).toBe(
      StackErrorType.MISSING_DEPENDENCY
    );
    expect(error.errorDetails.stackName).toBe("TestStack");
    expect(error.errorDetails.dependencyStack).toBe("CoreStack.table");
    expect(error.errorDetails.suggestedAction).toBe("Custom suggested action");
    expect(error.errorDetails.rollbackRequired).toBe(false);
  });

  test("should create StackDeploymentError with proper details", () => {
    const error = new StackDeploymentError(
      "TestStack",
      "Deployment failed due to resource conflict",
      StackErrorType.RESOURCE_CONFLICT,
      "TestResource"
    );

    expect(error.errorDetails.errorType).toBe(StackErrorType.RESOURCE_CONFLICT);
    expect(error.errorDetails.stackName).toBe("TestStack");
    expect(error.errorDetails.resourceName).toBe("TestResource");
    expect(error.errorDetails.rollbackRequired).toBe(true);
  });

  test("should provide default suggested actions for different error types", () => {
    const missingDepError = new CrossStackValidationError(
      "Missing dependency",
      "TestStack",
      "CoreStack"
    );
    expect(missingDepError.errorDetails.suggestedAction).toContain(
      "Deploy the CoreStack stack first"
    );

    const configError = new CrossStackValidationError(
      "Invalid config",
      "TestStack",
      "config",
      StackErrorType.INVALID_CONFIGURATION
    );
    expect(configError.errorDetails.suggestedAction).toContain(
      "Check the configuration"
    );
  });
});
