import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";
import { EventBridgeConstruct } from "../constructs";
import { EventStackOutputs } from "../interfaces";

export interface EventStackProps extends cdk.StackProps {
  environment: string;
  adminEmails?: string[];
}

export class EventStack extends cdk.Stack implements EventStackOutputs {
  public readonly eventBridgeConstruct: EventBridgeConstruct;

  // EventStackOutputs interface implementation
  public readonly eventBus: events.EventBus;
  public readonly eventBusName: string;
  public readonly eventBusArn: string;
  public readonly notificationTopic: sns.Topic;
  public readonly userNotificationTopic: sns.Topic;
  public readonly adminNotificationTopicArn: string;
  public readonly userNotificationTopicArn: string;
  public readonly kycStatusChangeRule: events.Rule;
  public readonly kycDocumentUploadedRule: events.Rule;
  public readonly kycReviewCompletedRule: events.Rule;
  public readonly kycStatusChangeRuleArn: string;
  public readonly kycDocumentUploadedRuleArn: string;
  public readonly kycReviewCompletedRuleArn: string;

  constructor(scope: Construct, id: string, props: EventStackProps) {
    super(scope, id, props);

    // Add environment tags
    cdk.Tags.of(this).add("Environment", props.environment);
    cdk.Tags.of(this).add("Project", "Sachain");
    cdk.Tags.of(this).add("Component", "Events");

    // Create EventBridge and SNS resources
    this.eventBridgeConstruct = new EventBridgeConstruct(this, "EventBridge", {
      environment: props.environment,
      adminEmails: props.adminEmails,
    });

    // Expose resources for cross-stack references
    this.eventBus = this.eventBridgeConstruct.eventBus;
    this.eventBusName = this.eventBus.eventBusName;
    this.eventBusArn = this.eventBus.eventBusArn;
    this.notificationTopic = this.eventBridgeConstruct.notificationTopic;
    this.userNotificationTopic =
      this.eventBridgeConstruct.userNotificationTopic;
    this.adminNotificationTopicArn = this.notificationTopic.topicArn;
    this.userNotificationTopicArn = this.userNotificationTopic.topicArn;
    this.kycStatusChangeRule = this.eventBridgeConstruct.kycStatusChangeRule;
    this.kycDocumentUploadedRule =
      this.eventBridgeConstruct.kycDocumentUploadedRule;
    this.kycReviewCompletedRule =
      this.eventBridgeConstruct.kycReviewCompletedRule;
    this.kycStatusChangeRuleArn = this.kycStatusChangeRule.ruleArn;
    this.kycDocumentUploadedRuleArn = this.kycDocumentUploadedRule.ruleArn;
    this.kycReviewCompletedRuleArn = this.kycReviewCompletedRule.ruleArn;

    // Create stack outputs for cross-stack references
    new cdk.CfnOutput(this, "EventBusName", {
      value: this.eventBus.eventBusName,
      description: "EventBridge Bus Name",
      exportName: `${props.environment}-sachain-event-bus-name`,
    });

    new cdk.CfnOutput(this, "EventBusArn", {
      value: this.eventBus.eventBusArn,
      description: "EventBridge Bus ARN",
      exportName: `${props.environment}-sachain-event-bus-arn`,
    });

    new cdk.CfnOutput(this, "AdminNotificationTopicArn", {
      value: this.notificationTopic.topicArn,
      description: "Admin Notification SNS Topic ARN",
      exportName: `${props.environment}-sachain-admin-notification-topic-arn`,
    });

    new cdk.CfnOutput(this, "UserNotificationTopicArn", {
      value: this.userNotificationTopic.topicArn,
      description: "User Notification SNS Topic ARN",
      exportName: `${props.environment}-sachain-user-notification-topic-arn`,
    });

    new cdk.CfnOutput(this, "KycStatusChangeRuleArn", {
      value: this.kycStatusChangeRule.ruleArn,
      description: "KYC Status Change Event Rule ARN",
      exportName: `${props.environment}-sachain-kyc-status-change-rule-arn`,
    });

    new cdk.CfnOutput(this, "KycDocumentUploadedRuleArn", {
      value: this.kycDocumentUploadedRule.ruleArn,
      description: "KYC Document Uploaded Event Rule ARN",
      exportName: `${props.environment}-sachain-kyc-document-uploaded-rule-arn`,
    });

    new cdk.CfnOutput(this, "KycReviewCompletedRuleArn", {
      value: this.kycReviewCompletedRule.ruleArn,
      description: "KYC Review Completed Event Rule ARN",
      exportName: `${props.environment}-sachain-kyc-review-completed-rule-arn`,
    });
  }
}
