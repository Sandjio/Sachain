import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { EventStack, CoreStack } from "../../lib/stacks";

describe("EventStack Integration", () => {
  let app: cdk.App;
  let coreStack: CoreStack;
  let eventStack: EventStack;

  beforeEach(() => {
    app = new cdk.App();

    // Create CoreStack first (as it would be in real deployment)
    coreStack = new CoreStack(app, "TestCoreStack", {
      environment: "test",
    });

    // Create EventStack (independent of CoreStack)
    eventStack = new EventStack(app, "TestEventStack", {
      environment: "test",
      adminEmails: ["test@example.com"],
    });
  });

  test("EventStack can be deployed independently", () => {
    const template = Template.fromStack(eventStack);

    // Verify EventStack has its own resources
    template.hasResourceProperties("AWS::Events::EventBus", {
      Name: "sachain-kyc-events-test",
    });

    template.hasResourceProperties("AWS::SNS::Topic", {
      TopicName: "sachain-kyc-admin-notifications-test",
    });
  });

  test("EventStack exports are available for cross-stack references", () => {
    const template = Template.fromStack(eventStack);

    // Verify all required exports are present
    template.hasOutput("EventBusName", {
      Export: {
        Name: "test-sachain-event-bus-name",
      },
    });

    template.hasOutput("EventBusArn", {
      Export: {
        Name: "test-sachain-event-bus-arn",
      },
    });

    template.hasOutput("AdminNotificationTopicArn", {
      Export: {
        Name: "test-sachain-admin-notification-topic-arn",
      },
    });
  });

  test("EventStack resources are properly configured for KYC processing", () => {
    const template = Template.fromStack(eventStack);

    // Verify event rules are configured for KYC workflow
    template.hasResourceProperties("AWS::Events::Rule", {
      EventPattern: {
        source: ["sachain.kyc"],
        "detail-type": ["KYC Document Uploaded"],
        detail: {
          eventType: ["KYC_DOCUMENT_UPLOADED"],
        },
      },
    });

    template.hasResourceProperties("AWS::Events::Rule", {
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

  test("EventStack can coexist with CoreStack", () => {
    // Both stacks should be able to exist in the same app
    expect(coreStack).toBeDefined();
    expect(eventStack).toBeDefined();

    // Verify they have different resource scopes
    const coreTemplate = Template.fromStack(coreStack);
    const eventTemplate = Template.fromStack(eventStack);

    // CoreStack should have DynamoDB, EventStack should have EventBridge
    coreTemplate.hasResourceProperties("AWS::DynamoDB::Table", {});
    eventTemplate.hasResourceProperties("AWS::Events::EventBus", {});
  });
});
