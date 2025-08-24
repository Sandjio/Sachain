/**
 * Tests for Enhanced Cross-Stack Validator
 */

import {
  CrossStackValidator,
  DependencyResolver,
  ResourceReferenceTracker,
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
      // First deploy CoreStack (now includes auth resources)
      CrossStackValidator.validateStackDeployment("CoreStack", {});
      CrossStackValidator.markStackDeployed("CoreStack");

      // Now SecurityStack should validate successfully
      const mockDependencies = {
        table: { tableName: "test-table" },
        documentBucket: { bucketName: "test-bucket" },
        encryptionKey: { keyId: "test-key" },
        userPool: { userPoolId: "test-pool" }, // Now from CoreStack
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
      // Deploy CoreStack with proper dependencies (now includes auth resources)
      CrossStackValidator.validateStackDeployment("CoreStack", {});
      CrossStackValidator.markStackDeployed("CoreStack");

      // Deploy SecurityStack with proper dependencies
      const securityDeps = {
        table: { tableName: "test-table" },
        documentBucket: { bucketName: "test-bucket" },
        encryptionKey: { keyId: "test-key" },
        userPool: { userPoolId: "test-pool" }, // Now from CoreStack
      };
      CrossStackValidator.validateStackDeployment(
        "SecurityStack",
        securityDeps
      );
      CrossStackValidator.markStackDeployed("SecurityStack");

      const mockDependencies = {
        kycUploadRole: { roleArn: "arn:aws:iam::123456789012:role/test" },
        adminReviewRole: { roleArn: "arn:aws:iam::123456789012:role/test" },
        userNotificationRole: {
          roleArn: "arn:aws:iam::123456789012:role/test",
        },
        kycProcessingRole: { roleArn: "arn:aws:iam::123456789012:role/test" },
        userPool: { userPoolId: "test-pool" }, // From CoreStack
        postAuthLambda: {
          functionArn: "arn:aws:lambda:us-east-1:123456789012:function:test",
        }, // From CoreStack
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
        table: { tableName: "" } as any, // Invalid - empty name
        documentBucket: undefined,
        encryptionKey: undefined,
        userPool: undefined, // Now required in CoreStack
        userPoolClient: undefined, // Now required in CoreStack
        postAuthLambda: undefined, // Now required in CoreStack
      };

      expect(() => {
        CrossStackValidator.validateCoreStackOutputs(
          invalidOutputs,
          "ProductionStack" // Use non-test stack name
        );
      }).toThrow(CrossStackValidationError);

      try {
        CrossStackValidator.validateCoreStackOutputs(
          invalidOutputs,
          "ProductionStack"
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
        kycUploadRole: { roleArn: "" }, // Invalid - empty ARN
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

    test("should validate LambdaStack event outputs with resource properties", () => {
      const invalidOutputs = {
        eventBus: { eventBusName: "" }, // Invalid - empty name
        notificationTopic: undefined,
        kycDocumentUploadedRule: undefined,
        kycStatusChangeRule: undefined,
      };

      expect(() => {
        CrossStackValidator.validateLambdaStackEventOutputs(
          invalidOutputs,
          "TestStack"
        );
      }).toThrow(CrossStackValidationError);
    });

    test("should validate CoreStack auth outputs with Cognito validation", () => {
      const invalidOutputs = {
        userPool: { userPoolId: "" }, // Invalid - empty ID
        userPoolClient: undefined,
        postAuthLambda: undefined,
      };

      expect(() => {
        CrossStackValidator.validateCoreStackAuthOutputs(
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

      // Deploy CoreStack (now includes auth resources)
      CrossStackValidator.initializeDeployment("CoreStack", []);
      CrossStackValidator.markStackDeployed("CoreStack");

      // Now SecurityStack should pass (no longer needs EventStack or AuthStack)
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
        "SecurityStack",
        "LambdaStack",
        "MonitoringStack",
      ]);
    });

    test("should get stack dependencies correctly", () => {
      expect(DependencyResolver.getStackDependencies("CoreStack")).toEqual([]);
      expect(DependencyResolver.getStackDependencies("SecurityStack")).toEqual([
        "CoreStack",
      ]);
      expect(DependencyResolver.getStackDependencies("LambdaStack")).toEqual([
        "CoreStack",
        "SecurityStack",
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
      const deployedStacks = ["CoreStack"];

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
      const deployedStacks = []; // Missing CoreStack

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
        "SecurityStack",
        "LambdaStack",
        "MonitoringStack",
      ]);
    });
  });
});

describe("ResourceReferenceTracker", () => {
  beforeEach(() => {
    ResourceReferenceTracker.clearResourceTracking();
    ResourceReferenceTracker.initializeResourceTracking();
  });

  describe("Resource Ownership Tracking", () => {
    test("should correctly identify resource owners for consolidated stacks", () => {
      // Core Stack resources (including auth resources)
      expect(ResourceReferenceTracker.getResourceOwner("table")).toEqual({
        stack: "CoreStack",
        resource: "table",
      });
      expect(ResourceReferenceTracker.getResourceOwner("userPool")).toEqual({
        stack: "CoreStack",
        resource: "userPool",
      });
      expect(
        ResourceReferenceTracker.getResourceOwner("postAuthLambda")
      ).toEqual({
        stack: "CoreStack",
        resource: "postAuthLambda",
      });

      // Lambda Stack resources (including event resources)
      expect(ResourceReferenceTracker.getResourceOwner("eventBus")).toEqual({
        stack: "LambdaStack",
        resource: "eventBus",
      });
      expect(
        ResourceReferenceTracker.getResourceOwner("kycUploadLambda")
      ).toEqual({
        stack: "LambdaStack",
        resource: "kycUploadLambda",
      });

      // Security Stack resources
      expect(
        ResourceReferenceTracker.getResourceOwner("kycUploadRole")
      ).toEqual({
        stack: "SecurityStack",
        resource: "kycUploadRole",
      });
    });

    test("should return undefined for unknown resources", () => {
      expect(
        ResourceReferenceTracker.getResourceOwner("unknownResource")
      ).toBeUndefined();
    });

    test("should get all resources for a specific stack", () => {
      const coreResources =
        ResourceReferenceTracker.getStackResources("CoreStack");
      expect(coreResources).toContain("table");
      expect(coreResources).toContain("userPool");
      expect(coreResources).toContain("postAuthLambda");

      const lambdaResources =
        ResourceReferenceTracker.getStackResources("LambdaStack");
      expect(lambdaResources).toContain("eventBus");
      expect(lambdaResources).toContain("kycUploadLambda");
      expect(lambdaResources).toContain("notificationTopic");
    });
  });

  describe("Resource Reference Validation", () => {
    test("should validate resource references correctly", () => {
      expect(ResourceReferenceTracker.validateResourceReference("table")).toBe(
        true
      );
      expect(
        ResourceReferenceTracker.validateResourceReference(
          "userPool",
          "CoreStack"
        )
      ).toBe(true);
      expect(
        ResourceReferenceTracker.validateResourceReference(
          "userPool",
          "SecurityStack"
        )
      ).toBe(false);
      expect(
        ResourceReferenceTracker.validateResourceReference("unknownResource")
      ).toBe(false);
    });
  });

  describe("Migration Mapping", () => {
    test("should provide correct migration mapping", () => {
      const migrationMap =
        ResourceReferenceTracker.getResourceMigrationMapping();

      // Auth resources moved from AuthStack to CoreStack
      expect(migrationMap.get("userPool")).toEqual({
        from: "AuthStack",
        to: "CoreStack",
      });
      expect(migrationMap.get("userPoolClient")).toEqual({
        from: "AuthStack",
        to: "CoreStack",
      });

      // Post-auth lambda moved from LambdaStack to CoreStack
      expect(migrationMap.get("postAuthLambda")).toEqual({
        from: "LambdaStack",
        to: "CoreStack",
      });

      // Event resources moved from EventStack to LambdaStack
      expect(migrationMap.get("eventBus")).toEqual({
        from: "EventStack",
        to: "LambdaStack",
      });
      expect(migrationMap.get("notificationTopic")).toEqual({
        from: "EventStack",
        to: "LambdaStack",
      });
    });

    test("should validate consolidated references", () => {
      const validation =
        ResourceReferenceTracker.validateConsolidatedReferences();
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
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
