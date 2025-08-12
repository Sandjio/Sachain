import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import * as logs from "aws-cdk-lib/aws-logs";
import { Template, Match } from "aws-cdk-lib/assertions";
import { EventBridgeConstruct } from "../../lib/constructs/eventbridge";

describe("EventBridgeConstruct", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");
  });

  describe("Basic Configuration", () => {
    beforeEach(() => {
      new EventBridgeConstruct(stack, "TestEventBridge", {
        environment: "test",
      });
      template = Template.fromStack(stack);
    });

    test("creates custom EventBridge bus with correct name", () => {
      template.hasResourceProperties("AWS::Events::EventBus", {
        Name: "sachain-kyc-events-test",
      });
    });

    test("creates admin notification SNS topic", () => {
      template.hasResourceProperties("AWS::SNS::Topic", {
        TopicName: "sachain-kyc-admin-notifications-test",
        DisplayName: "Sachain KYC Admin Notifications",
        FifoTopic: false,
      });
    });

    test("creates user notification SNS topic", () => {
      template.hasResourceProperties("AWS::SNS::Topic", {
        TopicName: "sachain-kyc-user-notifications-test",
        DisplayName: "Sachain KYC User Notifications",
        FifoTopic: false,
      });
    });

    test("creates CloudWatch log group for event debugging", () => {
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        LogGroupName: "/aws/events/sachain-kyc-test",
        RetentionInDays: 30,
      });
    });

    test("adds default admin email subscription", () => {
      template.hasResourceProperties("AWS::SNS::Subscription", {
        Protocol: "email",
        Endpoint: "admin@sachain-test.com",
        TopicArn: {
          Ref: Match.stringLikeRegexp(".*AdminNotificationTopic.*"),
        },
      });
    });
  });

  describe("Custom Admin Emails", () => {
    beforeEach(() => {
      new EventBridgeConstruct(stack, "TestEventBridge", {
        environment: "test",
        adminEmails: ["admin1@test.com", "admin2@test.com"],
      });
      template = Template.fromStack(stack);
    });

    test("creates email subscriptions for custom admin emails", () => {
      template.hasResourceProperties("AWS::SNS::Subscription", {
        Protocol: "email",
        Endpoint: "admin1@test.com",
      });

      template.hasResourceProperties("AWS::SNS::Subscription", {
        Protocol: "email",
        Endpoint: "admin2@test.com",
      });
    });

    test("creates correct number of email subscriptions", () => {
      const subscriptions = template.findResources("AWS::SNS::Subscription");
      expect(Object.keys(subscriptions)).toHaveLength(2);
    });
  });

  describe("Event Rules Configuration", () => {
    beforeEach(() => {
      new EventBridgeConstruct(stack, "TestEventBridge", {
        environment: "test",
      });
      template = Template.fromStack(stack);
    });

    test("creates KYC status change rule with correct pattern", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Name: "sachain-kyc-status-change-test",
        Description: "Route KYC status change events to user notifications",
        EventPattern: {
          source: ["sachain.kyc"],
          "detail-type": ["KYC Status Changed"],
          detail: {
            eventType: ["KYC_STATUS_CHANGED"],
            newStatus: ["approved", "rejected"],
          },
        },
        State: "ENABLED",
      });
    });

    test("creates KYC document uploaded rule with correct pattern", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Name: "sachain-kyc-document-uploaded-test",
        Description: "Route KYC document upload events to admin notifications",
        EventPattern: {
          source: ["sachain.kyc"],
          "detail-type": ["KYC Document Uploaded"],
          detail: {
            eventType: ["KYC_DOCUMENT_UPLOADED"],
          },
        },
        State: "ENABLED",
      });
    });

    test("creates KYC review completed rule with correct pattern", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Name: "sachain-kyc-review-completed-test",
        Description:
          "Route KYC review completion events for audit and analytics",
        EventPattern: {
          source: ["sachain.kyc"],
          "detail-type": ["KYC Review Completed"],
          detail: {
            eventType: ["KYC_REVIEW_COMPLETED"],
          },
        },
        State: "ENABLED",
      });
    });
  });

  describe("Event Rule Targets", () => {
    beforeEach(() => {
      new EventBridgeConstruct(stack, "TestEventBridge", {
        environment: "test",
      });
      template = Template.fromStack(stack);
    });

    test("configures SNS targets for status change events", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Name: "sachain-kyc-status-change-test",
        Targets: Match.arrayWith([
          Match.objectLike({
            Arn: {
              Ref: Match.stringLikeRegexp(".*UserNotificationTopic.*"),
            },
            Id: Match.anyValue(),
            SqsParameters: Match.absent(),
            InputTransformer: {
              InputPathsMap: {
                eventType: "$.detail.eventType",
                userId: "$.detail.userId",
                documentId: "$.detail.documentId",
                newStatus: "$.detail.newStatus",
                reviewedBy: "$.detail.reviewedBy",
                reviewComments: "$.detail.reviewComments",
                timestamp: "$.detail.timestamp",
              },
            },
          }),
        ]),
      });
    });

    test("configures CloudWatch Logs targets for audit trail", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Name: "sachain-kyc-status-change-test",
        Targets: Match.arrayWith([
          Match.objectLike({
            Arn: {
              "Fn::GetAtt": [
                Match.stringLikeRegexp(".*KYCEventLogGroup.*"),
                "Arn",
              ],
            },
            Id: Match.anyValue(),
          }),
        ]),
      });
    });

    test("configures SNS targets for document upload events", () => {
      template.hasResourceProperties("AWS::Events::Rule", {
        Name: "sachain-kyc-document-uploaded-test",
        Targets: Match.arrayWith([
          Match.objectLike({
            Arn: {
              Ref: Match.stringLikeRegexp(".*AdminNotificationTopic.*"),
            },
            Id: Match.anyValue(),
            InputTransformer: {
              InputPathsMap: {
                eventType: "$.detail.eventType",
                userId: "$.detail.userId",
                documentId: "$.detail.documentId",
                documentType: "$.detail.documentType",
                fileSize: "$.detail.fileSize",
                userType: "$.detail.userType",
                timestamp: "$.detail.timestamp",
              },
            },
          }),
        ]),
      });
    });
  });

  describe("Resource Tagging", () => {
    beforeEach(() => {
      new EventBridgeConstruct(stack, "TestEventBridge", {
        environment: "test",
      });
      template = Template.fromStack(stack);
    });

    test("applies correct tags to SNS topics", () => {
      template.hasResourceProperties("AWS::SNS::Topic", {
        TopicName: "sachain-kyc-admin-notifications-test",
        Tags: Match.arrayWith([
          {
            Key: "Purpose",
            Value: "KYC-Admin-Notifications",
          },
        ]),
      });

      template.hasResourceProperties("AWS::SNS::Topic", {
        TopicName: "sachain-kyc-user-notifications-test",
        Tags: Match.arrayWith([
          {
            Key: "Purpose",
            Value: "KYC-User-Notifications",
          },
        ]),
      });
    });

    test("applies correct tags to EventBridge bus", () => {
      template.hasResourceProperties("AWS::Events::EventBus", {
        Tags: Match.arrayWith([
          {
            Key: "Purpose",
            Value: "KYC-Events",
          },
        ]),
      });
    });

    test("applies correct tags to CloudWatch log group", () => {
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        Tags: Match.arrayWith([
          {
            Key: "Purpose",
            Value: "KYC-Event-Logging",
          },
        ]),
      });
    });
  });

  describe("Stack Outputs", () => {
    beforeEach(() => {
      new EventBridgeConstruct(stack, "TestEventBridge", {
        environment: "test",
      });
      template = Template.fromStack(stack);
    });

    test("creates output for EventBridge bus ARN", () => {
      template.hasOutput("EventBusArn", {
        Description: "KYC EventBridge Bus ARN",
        Value: {
          "Fn::GetAtt": [Match.stringLikeRegexp(".*KYCEventBus.*"), "Arn"],
        },
      });
    });

    test("creates output for admin notification topic ARN", () => {
      template.hasOutput("AdminNotificationTopicArn", {
        Description: "Admin Notification SNS Topic ARN",
        Value: {
          Ref: Match.stringLikeRegexp(".*AdminNotificationTopic.*"),
        },
      });
    });

    test("creates output for user notification topic ARN", () => {
      template.hasOutput("UserNotificationTopicArn", {
        Description: "User Notification SNS Topic ARN",
        Value: {
          Ref: Match.stringLikeRegexp(".*UserNotificationTopic.*"),
        },
      });
    });
  });

  describe("Construct Properties", () => {
    test("exposes EventBridge bus as public property", () => {
      const construct = new EventBridgeConstruct(stack, "TestEventBridge", {
        environment: "test",
      });

      expect(construct.eventBus).toBeInstanceOf(events.EventBus);
      expect(construct.eventBus.eventBusName).toBe("sachain-kyc-events-test");
    });

    test("exposes SNS topics as public properties", () => {
      const construct = new EventBridgeConstruct(stack, "TestEventBridge", {
        environment: "test",
      });

      expect(construct.notificationTopic).toBeInstanceOf(sns.Topic);
      expect(construct.userNotificationTopic).toBeInstanceOf(sns.Topic);
    });

    test("exposes event rules as public properties", () => {
      const construct = new EventBridgeConstruct(stack, "TestEventBridge", {
        environment: "test",
      });

      expect(construct.kycStatusChangeRule).toBeInstanceOf(events.Rule);
      expect(construct.kycDocumentUploadedRule).toBeInstanceOf(events.Rule);
      expect(construct.kycReviewCompletedRule).toBeInstanceOf(events.Rule);
    });
  });

  describe("Error Scenarios", () => {
    test("handles empty admin emails array", () => {
      expect(() => {
        new EventBridgeConstruct(stack, "TestEventBridge", {
          environment: "test",
          adminEmails: [],
        });
      }).not.toThrow();
    });

    test("handles undefined admin emails", () => {
      expect(() => {
        new EventBridgeConstruct(stack, "TestEventBridge", {
          environment: "test",
          adminEmails: undefined,
        });
      }).not.toThrow();
    });

    test("creates default admin email when no emails provided", () => {
      new EventBridgeConstruct(stack, "TestEventBridge", {
        environment: "test",
        adminEmails: [],
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties("AWS::SNS::Subscription", {
        Protocol: "email",
        Endpoint: "admin@sachain-test.com",
      });
    });
  });

  describe("Integration with Different Environments", () => {
    test("creates resources with production environment naming", () => {
      new EventBridgeConstruct(stack, "TestEventBridge", {
        environment: "prod",
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties("AWS::Events::EventBus", {
        Name: "sachain-kyc-events-prod",
      });

      template.hasResourceProperties("AWS::SNS::Topic", {
        TopicName: "sachain-kyc-admin-notifications-prod",
      });

      template.hasResourceProperties("AWS::Logs::LogGroup", {
        LogGroupName: "/aws/events/sachain-kyc-prod",
      });
    });

    test("creates resources with staging environment naming", () => {
      new EventBridgeConstruct(stack, "TestEventBridge", {
        environment: "staging",
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties("AWS::Events::EventBus", {
        Name: "sachain-kyc-events-staging",
      });

      template.hasResourceProperties("AWS::SNS::Topic", {
        TopicName: "sachain-kyc-user-notifications-staging",
      });
    });
  });
});
