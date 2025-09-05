import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";

export interface HBARRechargeConstructProps {
  environment: string;
  table: dynamodb.Table;
  eventBus: events.EventBus;
  notificationTopic: sns.Topic;
}

export class HBARRechargeConstruct extends Construct {
  public readonly rechargeTable: dynamodb.Table;
  public readonly rechargeHandlerLambda: lambda.Function;
  public readonly conversionHandlerLambda: lambda.Function;
  public readonly rechargeHandlerRole: iam.Role;
  public readonly conversionHandlerRole: iam.Role;
  public readonly rechargeEventBus: events.EventBus;
  public readonly paymentSuccessRule: events.Rule;
  public readonly conversionCompleteRule: events.Rule;
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alarms: cloudwatch.Alarm[];

  constructor(scope: Construct, id: string, props: HBARRechargeConstructProps) {
    super(scope, id);

    // Create dedicated DynamoDB table for recharge transactions
    this.rechargeTable = this.createRechargeTable(props.environment);

    // Create custom EventBridge bus for recharge events
    this.rechargeEventBus = this.createRechargeEventBus(props.environment);

    // Create IAM roles with least privilege access
    this.rechargeHandlerRole = this.createRechargeHandlerRole(props);
    this.conversionHandlerRole = this.createConversionHandlerRole(props);

    // Create Lambda functions
    this.rechargeHandlerLambda = this.createRechargeHandlerLambda(props);
    this.conversionHandlerLambda = this.createConversionHandlerLambda(props);

    // Create EventBridge rules and targets
    this.paymentSuccessRule = this.createPaymentSuccessRule();
    this.conversionCompleteRule = this.createConversionCompleteRule();

    // Create monitoring and alerting
    this.alarms = this.createAlarms(props.notificationTopic);
    this.dashboard = this.createDashboard(props.environment);

    // Add tags for resource management
    this.addResourceTags(props.environment);
  }

