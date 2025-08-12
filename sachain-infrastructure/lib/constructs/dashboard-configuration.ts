/**
 * Advanced CloudWatch Dashboard Configuration
 * Creates comprehensive monitoring dashboards for the KYC system
 */

import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";

export interface DashboardConfiguration {
  dashboardName: string;
  environment: string;
  lambdaFunctions: lambda.Function[];
  tableName?: string;
  bucketName?: string;
  apiName?: string;
}

export class DashboardConfigurationManager {
  private readonly config: DashboardConfiguration;

  constructor(config: DashboardConfiguration) {
    this.config = config;
  }

  /**
   * Create the main KYC system dashboard
   */
  createMainDashboard(): cloudwatch.Dashboard {
    const dashboard = new cloudwatch.Dashboard(
      this.config.lambdaFunctions[0],
      "KYCSystemDashboard",
      {
        dashboardName: this.config.dashboardName,
      }
    );

    // Add all widget sections
    this.addSystemOverviewWidgets(dashboard);
    this.addLambdaPerformanceWidgets(dashboard);
    this.addBusinessMetricsWidgets(dashboard);
    this.addErrorAnalysisWidgets(dashboard);
    this.addSecurityMetricsWidgets(dashboard);
    this.addInfrastructureHealthWidgets(dashboard);

    return dashboard;
  }

