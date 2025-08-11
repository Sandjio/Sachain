import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

export interface EventBridgeConstructProps {
  environment: string;
  adminEmails?: string[];
}

export class EventBridgeConstruct extends Construct {
  public readonly eventBus: events.EventBus;
  public readonly notificationTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: EventBridgeConstructProps) {
    super(scope, id);

    // Custom EventBridge bus - will be implemented in task 8.1
    this.eventBus = new events.EventBus(this, "KYCEventBus", {
      eventBusName: `sachain-kyc-events-${props.environment}`,
    });

    // SNS topic for KYC admin notifications
    this.notificationTopic = new sns.Topic(this, "NotificationTopic", {
      topicName: `sachain-kyc-notifications-${props.environment}`,
      displayName: "Sachain KYC Admin Notifications",
      fifo: false,
    });

    // Add email subscriptions for admin notifications
    const defaultAdminEmails = props.adminEmails || [
      `admin@sachain-${props.environment}.com`,
    ];

    defaultAdminEmails.forEach((email, index) => {
      this.notificationTopic.addSubscription(
        new subscriptions.EmailSubscription(email, {
          json: false, // Send formatted email instead of raw JSON
        })
      );
    });

    // Add tags for resource management
    cdk.Tags.of(this.notificationTopic).add("Purpose", "KYC-Admin-Notifications");
    cdk.Tags.of(this.eventBus).add("Purpose", "KYC-Events");
  }
}
