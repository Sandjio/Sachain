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
  EventStack,
  AuthStack,
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
  let eventStack: EventStack;
  let securityStack: SecurityStack;
  let authStack: AuthStack;
  let lambdaStack: LambdaStack;
  let monitoringStack: MonitoringStack;

  const environment = "test";
  const commonProps = {
    env: { account: "123456789012", region: "us-east-1" },
  };

  beforeEach(() => {
    // Clear any previous references
    ResourceReferenceTracker.clearReferences();

    app = new cdk.App();

    // Create stacks in dependency order
    coreStack = new CoreStack(app, `CoreStack-${environment}`, {
      ...commonProps,
      environment,
    });

    eventStack = new EventStack(app, `EventStack-${environment}`, {
      ...commonProps,
      environment,
    });

    securityStack = new SecurityStack(app, `SecurityStack-${environment}`, {
      ...commonProps,
      environment,
      table: coreStack.table,
      documentBucket: coreStack.documentBucket,
      encryptionKey: coreStack.encryptionKey,
      notificationTopic: eventStack.notificationTopic,
      eventBus: eventStack.eventBus,
    });

    authStack = new AuthStack(app, `AuthStack-${environment}`, {
      ...commonProps,
      environment,
    });

    lambdaStack = new LambdaStack(app, `LambdaStack-${environment}`, {
      ...commonProps,
      environment,
      table: coreStack.table,
      documentBucket: coreStack.documentBucket,
      postAuthRole: securityStack.postAuthRole,
      kycUploadRole: securityStack.kycUploadRole,
      adminReviewRole: securityStack.adminReviewRole,
      userNotificationRole: securityStack.userNotificationRole,
      kycProcessingRole: securityStack.kycProcessingRole,
      eventBus: eventStack.eventBus,
      notificationTopic: eventStack.notificationTopic,
      kycDocumentUploadedRule: eventStack.kycDocumentUploadedRule,
      kycStatusChangeRule: eventStack.kycStatusChangeRule,
      userPool: authStack.userPool,
    });

    monitoringStack = new MonitoringStack(
      app,
      `MonitoringStack-${environment}`,
      {
        ...commonProps,
        environment,
        postAuthLambda: lambdaStack.postAuthLambda,
        kycUploadLambda: lambdaStack.kycUploadLambda,
        adminReviewLambda: lambdaStack.adminReviewLambda,
        userNotificationLambda: lambdaStack.userNotificationLambda,
        kycProcessingLambda: lambdaStack.kycProcessingLambda,
      }
    );

    // Set up explicit dependencies to ensure proper deployment order
    securityStack.addDependency(coreStack);
    securityStack.addDependency(eventStack);
    authStack.addDependency(securityStack);
    lambdaStack.addDependency(coreStack);
    lambdaStack.addDependency(securityStack);
    lambdaStack.addDependency(eventStack);
    lambdaStack.addDependency(authStack);
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

    test("EventStack exports all required event resources", () => {
      const template = Template.fromStack(eventStack);

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

    test("AuthStack exports all required Cognito resources", () => {
      const template = Template.fromStack(authStack);

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
    });

    test("LambdaStack exports all required Lambda and API resources", () => {
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

      template.hasOutput("PostAuthLambdaArn", {
        Export: { Name: EXPORT_NAMES.postAuthLambdaArn(environment) },
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
    test("CoreStack implements CoreStackOutputs interface correctly", () => {
      expect(coreStack.table).toBeDefined();
      expect(coreStack.tableName).toBeDefined();
      expect(coreStack.tableArn).toBeDefined();
      expect(coreStack.documentBucket).toBeDefined();
      expect(coreStack.bucketName).toBeDefined();
      expect(coreStack.bucketArn).toBeDefined();
      expect(coreStack.encryptionKey).toBeDefined();
      expect(coreStack.kmsKeyArn).toBeDefined();
      expect(coreStack.kmsKeyId).toBeDefined();
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

    test("EventStack implements EventStackOutputs interface correctly", () => {
      expect(eventStack.eventBus).toBeDefined();
      expect(eventStack.eventBusName).toBeDefined();
      expect(eventStack.eventBusArn).toBeDefined();
      expect(eventStack.notificationTopic).toBeDefined();
      expect(eventStack.userNotificationTopic).toBeDefined();
      expect(eventStack.adminNotificationTopicArn).toBeDefined();
      expect(eventStack.userNotificationTopicArn).toBeDefined();
      expect(eventStack.kycStatusChangeRule).toBeDefined();
      expect(eventStack.kycDocumentUploadedRule).toBeDefined();
      expect(eventStack.kycReviewCompletedRule).toBeDefined();
      expect(eventStack.kycStatusChangeRuleArn).toBeDefined();
      expect(eventStack.kycDocumentUploadedRuleArn).toBeDefined();
      expect(eventStack.kycReviewCompletedRuleArn).toBeDefined();
    });

    test("AuthStack implements AuthStackOutputs interface correctly", () => {
      expect(authStack.userPool).toBeDefined();
      expect(authStack.userPoolClient).toBeDefined();
      expect(authStack.userPoolId).toBeDefined();
      expect(authStack.userPoolArn).toBeDefined();
      expect(authStack.userPoolClientId).toBeDefined();
      expect(authStack.userPoolDomain).toBeDefined();
    });

    test("LambdaStack implements LambdaStackOutputs interface correctly", () => {
      expect(lambdaStack.postAuthLambda).toBeDefined();
      expect(lambdaStack.kycUploadLambda).toBeDefined();
      expect(lambdaStack.adminReviewLambda).toBeDefined();
      expect(lambdaStack.userNotificationLambda).toBeDefined();
      expect(lambdaStack.kycProcessingLambda).toBeDefined();
      expect(lambdaStack.postAuthLambdaArn).toBeDefined();
      expect(lambdaStack.kycUploadLambdaArn).toBeDefined();
      expect(lambdaStack.adminReviewLambdaArn).toBeDefined();
      expect(lambdaStack.userNotificationLambdaArn).toBeDefined();
      expect(lambdaStack.kycProcessingLambdaArn).toBeDefined();
      expect(lambdaStack.api).toBeDefined();
      expect(lambdaStack.apiUrl).toBeDefined();
      expect(lambdaStack.apiId).toBeDefined();
      expect(lambdaStack.apiRootResourceId).toBeDefined();
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

    test("CrossStackValidator validates LambdaStack dependencies", () => {
      const validDependencies = {
        coreOutputs: {
          table: coreStack.table,
          documentBucket: coreStack.documentBucket,
          encryptionKey: coreStack.encryptionKey,
        },
        securityOutputs: {
          postAuthRole: securityStack.postAuthRole,
          kycUploadRole: securityStack.kycUploadRole,
          adminReviewRole: securityStack.adminReviewRole,
          userNotificationRole: securityStack.userNotificationRole,
          kycProcessingRole: securityStack.kycProcessingRole,
        },
        eventOutputs: {
          eventBus: eventStack.eventBus,
          notificationTopic: eventStack.notificationTopic,
          kycDocumentUploadedRule: eventStack.kycDocumentUploadedRule,
          kycStatusChangeRule: eventStack.kycStatusChangeRule,
        },
        authOutputs: {
          userPool: authStack.userPool,
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
    test("DependencyResolver returns correct deployment order", () => {
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

    test("DependencyResolver validates deployment order correctly", () => {
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
      }).toThrow(
        "Prerequisite stack SecurityStack must be deployed before LambdaStack"
      );
    });

    test("DependencyResolver returns correct stack dependencies", () => {
      expect(DependencyResolver.getStackDependencies("CoreStack")).toEqual([]);
      expect(DependencyResolver.getStackDependencies("SecurityStack")).toEqual([
        "CoreStack",
        "EventStack",
      ]);
      expect(DependencyResolver.getStackDependencies("LambdaStack")).toEqual([
        "CoreStack",
        "EventStack",
        "SecurityStack",
        "AuthStack",
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
    test("All stacks can access required cross-stack resources", () => {
      // Test that SecurityStack can access CoreStack resources
      expect(securityStack.node.dependencies).toContain(coreStack);
      expect(securityStack.node.dependencies).toContain(eventStack);

      // Test that LambdaStack can access all required resources
      expect(lambdaStack.node.dependencies).toContain(coreStack);
      expect(lambdaStack.node.dependencies).toContain(securityStack);
      expect(lambdaStack.node.dependencies).toContain(eventStack);
      expect(lambdaStack.node.dependencies).toContain(authStack);

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