  /**
   * Add system overview widgets
   */
  private addSystemOverviewWidgets(dashboard: cloudwatch.Dashboard): void {
    // System health summary
    const systemHealthWidget = new cloudwatch.SingleValueWidget({
      title: "System Health Overview",
      width: 24,
      height: 6,
      metrics: [
        new cloudwatch.Metric({
          namespace: "Sachain/System",
          metricName: "ServiceHealth",
          statistic: "Average",
          period: cdk.Duration.minutes(5),
          dimensionsMap: { Service: "Overall" },
        }),
      ],
      setPeriodToTimeRange: true,
    });

    // Key performance indicators
    const kpiWidget = new cloudwatch.GraphWidget({
      title: "Key Performance Indicators",
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/KYC",
          metricName: "UserConversionRate",
          statistic: "Average",
          period: cdk.Duration.hours(1),
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/KYC",
          metricName: "KYCProcessingTime",
          statistic: "Average",
          period: cdk.Duration.hours(1),
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: "Sachain/KYC",
          metricName: "PendingKYCDocuments",
          statistic: "Maximum",
          period: cdk.Duration.minutes(30),
        }),
      ],
    });

    // Request volume trends
    const volumeWidget = new cloudwatch.GraphWidget({
      title: "Request Volume Trends",
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/KYCUpload",
          metricName: "KYCUploadAttempts",
          statistic: "Sum",
          period: cdk.Duration.hours(1),
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCApprovalSuccess",
          statistic: "Sum",
          period: cdk.Duration.hours(1),
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCRejectionSuccess",
          statistic: "Sum",
          period: cdk.Duration.hours(1),
        }),
      ],
    });

    dashboard.addWidgets(systemHealthWidget, kpiWidget, volumeWidget);
  }

  /**
   * Add Lambda performance widgets
   */
  private addLambdaPerformanceWidgets(dashboard: cloudwatch.Dashboard): void {
    // Lambda errors
    const errorWidget = new cloudwatch.GraphWidget({
      title: "Lambda Function Errors",
      width: 12,
      height: 6,
      left: this.config.lambdaFunctions.map((func) =>
        func.metricErrors({
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        })
      ),
    });

    // Lambda duration
    const durationWidget = new cloudwatch.GraphWidget({
      title: "Lambda Function Duration",
      width: 12,
      height: 6,
      left: this.config.lambdaFunctions.map((func) =>
        func.metricDuration({
          period: cdk.Duration.minutes(5),
          statistic: "Average",
        })
      ),
    });

    // Lambda invocations
    const invocationWidget = new cloudwatch.GraphWidget({
      title: "Lambda Function Invocations",
      width: 12,
      height: 6,
      left: this.config.lambdaFunctions.map((func) =>
        func.metricInvocations({
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        })
      ),
    });

    // Lambda throttles
    const throttleWidget = new cloudwatch.GraphWidget({
      title: "Lambda Function Throttles",
      width: 12,
      height: 6,
      left: this.config.lambdaFunctions.map((func) =>
        func.metricThrottles({
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        })
      ),
    });

    dashboard.addWidgets(
      errorWidget,
      durationWidget,
      invocationWidget,
      throttleWidget
    );
  }

  /**
   * Add business metrics widgets
   */
  private addBusinessMetricsWidgets(dashboard: cloudwatch.Dashboard): void {
    // KYC upload success rate
    const uploadSuccessWidget = new cloudwatch.GraphWidget({
      title: "KYC Upload Success Rate",
      width: 12,
      height: 6,
      left: [
        new cloudwatch.MathExpression({
          expression: "(success / (success + failure)) * 100",
          usingMetrics: {
            success: new cloudwatch.Metric({
              namespace: "Sachain/KYCUpload",
              metricName: "KYCUploadSuccess",
              statistic: "Sum",
              period: cdk.Duration.hours(1),
            }),
            failure: new cloudwatch.Metric({
              namespace: "Sachain/KYCUpload",
              metricName: "KYCUploadFailure",
              statistic: "Sum",
              period: cdk.Duration.hours(1),
            }),
          },
          period: cdk.Duration.hours(1),
        }),
      ],
      leftYAxis: {
        min: 0,
        max: 100,
      },
    });

    // KYC approval rate
    const approvalRateWidget = new cloudwatch.GraphWidget({
      title: "KYC Approval Rate",
      width: 12,
      height: 6,
      left: [
        new cloudwatch.MathExpression({
          expression: "(approvals / (approvals + rejections)) * 100",
          usingMetrics: {
            approvals: new cloudwatch.Metric({
              namespace: "Sachain/AdminReview",
              metricName: "KYCApprovalSuccess",
              statistic: "Sum",
              period: cdk.Duration.hours(1),
            }),
            rejections: new cloudwatch.Metric({
              namespace: "Sachain/AdminReview",
              metricName: "KYCRejectionSuccess",
              statistic: "Sum",
              period: cdk.Duration.hours(1),
            }),
          },
          period: cdk.Duration.hours(1),
        }),
      ],
      leftYAxis: {
        min: 0,
        max: 100,
      },
    });

    // User registration trends
    const registrationWidget = new cloudwatch.GraphWidget({
      title: "User Registration Trends",
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/Authentication",
          metricName: "UserRegistrationSuccess",
          statistic: "Sum",
          period: cdk.Duration.hours(1),
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/Authentication",
          metricName: "EmailVerificationSuccess",
          statistic: "Sum",
          period: cdk.Duration.hours(1),
        }),
      ],
    });

    // Document processing pipeline
    const pipelineWidget = new cloudwatch.GraphWidget({
      title: "Document Processing Pipeline",
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/KYC",
          metricName: "PendingKYCDocuments",
          statistic: "Maximum",
          period: cdk.Duration.minutes(30),
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/KYC",
          metricName: "KYCProcessingTime",
          statistic: "Average",
          period: cdk.Duration.hours(1),
        }),
      ],
    });

    dashboard.addWidgets(
      uploadSuccessWidget,
      approvalRateWidget,
      registrationWidget,
      pipelineWidget
    );
  }

  /**
   * Add error analysis widgets
   */
  private addErrorAnalysisWidgets(dashboard: cloudwatch.Dashboard): void {
    // Error categories breakdown
    const errorCategoriesWidget = new cloudwatch.GraphWidget({
      title: "Error Categories Breakdown",
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/KYCUpload",
          metricName: "KYCUploadFailure",
          statistic: "Sum",
          period: cdk.Duration.minutes(30),
          dimensionsMap: { ErrorCategory: "validation" },
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/KYCUpload",
          metricName: "KYCUploadFailure",
          statistic: "Sum",
          period: cdk.Duration.minutes(30),
          dimensionsMap: { ErrorCategory: "system" },
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/KYCUpload",
          metricName: "KYCUploadFailure",
          statistic: "Sum",
          period: cdk.Duration.minutes(30),
          dimensionsMap: { ErrorCategory: "rate_limit" },
        }),
      ],
    });

    // Admin operation errors
    const adminErrorsWidget = new cloudwatch.GraphWidget({
      title: "Admin Operation Errors",
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCApprovalDatabaseError",
          statistic: "Sum",
          period: cdk.Duration.minutes(30),
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCRejectionDatabaseError",
          statistic: "Sum",
          period: cdk.Duration.minutes(30),
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "GetDocumentsDatabaseError",
          statistic: "Sum",
          period: cdk.Duration.minutes(30),
        }),
      ],
    });

    // Critical errors
    const criticalErrorsWidget = new cloudwatch.GraphWidget({
      title: "Critical System Errors",
      width: 24,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "AdminOperationCriticalError",
          statistic: "Sum",
          period: cdk.Duration.minutes(5),
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCApprovalCriticalError",
          statistic: "Sum",
          period: cdk.Duration.minutes(5),
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCRejectionCriticalError",
          statistic: "Sum",
          period: cdk.Duration.minutes(5),
        }),
      ],
    });

    dashboard.addWidgets(
      errorCategoriesWidget,
      adminErrorsWidget,
      criticalErrorsWidget
    );
  }

  /**
   * Add security metrics widgets
   */
  private addSecurityMetricsWidgets(dashboard: cloudwatch.Dashboard): void {
    // Authentication metrics
    const authMetricsWidget = new cloudwatch.GraphWidget({
      title: "Authentication Security Metrics",
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/Authentication",
          metricName: "AuthenticationSuccess",
          statistic: "Sum",
          period: cdk.Duration.minutes(30),
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/Authentication",
          metricName: "AuthenticationFailure",
          statistic: "Sum",
          period: cdk.Duration.minutes(30),
        }),
      ],
    });

    // Security events
    const securityEventsWidget = new cloudwatch.GraphWidget({
      title: "Security Events",
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/Security",
          metricName: "SuspiciousActivity",
          statistic: "Sum",
          period: cdk.Duration.minutes(30),
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/Security",
          metricName: "RateLimitExceeded",
          statistic: "Sum",
          period: cdk.Duration.minutes(30),
        }),
      ],
    });

    dashboard.addWidgets(authMetricsWidget, securityEventsWidget);
  }

  /**
   * Add infrastructure health widgets
   */
  private addInfrastructureHealthWidgets(
    dashboard: cloudwatch.Dashboard
  ): void {
    // DynamoDB metrics
    const dynamoWidget = new cloudwatch.GraphWidget({
      title: "DynamoDB Performance",
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: "AWS/DynamoDB",
          metricName: "ConsumedReadCapacityUnits",
          statistic: "Sum",
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            TableName:
              this.config.tableName ||
              `sachain-kyc-table-${this.config.environment}`,
          },
        }),
        new cloudwatch.Metric({
          namespace: "AWS/DynamoDB",
          metricName: "ConsumedWriteCapacityUnits",
          statistic: "Sum",
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            TableName:
              this.config.tableName ||
              `sachain-kyc-table-${this.config.environment}`,
          },
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: "AWS/DynamoDB",
          metricName: "ThrottledRequests",
          statistic: "Sum",
          period: cdk.Duration.minutes(5),
          dimensionsMap: {
            TableName:
              this.config.tableName ||
              `sachain-kyc-table-${this.config.environment}`,
          },
        }),
      ],
    });

    // S3 metrics
    const s3Widget = new cloudwatch.GraphWidget({
      title: "S3 Storage Metrics",
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: "AWS/S3",
          metricName: "NumberOfObjects",
          statistic: "Average",
          period: cdk.Duration.hours(1),
          dimensionsMap: {
            BucketName:
              this.config.bucketName ||
              `sachain-kyc-documents-${this.config.environment}`,
            StorageType: "AllStorageTypes",
          },
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: "AWS/S3",
          metricName: "BucketSizeBytes",
          statistic: "Average",
          period: cdk.Duration.hours(1),
          dimensionsMap: {
            BucketName:
              this.config.bucketName ||
              `sachain-kyc-documents-${this.config.environment}`,
            StorageType: "StandardStorage",
          },
        }),
      ],
    });

    // API Gateway metrics (if applicable)
    if (this.config.apiName) {
      const apiWidget = new cloudwatch.GraphWidget({
        title: "API Gateway Performance",
        width: 24,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/ApiGateway",
            metricName: "Count",
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
            dimensionsMap: { ApiName: this.config.apiName },
          }),
          new cloudwatch.Metric({
            namespace: "AWS/ApiGateway",
            metricName: "Latency",
            statistic: "Average",
            period: cdk.Duration.minutes(5),
            dimensionsMap: { ApiName: this.config.apiName },
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: "AWS/ApiGateway",
            metricName: "4XXError",
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
            dimensionsMap: { ApiName: this.config.apiName },
          }),
          new cloudwatch.Metric({
            namespace: "AWS/ApiGateway",
            metricName: "5XXError",
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
            dimensionsMap: { ApiName: this.config.apiName },
          }),
        ],
      });

      dashboard.addWidgets(dynamoWidget, s3Widget, apiWidget);
    } else {
      dashboard.addWidgets(dynamoWidget, s3Widget);
    }
  }

  /**
   * Create a simplified operational dashboard
   */
  createOperationalDashboard(): cloudwatch.Dashboard {
    const dashboard = new cloudwatch.Dashboard(
      this.config.lambdaFunctions[0],
      "KYCOperationalDashboard",
      {
        dashboardName: `${this.config.dashboardName}-operational`,
      }
    );

    // Key operational metrics
    const operationalWidget = new cloudwatch.GraphWidget({
      title: "Operational Overview",
      width: 24,
      height: 8,
      left: [
        new cloudwatch.Metric({
          namespace: "Sachain/KYC",
          metricName: "PendingKYCDocuments",
          statistic: "Maximum",
          period: cdk.Duration.minutes(15),
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/KYCUpload",
          metricName: "KYCUploadSuccess",
          statistic: "Sum",
          period: cdk.Duration.hours(1),
        }),
        new cloudwatch.Metric({
          namespace: "Sachain/AdminReview",
          metricName: "KYCApprovalSuccess",
          statistic: "Sum",
          period: cdk.Duration.hours(1),
        }),
      ],
    });

    // Error summary
    const errorSummaryWidget = new cloudwatch.GraphWidget({
      title: "Error Summary",
      width: 24,
      height: 6,
      left: this.config.lambdaFunctions.map((func) =>
        func.metricErrors({
          period: cdk.Duration.minutes(15),
          statistic: "Sum",
        })
      ),
    });

    dashboard.addWidgets(operationalWidget, errorSummaryWidget);

    return dashboard;
  }
}
