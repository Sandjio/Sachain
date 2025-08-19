import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { EventStack } from "../../lib/stacks";

describe("EventStack", () => {
  let app: cdk.App;
  let stack: EventStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new EventStack(app, "TestEventStack", {
      environment: "test",
      adminEmails: ["test@example.com"],
    });
    template = Template.fromStack(stack);
  });

  describe("EventBridge Resources", () => {
    test("creates custom EventBridge bus", () => {
      template.hasResourceProperties("AWS::Events::EventBus", {
        Name: "sachain-kyc-events-test",
      });
    });

    test("creates KYC status change rule", () => {
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
      });
    });

    test("creates KYC document uploaded rule", () => {
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
      });
    });

    test("creates KYC review completed rule", () => {
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
      });
    });
  });

  describe("SNS Resources", () => {
    test("creates admin notification topic", () => {
      template.hasResourceProperties("AWS::SNS::Topic", {
        TopicName: "sachain-kyc-admin-notifications-test",
        DisplayName: "Sachain KYC Admin Notifications",
        FifoTopic: false,
      });
    });

    test("creates user notification topic", () => {
      template.hasResourceProperties("AWS::SNS::Topic", {
        TopicName: "sachain-kyc-user-notifications-test",
        DisplayName: "Sachain KYC User Notifications",
        FifoTopic: false,
      });
    });

    test("creates email subscription for admin notifications", () => {
      template.hasResourceProperties("AWS::SNS::Subscription", {
        Protocol: "email",
        Endpoint: "test@example.com",
      });
    });
  });

  describe("CloudWatch Resources", () => {
    test("creates log group for event debugging", () => {
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        RetentionInDays: 30,
      });
    });
  });

  describe("Stack Outputs", () => {
    test("exports event bus name", () => {
      template.hasOutput("EventBusName", {
        Export: {
          Name: "test-sachain-event-bus-name",
        },
      });
    });

    test("exports event bus ARN", () => {
      template.hasOutput("EventBusArn", {
        Export: {
          Name: "test-sachain-event-bus-arn",
        },
      });
    });

    test("exports admin notification topic ARN", () => {
      template.hasOutput("AdminNotificationTopicArn", {
        Export: {
          Name: "test-sachain-admin-notification-topic-arn",
        },
      });
    });

    test("exports user notification topic ARN", () => {
      template.hasOutput("UserNotificationTopicArn", {
        Export: {
          Name: "test-sachain-user-notification-topic-arn",
        },
      });
    });

    test("exports KYC status change rule ARN", () => {
      template.hasOutput("KycStatusChangeRuleArn", {
        Export: {
          Name: "test-sachain-kyc-status-change-rule-arn",
        },
      });
    });

    test("exports KYC document uploaded rule ARN", () => {
      template.hasOutput("KycDocumentUploadedRuleArn", {
        Export: {
          Name: "test-sachain-kyc-document-uploaded-rule-arn",
        },
      });
    });

    test("exports KYC review completed rule ARN", () => {
      template.hasOutput("KycReviewCompletedRuleArn", {
        Export: {
          Name: "test-sachain-kyc-review-completed-rule-arn",
        },
      });
    });
  });

  describe("Resource Tagging", () => {
    test("applies environment tags to stack", () => {
      const stackTags = Template.fromStack(stack).toJSON().Parameters;
      // CDK automatically adds tags to the stack level
      expect(stack.tags.tagValues()).toEqual(
        expect.objectContaining({
          Environment: "test",
          Project: "Sachain",
          Component: "Events",
        })
      );
    });
  });

  describe("Cross-Stack References", () => {
    test("exposes event bus for cross-stack access", () => {
      expect(stack.eventBus).toBeDefined();
      expect(stack.eventBus.eventBusArn).toBeDefined();
    });

    test("exposes notification topics for cross-stack access", () => {
      expect(stack.notificationTopic).toBeDefined();
      expect(stack.userNotificationTopic).toBeDefined();
    });

    test("exposes event rules for cross-stack access", () => {
      expect(stack.kycStatusChangeRule).toBeDefined();
      expect(stack.kycDocumentUploadedRule).toBeDefined();
      expect(stack.kycReviewCompletedRule).toBeDefined();
    });
  });

  describe("Environment Configuration", () => {
    test("uses environment in resource naming", () => {
      const resources = template.findResources("AWS::Events::EventBus");
      const eventBusResource = Object.values(resources)[0];
      expect(eventBusResource.Properties.Name).toBe("sachain-kyc-events-test");
    });

    test("configures admin emails when provided", () => {
      const subscriptions = template.findResources("AWS::SNS::Subscription");
      expect(Object.keys(subscriptions)).toHaveLength(1);

      const subscription = Object.values(subscriptions)[0];
      expect(subscription.Properties.Endpoint).toBe("test@example.com");
    });
  });
});
