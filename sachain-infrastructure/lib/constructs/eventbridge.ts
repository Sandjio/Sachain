import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";

export interface EventBridgeConstructProps {
  environment: string;
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

    // SNS topic for notifications - will be configured in task 6.3
    this.notificationTopic = new sns.Topic(this, "NotificationTopic", {
      topicName: `sachain-kyc-notifications-${props.environment}`,
      displayName: "Sachain KYC Notifications",
    });
  }
}
