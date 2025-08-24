import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { MonitoringConstruct } from "../constructs";
import { MonitoringStackOutputs, StackDependencies } from "../interfaces";
import { CrossStackValidator, ResourceReferenceTracker } from "../utils";

export interface MonitoringStackProps extends cdk.StackProps {
  environment: string;
  // Post-auth lambda from CoreStack (consolidated structure)
  postAuthLambda: lambda.Function;
  // Lambda functions from LambdaStack (consolidated structure)
  kycUploadLambda: lambda.Function;
  adminReviewLambda: lambda.Function;
  userNotificationLambda: lambda.Function;
  kycProcessingLambda: lambda.Function;
  complianceLambda?: lambda.Function; // Optional as it might not exist yet
  // Optional monitoring configuration
  alertEmail?: string;
  enableDetailedMonitoring?: boolean;
}

export class MonitoringStack
  extends cdk.Stack
  implements MonitoringStackOutputs
{
  public readonly monitoringConstruct: MonitoringConstruct;

  // MonitoringStackOutputs interface implementation
  public readonly dashboard: cdk.aws_cloudwatch.Dashboard;
  public readonly alertTopic: cdk.aws_sns.Topic;
  public readonly alarms: cdk.aws_cloudwatch.Alarm[];
  public readonly dashboardUrl: string;
  public readonly dashboardName: string;
  public readonly alertTopicArn: string;
  public readonly alarmArns: string[];
  public readonly alarmCount: number;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // Validate dependencies for consolidated stack structure
    const dependencies: StackDependencies["monitoring"] = {
      lambdaOutputs: {
        kycUploadLambda: props.kycUploadLambda,
        adminReviewLambda: props.adminReviewLambda,
        userNotificationLambda: props.userNotificationLambda,
        kycProcessingLambda: props.kycProcessingLambda,
        complianceLambda: props.complianceLambda,
      },
      coreOutputs: {
        postAuthLambda: props.postAuthLambda,
      },
    };

    CrossStackValidator.validateMonitoringStackDependencies(dependencies, id);

    // Record cross-stack references for tracking (consolidated structure)
    ResourceReferenceTracker.recordReference(id, "CoreStack", "postAuthLambda");
    ResourceReferenceTracker.recordReference(
      id,
      "LambdaStack",
      "kycUploadLambda"
    );
    ResourceReferenceTracker.recordReference(
      id,
      "LambdaStack",
      "adminReviewLambda"
    );
    ResourceReferenceTracker.recordReference(
      id,
      "LambdaStack",
      "userNotificationLambda"
    );
    ResourceReferenceTracker.recordReference(
      id,
      "LambdaStack",
      "kycProcessingLambda"
    );
    if (props.complianceLambda) {
      ResourceReferenceTracker.recordReference(
        id,
        "LambdaStack",
        "complianceLambda"
      );
    }

    // Add environment tags
    cdk.Tags.of(this).add("Environment", props.environment);
    cdk.Tags.of(this).add("Project", "Sachain");
    cdk.Tags.of(this).add("Component", "Monitoring");

    // Collect all Lambda functions for monitoring (consolidated structure)
    const lambdaFunctions = [
      props.postAuthLambda, // From CoreStack (consolidated auth resources)
      props.kycUploadLambda, // From LambdaStack (consolidated event resources)
      props.adminReviewLambda,
      props.userNotificationLambda,
      props.kycProcessingLambda,
    ];

    // Add compliance lambda if it exists
    if (props.complianceLambda) {
      lambdaFunctions.push(props.complianceLambda);
    }

    // Create monitoring construct with all Lambda functions
    this.monitoringConstruct = new MonitoringConstruct(this, "Monitoring", {
      lambdaFunctions,
      environment: props.environment,
      alertEmail: props.alertEmail,
      enableDetailedMonitoring: props.enableDetailedMonitoring,
    });

    // Expose monitoring resources
    this.dashboard = this.monitoringConstruct.dashboard;
    this.alertTopic = this.monitoringConstruct.alertTopic;
    this.alarms = this.monitoringConstruct.alarms;
    this.dashboardUrl = `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.monitoringConstruct.dashboard.dashboardName}`;
    this.dashboardName = this.monitoringConstruct.dashboard.dashboardName;
    this.alertTopicArn = this.monitoringConstruct.alertTopic.topicArn;
    this.alarmArns = this.monitoringConstruct.alarms.map(
      (alarm) => alarm.alarmArn
    );
    this.alarmCount = this.alarms.length;

    // Create stack outputs for cross-stack references
    this.createStackOutputs(props.environment);
  }

  private createStackOutputs(environment: string): void {
    // Export dashboard URL (consolidated monitoring for all stacks)
    new cdk.CfnOutput(this, "DashboardUrl", {
      value: this.dashboardUrl,
      description: "CloudWatch Dashboard URL for consolidated stack monitoring",
      exportName: `${environment}-sachain-monitoring-dashboard-url`,
    });

    // Export alert topic ARN (consolidated alerting for all stacks)
    new cdk.CfnOutput(this, "AlertTopicArn", {
      value: this.alertTopicArn,
      description: "SNS Alert Topic ARN for consolidated stack monitoring",
      exportName: `${environment}-sachain-monitoring-alert-topic-arn`,
    });

    // Export dashboard name for programmatic access
    new cdk.CfnOutput(this, "DashboardName", {
      value: this.monitoringConstruct.dashboard.dashboardName,
      description:
        "CloudWatch Dashboard Name for consolidated stack monitoring",
      exportName: `${environment}-sachain-monitoring-dashboard-name`,
    });

    // Export number of alarms created (includes alarms for all consolidated stacks)
    new cdk.CfnOutput(this, "AlarmCount", {
      value: this.alarmArns.length.toString(),
      description:
        "Number of CloudWatch Alarms Created for consolidated stack monitoring",
      exportName: `${environment}-sachain-monitoring-alarm-count`,
    });
  }
}