  private createRechargeTable(environment: string): dynamodb.Table {
    const table = new dynamodb.Table(this, "RechargeTable", {
      tableName: `sachain-hbar-recharge-${environment}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy:
        environment === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI1: Query transactions by status
    table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: Query transactions by user
    table.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: { name: "GSI2PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI2SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI3: Query exchange rates by currency pair
    table.addGlobalSecondaryIndex({
      indexName: "GSI3",
      partitionKey: { name: "GSI3PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI3SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    return table;
  }

  private createRechargeEventBus(environment: string): events.EventBus {
    return new events.EventBus(this, "RechargeEventBus", {
      eventBusName: `sachain-hbar-recharge-events-${environment}`,
    });
  }

  private createRechargeHandlerRole(
    props: HBARRechargeConstructProps
  ): iam.Role {
    const role = new iam.Role(this, "RechargeHandlerRole", {
      roleName: `sachain-hbar-recharge-handler-role-${props.environment}`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Role for HBAR recharge request handler Lambda",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // DynamoDB permissions for recharge table
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBRechargeOperations",
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
        ],
        resources: [
          this.rechargeTable.tableArn,
          `${this.rechargeTable.tableArn}/index/*`,
        ],
      })
    );

    // DynamoDB permissions for main table (user data)
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBUserOperations",
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:GetItem", "dynamodb:Query"],
        resources: [props.table.tableArn, `${props.table.tableArn}/index/*`],
        conditions: {
          "ForAllValues:StringLike": {
            "dynamodb:LeadingKeys": ["USER#*"],
          },
        },
      })
    );

    // EventBridge permissions for publishing events
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "EventBridgePublish",
        effect: iam.Effect.ALLOW,
        actions: ["events:PutEvents"],
        resources: [this.rechargeEventBus.eventBusArn],
        conditions: {
          StringEquals: {
            "events:source": "sachain.hbar-recharge",
          },
        },
      })
    );

    // CloudWatch metrics permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "CloudWatchMetrics",
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "Sachain/HBARRecharge",
          },
        },
      })
    );

    // X-Ray tracing permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "XRayTracing",
        effect: iam.Effect.ALLOW,
        actions: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
        resources: ["*"],
      })
    );

    // Secrets Manager permissions for Orange Money API credentials
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "SecretsManagerAccess",
        effect: iam.Effect.ALLOW,
        actions: ["secretsmanager:GetSecretValue"],
        resources: [
          `arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:sachain/orange-money/*`,
          `arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:sachain/exchange-rates/*`,
        ],
      })
    );

    return role;
  }

  private createConversionHandlerRole(
    props: HBARRechargeConstructProps
  ): iam.Role {
    const role = new iam.Role(this, "ConversionHandlerRole", {
      roleName: `sachain-hbar-conversion-handler-role-${props.environment}`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Role for HBAR conversion handler Lambda",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // DynamoDB permissions for recharge table
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBRechargeOperations",
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
        ],
        resources: [
          this.rechargeTable.tableArn,
          `${this.rechargeTable.tableArn}/index/*`,
        ],
      })
    );

    // EventBridge permissions for publishing events
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "EventBridgePublish",
        effect: iam.Effect.ALLOW,
        actions: ["events:PutEvents"],
        resources: [this.rechargeEventBus.eventBusArn],
        conditions: {
          StringEquals: {
            "events:source": "sachain.hbar-recharge",
          },
        },
      })
    );

    // SNS permissions for notifications
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "SNSPublish",
        effect: iam.Effect.ALLOW,
        actions: ["sns:Publish"],
        resources: [props.notificationTopic.topicArn],
      })
    );

    // CloudWatch metrics permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "CloudWatchMetrics",
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "Sachain/HBARConversion",
          },
        },
      })
    );

    // X-Ray tracing permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "XRayTracing",
        effect: iam.Effect.ALLOW,
        actions: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
        resources: ["*"],
      })
    );

    // Secrets Manager permissions for Hedera and exchange rate API credentials
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "SecretsManagerAccess",
        effect: iam.Effect.ALLOW,
        actions: ["secretsmanager:GetSecretValue"],
        resources: [
          `arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:sachain/hedera/*`,
          `arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:sachain/exchange-rates/*`,
        ],
      })
    );

    return role;
  }

  private createRechargeHandlerLambda(
    props: HBARRechargeConstructProps
  ): lambda.Function {
    return new NodejsFunction(this, "RechargeHandlerLambda", {
      functionName: `sachain-hbar-recharge-handler-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(
        __dirname,
        "../../..",
        "backend/src/lambdas/hbar-recharge/index.ts"
      ),
      role: this.rechargeHandlerRole,
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
        externalModules: [
          "aws-lambda",
          "@aws-sdk/client-dynamodb",
          "@aws-sdk/lib-dynamodb",
          "@aws-sdk/client-eventbridge",
          "@aws-sdk/client-cloudwatch",
          "@aws-sdk/client-secretsmanager",
        ],
      },
      projectRoot: path.join(__dirname, "../../.."),
      environment: {
        RECHARGE_TABLE_NAME: this.rechargeTable.tableName,
        USER_TABLE_NAME: props.table.tableName,
        EVENT_BUS_NAME: this.rechargeEventBus.eventBusName,
        ENVIRONMENT: props.environment,
        ORANGE_MONEY_SECRET_NAME: `sachain/orange-money/${props.environment}`,
        EXCHANGE_RATE_SECRET_NAME: `sachain/exchange-rates/${props.environment}`,
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      tracing: lambda.Tracing.ACTIVE,
      deadLetterQueueEnabled: true,
      retryAttempts: 2,
    });
  }

  private createConversionHandlerLambda(
    props: HBARRechargeConstructProps
  ): lambda.Function {
    return new NodejsFunction(this, "ConversionHandlerLambda", {
      functionName: `sachain-hbar-conversion-handler-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(
        __dirname,
        "../../..",
        "backend/src/lambdas/hbar-conversion/index.ts"
      ),
      role: this.conversionHandlerRole,
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
        externalModules: [
          "aws-lambda",
          "@aws-sdk/client-dynamodb",
          "@aws-sdk/lib-dynamodb",
          "@aws-sdk/client-eventbridge",
          "@aws-sdk/client-cloudwatch",
          "@aws-sdk/client-secretsmanager",
          "@aws-sdk/client-sns",
        ],
      },
      projectRoot: path.join(__dirname, "../../.."),
      environment: {
        RECHARGE_TABLE_NAME: this.rechargeTable.tableName,
        EVENT_BUS_NAME: this.rechargeEventBus.eventBusName,
        NOTIFICATION_TOPIC_ARN: props.notificationTopic.topicArn,
        ENVIRONMENT: props.environment,
        HEDERA_SECRET_NAME: `sachain/hedera/${props.environment}`,
        EXCHANGE_RATE_SECRET_NAME: `sachain/exchange-rates/${props.environment}`,
      },
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
      tracing: lambda.Tracing.ACTIVE,
      deadLetterQueueEnabled: true,
      retryAttempts: 2,
    });
  }

  private createPaymentSuccessRule(): events.Rule {
    const rule = new events.Rule(this, "PaymentSuccessRule", {
      ruleName: `sachain-hbar-payment-success-${
        this.node.tryGetContext("environment") || "dev"
      }`,
      description:
        "Route Orange Money payment success events to HBAR conversion",
      eventBus: this.rechargeEventBus,
      eventPattern: {
        source: ["sachain.hbar-recharge"],
        detailType: ["Orange Money Payment Success"],
        detail: {
          eventType: ["ORANGE_MONEY_PAYMENT_SUCCESS"],
        },
      },
    });

    // Add conversion handler as target
    rule.addTarget(
      new targets.LambdaFunction(this.conversionHandlerLambda, {
        retryAttempts: 3,
        maxEventAge: cdk.Duration.hours(2),
      })
    );

    return rule;
  }

  private createConversionCompleteRule(): events.Rule {
    const rule = new events.Rule(this, "ConversionCompleteRule", {
      ruleName: `sachain-hbar-conversion-complete-${
        this.node.tryGetContext("environment") || "dev"
      }`,
      description: "Route HBAR conversion completion events for notifications",
      eventBus: this.rechargeEventBus,
      eventPattern: {
        source: ["sachain.hbar-recharge"],
        detailType: ["HBAR Conversion Complete"],
        detail: {
          eventType: ["HBAR_CONVERSION_COMPLETE", "HBAR_CONVERSION_FAILED"],
        },
      },
    });

    // Add CloudWatch Logs target for audit trail
    const logGroup = new logs.LogGroup(this, "RechargeAuditLogs", {
      logGroupName: `/sachain/hbar-recharge/audit/${
        this.node.tryGetContext("environment") || "dev"
      }`,
      retention: logs.RetentionDays.ONE_YEAR,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    rule.addTarget(
      new targets.CloudWatchLogGroup(logGroup, {
        logEvent: targets.LogGroupTargetInput.fromObjectV2({
          timestamp: events.EventField.fromPath("$.time"),
          message: events.RuleTargetInput.fromObject({
            auditEvent: "HBAR_CONVERSION_AUDIT",
            transactionId: events.EventField.fromPath("$.detail.transactionId"),
            userId: events.EventField.fromPath("$.detail.userId"),
            eventType: events.EventField.fromPath("$.detail.eventType"),
            xafAmount: events.EventField.fromPath("$.detail.xafAmount"),
            hbarAmount: events.EventField.fromPath("$.detail.hbarAmount"),
            exchangeRate: events.EventField.fromPath("$.detail.exchangeRate"),
            hederaTransactionId: events.EventField.fromPath(
              "$.detail.hederaTransactionId"
            ),
            status: events.EventField.fromPath("$.detail.status"),
          }),
        }),
      })
    );

    return rule;
  }

  private createAlarms(notificationTopic: sns.Topic): cloudwatch.Alarm[] {
    const alarms: cloudwatch.Alarm[] = [];

    // Recharge handler error alarm
    const rechargeErrorAlarm = new cloudwatch.Alarm(
      this,
      "RechargeErrorAlarm",
      {
        alarmName: "HBAR-Recharge-Handler-Errors",
        alarmDescription: "High error rate in HBAR recharge handler",
        metric: this.rechargeHandlerLambda.metricErrors({
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    rechargeErrorAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(notificationTopic)
    );
    alarms.push(rechargeErrorAlarm);

    // Conversion handler error alarm
    const conversionErrorAlarm = new cloudwatch.Alarm(
      this,
      "ConversionErrorAlarm",
      {
        alarmName: "HBAR-Conversion-Handler-Errors",
        alarmDescription: "High error rate in HBAR conversion handler",
        metric: this.conversionHandlerLambda.metricErrors({
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        threshold: 3,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    conversionErrorAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(notificationTopic)
    );
    alarms.push(conversionErrorAlarm);

    // Recharge processing duration alarm
    const rechargeDurationAlarm = new cloudwatch.Alarm(
      this,
      "RechargeDurationAlarm",
      {
        alarmName: "HBAR-Recharge-Processing-Duration",
        alarmDescription: "High processing duration for recharge requests",
        metric: this.rechargeHandlerLambda.metricDuration({
          period: cdk.Duration.minutes(5),
          statistic: "Average",
        }),
        threshold: 60000, // 60 seconds
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    rechargeDurationAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(notificationTopic)
    );
    alarms.push(rechargeDurationAlarm);

    // Conversion processing duration alarm
    const conversionDurationAlarm = new cloudwatch.Alarm(
      this,
      "ConversionDurationAlarm",
      {
        alarmName: "HBAR-Conversion-Processing-Duration",
        alarmDescription: "High processing duration for HBAR conversions",
        metric: this.conversionHandlerLambda.metricDuration({
          period: cdk.Duration.minutes(5),
          statistic: "Average",
        }),
        threshold: 120000, // 2 minutes
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    conversionDurationAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(notificationTopic)
    );
    alarms.push(conversionDurationAlarm);

    // Failed recharge transactions alarm
    const failedRechargeAlarm = new cloudwatch.Alarm(
      this,
      "FailedRechargeAlarm",
      {
        alarmName: "HBAR-Failed-Recharge-Transactions",
        alarmDescription: "High rate of failed recharge transactions",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/HBARRecharge",
          metricName: "RechargeTransactionFailed",
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        threshold: 10,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );
    failedRechargeAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(notificationTopic)
    );
    alarms.push(failedRechargeAlarm);

    // Exchange rate staleness alarm
    const staleRateAlarm = new cloudwatch.Alarm(
      this,
      "StaleExchangeRateAlarm",
      {
        alarmName: "HBAR-Stale-Exchange-Rate",
        alarmDescription: "Exchange rate data is stale",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/HBARConversion",
          metricName: "ExchangeRateStale",
          period: cdk.Duration.minutes(5),
          statistic: "Maximum",
        }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      }
    );
    staleRateAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(notificationTopic)
    );
    alarms.push(staleRateAlarm);

    // Treasury balance low alarm
    const lowBalanceAlarm = new cloudwatch.Alarm(
      this,
      "TreasuryLowBalanceAlarm",
      {
        alarmName: "HBAR-Treasury-Low-Balance",
        alarmDescription: "Treasury HBAR balance is low",
        metric: new cloudwatch.Metric({
          namespace: "Sachain/HBARConversion",
          metricName: "TreasuryBalance",
          period: cdk.Duration.minutes(15),
          statistic: "Minimum",
        }),
        threshold: 1000, // 1000 HBAR
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.BREACHING,
        comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      }
    );
    lowBalanceAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(notificationTopic)
    );
    alarms.push(lowBalanceAlarm);

    return alarms;
  }

  private createDashboard(environment: string): cloudwatch.Dashboard {
    const dashboard = new cloudwatch.Dashboard(this, "HBARRechargeDashboard", {
      dashboardName: `sachain-hbar-recharge-dashboard-${environment}`,
    });

    // Lambda metrics widgets
    const lambdaErrorWidget = new cloudwatch.GraphWidget({
      title: "Lambda Function Errors",
      left: [
        this.rechargeHandlerLambda.metricErrors(),
        this.conversionHandlerLambda.metricErrors(),
      ],
      width: 12,
      height: 6,
    });

    const lambdaDurationWidget = new cloudwatch.GraphWidget({
      title: "Lambda Function Duration",
      left: [
        this.rechargeHandlerLambda.metricDuration(),
        this.conversionHandlerLambda.metricDuration(),
      ],
      width: 12,
      height: 6,
    });

    // Business metrics widgets
    const rechargeMetricsWidget = new cloudwatch.GraphWidget({
      title: "Recharge Transaction Metrics",
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/HBARRecharge",
          metricName: "RechargeTransactionInitiated",
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/HBARRecharge",
          metricName: "RechargeTransactionCompleted",
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/HBARRecharge",
          metricName: "RechargeTransactionFailed",
          statistic: "Sum",
        }),
      ],
      width: 12,
      height: 6,
    });

    const conversionMetricsWidget = new cloudwatch.GraphWidget({
      title: "HBAR Conversion Metrics",
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/HBARConversion",
          metricName: "ConversionSuccess",
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/HBARConversion",
          metricName: "ConversionFailed",
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/HBARConversion",
          metricName: "HederaTransferSuccess",
          statistic: "Sum",
        }),
      ],
      width: 12,
      height: 6,
    });

    const exchangeRateWidget = new cloudwatch.GraphWidget({
      title: "Exchange Rate and Treasury Metrics",
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/HBARConversion",
          metricName: "ExchangeRateXAFHBAR",
          statistic: "Average",
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: "Sachain/HBARConversion",
          metricName: "TreasuryBalance",
          statistic: "Average",
        }),
      ],
      width: 12,
      height: 6,
    });

    const volumeMetricsWidget = new cloudwatch.GraphWidget({
      title: "Transaction Volume Metrics",
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/HBARRecharge",
          metricName: "TotalXAFVolume",
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/HBARConversion",
          metricName: "TotalHBARVolume",
          statistic: "Sum",
        }),
      ],
      width: 12,
      height: 6,
    });

    // Add widgets to dashboard
    dashboard.addWidgets(
      lambdaErrorWidget,
      lambdaDurationWidget,
      rechargeMetricsWidget,
      conversionMetricsWidget,
      exchangeRateWidget,
      volumeMetricsWidget
    );

    return dashboard;
  }

  private addResourceTags(environment: string): void {
    const tags = {
      Environment: environment,
      Project: "Sachain",
      Component: "HBAR-Recharge",
      Service: "Blockchain-Integration",
    };

    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(this.rechargeTable).add(key, value);
      cdk.Tags.of(this.rechargeEventBus).add(key, value);
      cdk.Tags.of(this.rechargeHandlerLambda).add(key, value);
      cdk.Tags.of(this.conversionHandlerLambda).add(key, value);
      cdk.Tags.of(this.dashboard).add(key, value);
    });
  }
}
