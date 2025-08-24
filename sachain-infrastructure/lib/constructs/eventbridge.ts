import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface EventBridgeConstructProps {
  environment: string;
  adminEmails?: string[];
  userNotificationLambda?: lambda.Function;
}

export class EventBridgeConstruct extends Construct {
  public readonly eventBus: events.EventBus;
  public readonly notificationTopic: sns.Topic;
  public readonly userNotificationTopic: sns.Topic;
  public readonly kycStatusChangeRule: events.Rule;
  public readonly kycDocumentUploadedRule: events.Rule;
  public readonly kycReviewCompletedRule: events.Rule;

  constructor(scope: Construct, id: string, props: EventBridgeConstructProps) {
    super(scope, id);

    // Custom EventBridge bus for KYC events
    this.eventBus = new events.EventBus(this, "KYCEventBus", {
      eventBusName: `sachain-kyc-events-${props.environment}`,
    });

    // SNS topic for KYC admin notifications
    this.notificationTopic = new sns.Topic(this, "AdminNotificationTopic", {
      topicName: `sachain-kyc-admin-notifications-${props.environment}`,
      displayName: "Sachain KYC Admin Notifications",
      fifo: false,
    });

    // SNS topic for user notifications
    this.userNotificationTopic = new sns.Topic(this, "UserNotificationTopic", {
      topicName: `sachain-kyc-user-notifications-${props.environment}`,
      displayName: "Sachain KYC User Notifications",
      fifo: false,
    });

    // Add email subscriptions for admin notifications
    const defaultAdminEmails = props.adminEmails || [
      `sandjioemmanuel@protonmail.com`,
    ];

    defaultAdminEmails.forEach((email, index) => {
      this.notificationTopic.addSubscription(
        new subscriptions.EmailSubscription(email, {
          json: false, // Send formatted email instead of raw JSON
        })
      );
    });

    // Create CloudWatch Log Group for event debugging
    const eventLogGroup = new logs.LogGroup(this, "KYCEventLogGroup", {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy:
        props.environment === "dev"
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN,
    });

    // Event Rule: KYC Status Change Events
    this.kycStatusChangeRule = new events.Rule(this, "KYCStatusChangeRule", {
      ruleName: `sachain-kyc-status-change-${props.environment}`,
      description: "Route KYC status change events to user notifications",
      eventBus: this.eventBus,
      eventPattern: {
        source: ["sachain.kyc"],
        detailType: ["KYC Status Changed"],
        detail: {
          eventType: ["KYC_STATUS_CHANGED"],
          newStatus: ["approved", "rejected"],
        },
      },
    });

    // Add targets for KYC status change events
    this.kycStatusChangeRule.addTarget(
      new targets.SnsTopic(this.userNotificationTopic, {
        message: events.RuleTargetInput.fromObject({
          eventType: events.EventField.fromPath("$.detail.eventType"),
          userId: events.EventField.fromPath("$.detail.userId"),
          documentId: events.EventField.fromPath("$.detail.documentId"),
          newStatus: events.EventField.fromPath("$.detail.newStatus"),
          reviewedBy: events.EventField.fromPath("$.detail.reviewedBy"),
          reviewComments: events.EventField.fromPath("$.detail.reviewComments"),
          timestamp: events.EventField.fromPath("$.detail.timestamp"),
        }),
      })
    );

    // User Notification Lambda target will be added later in the stack

    // Add CloudWatch Logs target for debugging
    this.kycStatusChangeRule.addTarget(
      new targets.CloudWatchLogGroup(eventLogGroup, {
        logEvent: targets.LogGroupTargetInput.fromObjectV2({
          timestamp: events.EventField.fromPath("$.time"),
          message: events.RuleTargetInput.fromObject({
            source: events.EventField.fromPath("$.source"),
            detailType: events.EventField.fromPath("$.detail-type"),
            eventType: events.EventField.fromPath("$.detail.eventType"),
            userId: events.EventField.fromPath("$.detail.userId"),
            documentId: events.EventField.fromPath("$.detail.documentId"),
            statusChange: {
              from: events.EventField.fromPath("$.detail.previousStatus"),
              to: events.EventField.fromPath("$.detail.newStatus"),
            },
            reviewedBy: events.EventField.fromPath("$.detail.reviewedBy"),
          }),
        }),
      })
    );

    // Event Rule: KYC Document Uploaded Events
    this.kycDocumentUploadedRule = new events.Rule(
      this,
      "KYCDocumentUploadedRule",
      {
        ruleName: `sachain-kyc-document-uploaded-${props.environment}`,
        description: "Route KYC document upload events to admin notifications",
        eventBus: this.eventBus,
        eventPattern: {
          source: ["sachain.kyc"],
          detailType: ["KYC Document Uploaded"],
          detail: {
            eventType: ["KYC_DOCUMENT_UPLOADED"],
          },
        },
      }
    );

    // Add CloudWatch Logs target for debugging
    this.kycDocumentUploadedRule.addTarget(
      new targets.CloudWatchLogGroup(eventLogGroup, {
        logEvent: targets.LogGroupTargetInput.fromObjectV2({
          timestamp: events.EventField.fromPath("$.time"),
          message: events.RuleTargetInput.fromObject({
            source: events.EventField.fromPath("$.source"),
            detailType: events.EventField.fromPath("$.detail-type"),
            eventType: events.EventField.fromPath("$.detail.eventType"),
            userId: events.EventField.fromPath("$.detail.userId"),
            documentId: events.EventField.fromPath("$.detail.documentId"),
            documentType: events.EventField.fromPath("$.detail.documentType"),
            fileSize: events.EventField.fromPath("$.detail.fileSize"),
          }),
        }),
      })
    );

    // Event Rule: KYC Review Completed Events
    this.kycReviewCompletedRule = new events.Rule(
      this,
      "KYCReviewCompletedRule",
      {
        ruleName: `sachain-kyc-review-completed-${props.environment}`,
        description:
          "Route KYC review completion events for audit and analytics",
        eventBus: this.eventBus,
        eventPattern: {
          source: ["sachain.kyc"],
          detailType: ["KYC Review Completed"],
          detail: {
            eventType: ["KYC_REVIEW_COMPLETED"],
          },
        },
      }
    );

    // Add CloudWatch Logs target for audit trail
    this.kycReviewCompletedRule.addTarget(
      new targets.CloudWatchLogGroup(eventLogGroup, {
        logEvent: targets.LogGroupTargetInput.fromObjectV2({
          timestamp: events.EventField.fromPath("$.time"),
          message: events.RuleTargetInput.fromObject({
            auditEvent: "KYC_REVIEW_COMPLETED",
            userId: events.EventField.fromPath("$.detail.userId"),
            documentId: events.EventField.fromPath("$.detail.documentId"),
            reviewedBy: events.EventField.fromPath("$.detail.reviewedBy"),
            reviewResult: events.EventField.fromPath("$.detail.reviewResult"),
            processingTimeMs: events.EventField.fromPath(
              "$.detail.processingTimeMs"
            ),
            reviewComments: events.EventField.fromPath(
              "$.detail.reviewComments"
            ),
          }),
        }),
      })
    );

    // Add tags for resource management
    cdk.Tags.of(this.notificationTopic).add(
      "Purpose",
      "KYC-Admin-Notifications"
    );
    cdk.Tags.of(this.userNotificationTopic).add(
      "Purpose",
      "KYC-User-Notifications"
    );
    cdk.Tags.of(this.eventBus).add("Purpose", "KYC-Events");
    cdk.Tags.of(eventLogGroup).add("Purpose", "KYC-Event-Logging");

    // Output important ARNs for reference
    new cdk.CfnOutput(this, "EventBusArn", {
      value: this.eventBus.eventBusArn,
      description: "KYC EventBridge Bus ARN",
    });

    new cdk.CfnOutput(this, "AdminNotificationTopicArn", {
      value: this.notificationTopic.topicArn,
      description: "Admin Notification SNS Topic ARN",
    });

    new cdk.CfnOutput(this, "UserNotificationTopicArn", {
      value: this.userNotificationTopic.topicArn,
      description: "User Notification SNS Topic ARN",
    });
  }

  public addLambdaTargets(
    kycProcessingLambda: lambda.Function,
    userNotificationLambda: lambda.Function
  ): void {
    // Add lambda targets to event rules
    this.kycDocumentUploadedRule.addTarget(
      new targets.LambdaFunction(kycProcessingLambda, {
        retryAttempts: 3,
        maxEventAge: cdk.Duration.hours(2),
      })
    );

    this.kycStatusChangeRule.addTarget(
      new targets.LambdaFunction(userNotificationLambda, {
        retryAttempts: 2,
        maxEventAge: cdk.Duration.hours(1),
      })
    );
  }
}
