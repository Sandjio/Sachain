import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface MonitoringConstructProps {
  lambdaFunctions: lambda.Function[];
  environment: string;
}

export class MonitoringConstruct extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    // CloudWatch dashboard - will be implemented in task 9.2
    this.dashboard = new cloudwatch.Dashboard(this, "KYCDashboard", {
      dashboardName: `sachain-kyc-dashboard-${props.environment}`,
    });

    // Log groups for Lambda functions - will be configured in task 9.1
    props.lambdaFunctions.forEach((func, index) => {
      new logs.LogGroup(this, `LogGroup${index}`, {
        logGroupName: `/aws/lambda/${func.functionName}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    });
  }
}
