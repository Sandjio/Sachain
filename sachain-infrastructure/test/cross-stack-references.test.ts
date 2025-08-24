/**
 * Cross-Stack Reference Integration Tests
 *
 * Tests to validate that cross-stack references work correctly
 * and that all necessary resource identifiers are exported.
 */

import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import {
  CoreStack,
  SecurityStack,
  LambdaStack,
  MonitoringStack,
} from "../lib/stacks";
import {
  CrossStackValidator,
  CrossStackReferenceHelper,
  DependencyResolver,
  ResourceReferenceTracker,
} from "../lib/utils";
import { EXPORT_NAMES } from "../lib/interfaces";

describe("Cross-Stack Reference Integration", () => {
  let app: cdk.App;
  let coreStack: CoreStack;
  let securityStack: SecurityStack;
  let lambdaStack: LambdaStack;
  let monitoringStack: MonitoringStack;

  const environment = "test";
  const commonProps = {
    env: { account: "123456789012", region: "us-east-1" },
  };

  beforeEach(() => {
    // Clear any previous references
    ResourceReferenceTracker.clearResourceTracking();

    app = new cdk.App();

    // Create stacks in dependency order (consolidated structure)
    coreStack = new CoreStack(app, `CoreStack-${environment}`, {
      ...commonProps,
      environment,
    });

    securityStack = new SecurityStack(app, `SecurityStack-${environment}`, {
      ...commonProps,
      environment,
      table: coreStack.table,
      documentBucket: coreStack.documentBucket,
      encryptionKey: coreStack.encryptionKey,
      userPool: coreStack.userPool,
    });

    lambdaStack = new LambdaStack(app, `LambdaStack-${environment}`, {
      ...commonProps,
      environment,
      table: coreStack.table,
      documentBucket: coreStack.documentBucket,
      encryptionKey: coreStack.encryptionKey,
      userPool: coreStack.userPool,
      userPoolClient: coreStack.userPoolClient,
      postAuthLambda: coreStack.postAuthLambda,
      kycUploadRole: securityStack.kycUploadRole,
      adminReviewRole: securityStack.adminReviewRole,
      userNotificationRole: securityStack.userNotificationRole,
      kycProcessingRole: securityStack.kycProcessingRole,
    });

    monitoringStack = new MonitoringStack(
      app,
      `MonitoringStack-${environment}`,
      {
        ...commonProps,
        environment,
        postAuthLambda: coreStack.postAuthLambda,
        kycUploadLambda: lambdaStack.kycUploadLambda,
        adminReviewLambda: lambdaStack.adminReviewLambda,
        userNotificationLambda: lambdaStack.userNotificationLambda,
        kycProcessingLambda: lambdaStack.kycProcessingLambda,
      }
    );

    // Set up explicit dependencies to ensure proper deployment order
    securityStack.addDependency(coreStack);
    lambdaStack.addDependency(coreStack);
    lambdaStack.addDependency(securityStack);
    monitoringStack.addDependency(lambdaStack);
  });

  describe("Stack Output Validation", () => {
    test("CoreStack exports all required resources", () => {
      const template = Template.fromStack(coreStack);

      // Verify CloudFormation outputs exist
      template.hasOutput("TableName", {
        Export: { Name: EXPORT_NAMES.tableName(environment) },
      });

      template.hasOutput("TableArn", {
        Export: { Name: EXPORT_NAMES.tableArn(environment) },
      });

      template.hasOutput("BucketName", {
        Export: { Name: EXPORT_NAMES.bucketName(environment) },
      });

      template.hasOutput("BucketArn", {
        Export: { Name: EXPORT_NAMES.bucketArn(environment) },
      });

      template.hasOutput("KmsKeyArn", {
        Export: { Name: EXPORT_NAMES.kmsKeyArn(environment) },
      });

      template.hasOutput("KmsKeyId", {
        Export: { Name: EXPORT_NAMES.kmsKeyId(environment) },
      });
    });

    test("SecurityStack exports all required IAM role ARNs", () => {
      const template = Template.fromStack(securityStack);

      template.hasOutput("PostAuthRoleArn", {
        Export: { Name: EXPORT_NAMES.postAuthRoleArn(environment) },
      });

      template.hasOutput("KycUploadRoleArn", {
        Export: { Name: EXPORT_NAMES.kycUploadRoleArn(environment) },
      });

      template.hasOutput("AdminReviewRoleArn", {
        Export: { Name: EXPORT_NAMES.adminReviewRoleArn(environment) },
      });

      template.hasOutput("UserNotificationRoleArn", {
        Export: { Name: EXPORT_NAMES.userNotificationRoleArn(environment) },
      });

      template.hasOutput("KycProcessingRoleArn", {
        Export: { Name: EXPORT_NAMES.kycProcessingRoleArn(environment) },
      });
    });

    test("CoreStack exports all required auth resources (consolidated from AuthStack)", () => {
      const template = Template.fromStack(coreStack);

      template.hasOutput("UserPoolId", {
        Export: { Name: EXPORT_NAMES.userPoolId(environment) },
      });

      template.hasOutput("UserPoolArn", {
        Export: { Name: EXPORT_NAMES.userPoolArn(environment) },
      });

      template.hasOutput("UserPoolClientId", {
        Export: { Name: EXPORT_NAMES.userPoolClientId(environment) },
      });

      template.hasOutput("UserPoolDomain", {
        Export: { Name: EXPORT_NAMES.userPoolDomain(environment) },
      });

      template.hasOutput("PostAuthLambdaArn", {
        Export: { Name: EXPORT_NAMES.postAuthLambdaArn(environment) },
      });
    });

    test("LambdaStack exports all required Lambda, API and event resources", () => {
      const template = Template.fromStack(lambdaStack);

      template.hasOutput("ApiUrl", {
        Export: { Name: EXPORT_NAMES.apiUrl(environment) },
      });

      template.hasOutput("ApiId", {
        Export: { Name: EXPORT_NAMES.apiId(environment) },
      });

      template.hasOutput("ApiRootResourceId", {
        Export: { Name: EXPORT_NAMES.apiRootResourceId(environment) },
      });

      template.hasOutput("KycUploadLambdaArn", {
        Export: { Name: EXPORT_NAMES.kycUploadLambdaArn(environment) },
      });

      template.hasOutput("AdminReviewLambdaArn", {
        Export: { Name: EXPORT_NAMES.adminReviewLambdaArn(environment) },
      });

      template.hasOutput("UserNotificationLambdaArn", {
        Export: { Name: EXPORT_NAMES.userNotificationLambdaArn(environment) },
      });

      template.hasOutput("KycProcessingLambdaArn", {
        Export: { Name: EXPORT_NAMES.kycProcessingLambdaArn(environment) },
      });

      // Event resources (consolidated from EventStack)
      template.hasOutput("EventBusName", {
        Export: { Name: EXPORT_NAMES.eventBusName(environment) },
      });

      template.hasOutput("EventBusArn", {
        Export: { Name: EXPORT_NAMES.eventBusArn(environment) },
      });

      template.hasOutput("AdminNotificationTopicArn", {
        Export: { Name: EXPORT_NAMES.adminNotificationTopicArn(environment) },
      });

      template.hasOutput("UserNotificationTopicArn", {
        Export: { Name: EXPORT_NAMES.userNotificationTopicArn(environment) },
      });

      template.hasOutput("KycStatusChangeRuleArn", {
        Export: { Name: EXPORT_NAMES.kycStatusChangeRuleArn(environment) },
      });

      template.hasOutput("KycDocumentUploadedRuleArn", {
        Export: { Name: EXPORT_NAMES.kycDocumentUploadedRuleArn(environment) },
      });

      template.hasOutput("KycReviewCompletedRuleArn", {
        Export: { Name: EXPORT_NAMES.kycReviewCompletedRuleArn(environment) },
      });
    });

    test("MonitoringStack exports all required monitoring resources", () => {
      const template = Template.fromStack(monitoringStack);

      template.hasOutput("DashboardUrl", {
        Export: { Name: EXPORT_NAMES.dashboardUrl(environment) },
      });

      template.hasOutput("DashboardName", {
        Export: { Name: EXPORT_NAMES.dashboardName(environment) },
      });

      template.hasOutput("AlertTopicArn", {
        Export: { Name: EXPORT_NAMES.alertTopicArn(environment) },
      });

      template.hasOutput("AlarmCount", {
        Export: { Name: EXPORT_NAMES.alarmCount(environment) },
      });
    });
  });

  describe("Cross-Stack Interface Implementation", () => {
    test("CoreStack implements CoreStackOutputs interface correctly (including auth)", () => {
      // Core resources
      expect(coreStack.table).toBeDefined();
      expect(coreStack.tableName).toBeDefined();
      expect(coreStack.tableArn).toBeDefined();
      expect(coreStack.documentBucket).toBeDefined();
      expect(coreStack.bucketName).toBeDefined();
      expect(coreStack.bucketArn).toBeDefined();
      expect(coreStack.encryptionKey).toBeDefined();
      expect(coreStack.kmsKeyArn).toBeDefined();
      expect(coreStack.kmsKeyId).toBeDefined();

      // Auth resources (consolidated from AuthStack)
      expect(coreStack.userPool).toBeDefined();
      expect(coreStack.userPoolClient).toBeDefined();
      expect(coreStack.userPoolId).toBeDefined();
      expect(coreStack.userPoolArn).toBeDefined();
      expect(coreStack.userPoolClientId).toBeDefined();
      expect(coreStack.userPoolDomain).toBeDefined();
      expect(coreStack.postAuthLambda).toBeDefined();
      expect(coreStack.postAuthLambdaArn).toBeDefined();
    });

    test("SecurityStack implements SecurityStackOutputs interface correctly", () => {
      expect(securityStack.postAuthRole).toBeDefined();
      expect(securityStack.kycUploadRole).toBeDefined();
      expect(securityStack.adminReviewRole).toBeDefined();
      expect(securityStack.userNotificationRole).toBeDefined();
      expect(securityStack.kycProcessingRole).toBeDefined();
      expect(securityStack.postAuthRoleArn).toBeDefined();
      expect(securityStack.kycUploadRoleArn).toBeDefined();
      expect(securityStack.adminReviewRoleArn).toBeDefined();
      expect(securityStack.userNotificationRoleArn).toBeDefined();
      expect(securityStack.kycProcessingRoleArn).toBeDefined();
    });

    test("LambdaStack implements LambdaStackOutputs interface correctly (including events)", () => {
      // Lambda resources (excluding post-auth which moved to CoreStack)
      expect(lambdaStack.kycUploadLambda).toBeDefined();
      expect(lambdaStack.adminReviewLambda).toBeDefined();
      expect(lambdaStack.userNotificationLambda).toBeDefined();
      expect(lambdaStack.kycProcessingLambda).toBeDefined();
      expect(lambdaStack.kycUploadLambdaArn).toBeDefined();
      expect(lambdaStack.adminReviewLambdaArn).toBeDefined();
      expect(lambdaStack.userNotificationLambdaArn).toBeDefined();
      expect(lambdaStack.kycProcessingLambdaArn).toBeDefined();
      expect(lambdaStack.api).toBeDefined();
      expect(lambdaStack.apiUrl).toBeDefined();
      expect(lambdaStack.apiId).toBeDefined();
      expect(lambdaStack.apiRootResourceId).toBeDefined();

      // Event resources (consolidated from EventStack)
      expect(lambdaStack.eventBus).toBeDefined();
      expect(lambdaStack.eventBusName).toBeDefined();
      expect(lambdaStack.eventBusArn).toBeDefined();
      expect(lambdaStack.notificationTopic).toBeDefined();
      expect(lambdaStack.userNotificationTopic).toBeDefined();
      expect(lambdaStack.adminNotificationTopicArn).toBeDefined();
      expect(lambdaStack.userNotificationTopicArn).toBeDefined();
      expect(lambdaStack.kycStatusChangeRule).toBeDefined();
      expect(lambdaStack.kycDocumentUploadedRule).toBeDefined();
      expect(lambdaStack.kycReviewCompletedRule).toBeDefined();
      expect(lambdaStack.kycStatusChangeRuleArn).toBeDefined();
      expect(lambdaStack.kycDocumentUploadedRuleArn).toBeDefined();
      expect(lambdaStack.kycReviewCompletedRuleArn).toBeDefined();
    });

    test("MonitoringStack implements MonitoringStackOutputs interface correctly", () => {
      expect(monitoringStack.dashboard).toBeDefined();
      expect(monitoringStack.alertTopic).toBeDefined();
      expect(monitoringStack.alarms).toBeDefined();
      expect(monitoringStack.dashboardUrl).toBeDefined();
      expect(monitoringStack.dashboardName).toBeDefined();
      expect(monitoringStack.alertTopicArn).toBeDefined();
      expect(monitoringStack.alarmArns).toBeDefined();
      expect(monitoringStack.alarmCount).toBeDefined();
    });
  });

  describe("Cross-Stack Validation", () => {
    test("CrossStackValidator validates CoreStack outputs", () => {
      const validOutputs = {
        table: coreStack.table,
        documentBucket: coreStack.documentBucket,
        encryptionKey: coreStack.encryptionKey,
      };

      expect(() => {
        CrossStackValidator.validateCoreStackOutputs(validOutputs, "TestStack");
      }).not.toThrow();

      const invalidOutputs = {
        table: coreStack.table,
        // Missing documentBucket and encryptionKey
      };

      expect(() => {
        CrossStackValidator.validateCoreStackOutputs(
          invalidOutputs,
          "TestStack"
        );
      }).toThrow("Missing required CoreStack output: documentBucket");
    });

    test("CrossStackValidator validates SecurityStack outputs", () => {
      const validOutputs = {
        postAuthRole: securityStack.postAuthRole,
        kycUploadRole: securityStack.kycUploadRole,
        adminReviewRole: securityStack.adminReviewRole,
        userNotificationRole: securityStack.userNotificationRole,
        kycProcessingRole: securityStack.kycProcessingRole,
      };

      expect(() => {
        CrossStackValidator.validateSecurityStackOutputs(
          validOutputs,
          "TestStack"
        );
      }).not.toThrow();
    });

    test("CrossStackValidator validates LambdaStack dependencies (consolidated)", () => {
      const validDependencies = {
        coreOutputs: {
          table: coreStack.table,
          documentBucket: coreStack.documentBucket,
          encryptionKey: coreStack.encryptionKey,
          userPool: coreStack.userPool,
          userPoolClient: coreStack.userPoolClient,
          postAuthLambda: coreStack.postAuthLambda,
        },
        securityOutputs: {
          kycUploadRole: securityStack.kycUploadRole,
          adminReviewRole: securityStack.adminReviewRole,
          userNotificationRole: securityStack.userNotificationRole,
          kycProcessingRole: securityStack.kycProcessingRole,
        },
      };

      expect(() => {
        CrossStackValidator.validateLambdaStackDependencies(
          validDependencies,
          "TestStack"
        );
      }).not.toThrow();
    });
  });

  describe("Export Name Validation", () => {
    test("All export names follow standard naming convention", () => {
      const exportNames = Object.keys(
        EXPORT_NAMES
      ) as (keyof typeof EXPORT_NAMES)[];

      for (const exportKey of exportNames) {
        const exportName = EXPORT_NAMES[exportKey](environment);
        expect(
          CrossStackReferenceHelper.validateExportName(exportName, environment)
        ).toBe(true);
        expect(exportName).toMatch(new RegExp(`^${environment}-sachain-.+`));
      }
    });

    test("Export names are unique across all stacks", () => {
      const exportNames = Object.keys(
        EXPORT_NAMES
      ) as (keyof typeof EXPORT_NAMES)[];
      const generatedNames = exportNames.map((key) =>
        EXPORT_NAMES[key](environment)
      );
      const uniqueNames = new Set(generatedNames);

      expect(generatedNames.length).toBe(uniqueNames.size);
    });
  });

  describe("Dependency Resolution", () => {
    test("DependencyResolver returns correct deployment order (consolidated)", () => {
      const order = DependencyResolver.getDeploymentOrder();
      expect(order).toEqual([
        "CoreStack",
        "SecurityStack",
        "LambdaStack",
        "MonitoringStack",
      ]);
    });

    test("DependencyResolver validates deployment order correctly (consolidated)", () => {
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
      }).toThrow(
        "Prerequisite stack SecurityStack must be deployed before LambdaStack"
      );
    });

    test("DependencyResolver returns correct stack dependencies (consolidated)", () => {
      expect(DependencyResolver.getStackDependencies("CoreStack")).toEqual([]);
      expect(DependencyResolver.getStackDependencies("SecurityStack")).toEqual([
        "CoreStack",
      ]);
      expect(DependencyResolver.getStackDependencies("LambdaStack")).toEqual([
        "CoreStack",
        "SecurityStack",
      ]);
    });
  });

  describe("Resource Reference Tracking", () => {
    test("ResourceReferenceTracker records cross-stack references", () => {
      const references = ResourceReferenceTracker.getAllReferences();
      expect(references.size).toBeGreaterThan(0);

      // Check that SecurityStack references are recorded
      const securityReferences =
        ResourceReferenceTracker.getReferencesFromStack("SecurityStack-test");
      expect(securityReferences.size).toBeGreaterThan(0);

      // Check that references to CoreStack are recorded
      const coreReferences =
        ResourceReferenceTracker.getReferencesToStack("CoreStack");
      expect(coreReferences.size).toBeGreaterThan(0);
    });

    test("ResourceReferenceTracker generates dependency report", () => {
      const report = ResourceReferenceTracker.generateDependencyReport();
      expect(report).toContain("Cross-Stack Dependency Report");
      expect(report.length).toBeGreaterThan(100); // Should contain meaningful content
    });
  });

  describe("Cross-Stack Reference Resolution", () => {
    test("All stacks can access required cross-stack resources (consolidated)", () => {
      // Test that SecurityStack can access CoreStack resources
      expect(securityStack.node.dependencies).toContain(coreStack);

      // Test that LambdaStack can access all required resources
      expect(lambdaStack.node.dependencies).toContain(coreStack);
      expect(lambdaStack.node.dependencies).toContain(securityStack);

      // Test that MonitoringStack can access LambdaStack resources
      expect(monitoringStack.node.dependencies).toContain(lambdaStack);
    });

    test("Cross-stack references resolve to correct resource types", () => {
      // Verify that cross-stack references maintain correct types
      expect(coreStack.table.tableName).toBe(coreStack.tableName);
      expect(coreStack.documentBucket.bucketName).toBe(coreStack.bucketName);
      expect(securityStack.postAuthRole.roleArn).toBe(
        securityStack.postAuthRoleArn
      );
    });
  });
});
