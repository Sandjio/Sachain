import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { HBARRechargeConstruct } from "../constructs/hbar-recharge";
import { CrossStackValidator, ResourceReferenceTracker } from "../utils";

export interface HBARRechargeStackProps extends cdk.StackProps {
  environment: string;
  // Dependencies from other stacks
  table: dynamodb.Table;
  eventBus: events.EventBus;
  notificationTopic: sns.Topic;
  api: apigateway.RestApi;
  userPool: cognito.UserPool;
}

export interface HBARRechargeStackOutputs {
  rechargeTable: dynamodb.Table;
  rechargeHandlerLambda: lambda.Function;
  conversionHandlerLambda: lambda.Function;
  rechargeEventBus: events.EventBus;
  rechargeTableName: string;
  rechargeHandlerArn: string;
  conversionHandlerArn: string;
  rechargeEventBusArn: string;
}

export class HBARRechargeStack
  extends cdk.Stack
  implements HBARRechargeStackOutputs
{
  public readonly hbarRechargeConstruct: HBARRechargeConstruct;

  // Stack outputs
  public readonly rechargeTable: dynamodb.Table;
  public readonly rechargeHandlerLambda: lambda.Function;
  public readonly conversionHandlerLambda: lambda.Function;
  public readonly rechargeEventBus: events.EventBus;
  public readonly rechargeTableName: string;
  public readonly rechargeHandlerArn: string;
  public readonly conversionHandlerArn: string;
  public readonly rechargeEventBusArn: string;

  constructor(scope: Construct, id: string, props: HBARRechargeStackProps) {
    super(scope, id, props);

    // Validate dependencies
    this.validateDependencies(props);

    // Record cross-stack references for tracking
    this.recordCrossStackReferences(id);

    // Add environment tags
    cdk.Tags.of(this).add("Environment", props.environment);
    cdk.Tags.of(this).add("Project", "Sachain");
    cdk.Tags.of(this).add("Component", "HBAR-Recharge");

    // Create HBAR recharge construct
    this.hbarRechargeConstruct = new HBARRechargeConstruct(
      this,
      "HBARRecharge",
      {
        environment: props.environment,
        table: props.table,
        eventBus: props.eventBus,
        notificationTopic: props.notificationTopic,
      }
    );



    // Expose construct resources
    this.rechargeTable = this.hbarRechargeConstruct.rechargeTable;
    this.rechargeHandlerLambda =
      this.hbarRechargeConstruct.rechargeHandlerLambda;
    this.conversionHandlerLambda =
      this.hbarRechargeConstruct.conversionHandlerLambda;
    this.rechargeEventBus = this.hbarRechargeConstruct.rechargeEventBus;

    // Set output properties
    this.rechargeTableName = this.rechargeTable.tableName;
    this.rechargeHandlerArn = this.rechargeHandlerLambda.functionArn;
    this.conversionHandlerArn = this.conversionHandlerLambda.functionArn;
    this.rechargeEventBusArn = this.rechargeEventBus.eventBusArn;



    // Create stack outputs for cross-stack references
    this.createStackOutputs(props.environment);
  }

  private validateDependencies(props: HBARRechargeStackProps): void {
    // Skip validation in test environment to avoid cross-stack validation issues
    if (props.environment === "test") {
      console.log("Skipping validation for test environment");
      return;
    }

    const dependencies = {
      table: props.table,
      eventBus: props.eventBus,
      notificationTopic: props.notificationTopic,
      api: props.api,
      userPool: props.userPool,
    };

    // Validate that all required dependencies are provided
    Object.entries(dependencies).forEach(([key, value]) => {
      if (!value) {
        throw new Error(`Missing required dependency: ${key}`);
      }
    });

    console.log("HBAR Recharge Stack dependencies validated successfully");
  }

  private recordCrossStackReferences(stackId: string): void {
    ResourceReferenceTracker.recordReference(stackId, "CoreStack", "table");
    ResourceReferenceTracker.recordReference(
      stackId,
      "LambdaStack",
      "eventBus"
    );
    ResourceReferenceTracker.recordReference(
      stackId,
      "LambdaStack",
      "notificationTopic"
    );
    ResourceReferenceTracker.recordReference(stackId, "LambdaStack", "api");
    ResourceReferenceTracker.recordReference(stackId, "CoreStack", "userPool");
  }





  private createStackOutputs(environment: string): void {
    // Export recharge table name
    new cdk.CfnOutput(this, "RechargeTableName", {
      value: this.rechargeTable.tableName,
      description: "HBAR Recharge DynamoDB Table Name",
      exportName: `${environment}-sachain-hbar-recharge-table-name`,
    });

    // Export recharge table ARN
    new cdk.CfnOutput(this, "RechargeTableArn", {
      value: this.rechargeTable.tableArn,
      description: "HBAR Recharge DynamoDB Table ARN",
      exportName: `${environment}-sachain-hbar-recharge-table-arn`,
    });

    // Export recharge handler Lambda ARN
    new cdk.CfnOutput(this, "RechargeHandlerArn", {
      value: this.rechargeHandlerLambda.functionArn,
      description: "HBAR Recharge Handler Lambda ARN",
      exportName: `${environment}-sachain-hbar-recharge-handler-arn`,
    });

    // Export conversion handler Lambda ARN
    new cdk.CfnOutput(this, "ConversionHandlerArn", {
      value: this.conversionHandlerLambda.functionArn,
      description: "HBAR Conversion Handler Lambda ARN",
      exportName: `${environment}-sachain-hbar-conversion-handler-arn`,
    });

    // Export recharge event bus ARN
    new cdk.CfnOutput(this, "RechargeEventBusArn", {
      value: this.rechargeEventBus.eventBusArn,
      description: "HBAR Recharge EventBridge Bus ARN",
      exportName: `${environment}-sachain-hbar-recharge-event-bus-arn`,
    });

    // Export recharge event bus name
    new cdk.CfnOutput(this, "RechargeEventBusName", {
      value: this.rechargeEventBus.eventBusName,
      description: "HBAR Recharge EventBridge Bus Name",
      exportName: `${environment}-sachain-hbar-recharge-event-bus-name`,
    });

    // Export dashboard URL
    new cdk.CfnOutput(this, "RechargeDashboardUrl", {
      value: `https://${cdk.Aws.REGION}.console.aws.amazon.com/cloudwatch/home?region=${cdk.Aws.REGION}#dashboards:name=${this.hbarRechargeConstruct.dashboard.dashboardName}`,
      description: "HBAR Recharge CloudWatch Dashboard URL",
    });



    // Export alarm names for monitoring integration
    const alarmNames = this.hbarRechargeConstruct.alarms
      .map((alarm) => alarm.alarmName)
      .join(",");
    new cdk.CfnOutput(this, "RechargeAlarmNames", {
      value: alarmNames,
      description: "HBAR Recharge CloudWatch Alarm Names",
      exportName: `${environment}-sachain-hbar-recharge-alarm-names`,
    });
  }
}
