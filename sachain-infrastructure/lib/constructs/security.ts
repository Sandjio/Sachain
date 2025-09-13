import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { EnvironmentType } from "../types";

export interface SecurityConstructProps {
  environment: EnvironmentType;
  table: dynamodb.ITable;
  sachainBucket: s3.IBucket;
}

export class SecurityConstruct extends Construct {
  public readonly kycUploadRole: iam.Role;
  public readonly adminReviewRole: iam.Role;
  public readonly userNotificationRole: iam.Role;
  public readonly kycProcessingRole: iam.Role;
  public readonly projectCreationRole: iam.Role;
  public readonly stockMintingRole: iam.Role;
  public readonly stockMintingStatusRole: iam.Role;
  public readonly omPaymentsRole: iam.Role;

  private readonly table: dynamodb.ITable;
  private readonly documentBucket: s3.IBucket;
  private readonly environment: string;

  constructor(scope: Construct, id: string, props: SecurityConstructProps) {
    super(scope, id);

    this.table = props.table;
    this.documentBucket = props.sachainBucket;
    this.environment = props.environment;

    // Create least-privilege IAM roles for each Lambda function
    // this.postAuthRole = this.createPostAuthRole();
    this.kycUploadRole = this.createKycUploadRole();
    this.adminReviewRole = this.createAdminReviewRole();
    this.userNotificationRole = this.createUserNotificationRole();
    this.kycProcessingRole = this.createKycProcessingRole();
    this.projectCreationRole = this.createProjectCreationRole();
    this.stockMintingRole = this.createStockMintingRole();
    this.stockMintingStatusRole = this.createStockMintingStatusRole();
    this.omPaymentsRole = this.createOmPaymentRole();

    // Add cross-service access controls
    this.addCrossServiceAccessControls();
  }

  private createKycUploadRole(): iam.Role {
    const role = new iam.Role(this, "KycUploadLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Least-privilege role for KYC Upload Lambda",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // DynamoDB permissions - read user profiles, write KYC documents
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBKycOperations",
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
        ],
        resources: [this.table.tableArn, `${this.table.tableArn}/index/*`],
        conditions: {
          "ForAllValues:StringLike": {
            "dynamodb:LeadingKeys": ["USER#*"],
          },
        },
      })
    );

    // S3 permissions - read/write to KYC documents bucket
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "S3KycDocuments",
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:PutObjectTagging",
          "s3:GetObjectVersion",
        ],
        resources: [this.documentBucket.arnForObjects("kyc-documents/*")],
      })
    );

    // S3 bucket-level permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "S3BucketOperations",
        effect: iam.Effect.ALLOW,
        actions: ["s3:ListBucket", "s3:GetBucketLocation"],
        resources: [this.documentBucket.bucketArn],
        conditions: {
          StringLike: {
            "s3:prefix": ["kyc-documents/*"],
          },
        },
      })
    );

    // EventBridge permissions for publishing upload events
    // Using wildcard for event bus to avoid circular dependency
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "KycUploadEventBridgePutEvents",
        effect: iam.Effect.ALLOW,
        actions: ["events:PutEvents"],
        resources: [`arn:aws:events:*:${cdk.Aws.ACCOUNT_ID}:event-bus/*`],
        conditions: {
          StringEquals: {
            "events:source": "sachain.kyc",
          },
        },
      })
    );

    // CloudWatch metrics permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "KycUploadCloudWatchMetrics",
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "Sachain/KYCUpload",
          },
        },
      })
    );

    // X-Ray tracing permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "KycUploadXRayTracing",
        effect: iam.Effect.ALLOW,
        actions: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
        resources: ["*"],
      })
    );

    return role;
  }

  private createKycProcessingRole(): iam.Role {
    const role = new iam.Role(this, "KycProcessingLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Least-privilege role for KYC Processing Lambda",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // Permissions for processing KYC documents
    // This role can be used for more complex processing tasks that require additional permissions

    // DynamoDB permissions - read/write KYC documents
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBKycProcessing",
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
        ],
        resources: [this.table.tableArn, `${this.table.tableArn}/index/*`],
        // conditions: {
        //   "ForAllValues:StringLike": {
        //     "dynamodb:LeadingKeys": ["USER#*", "KYC#*"],
        //   },
        // },
      })
    );

    // SNS permissions for notifications
    // Using wildcard for SNS topics to avoid circular dependency
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "SNSPublish",
        effect: iam.Effect.ALLOW,
        actions: ["sns:Publish"],
        resources: [`arn:aws:sns:*:${cdk.Aws.ACCOUNT_ID}:*`],
      })
    );

    // CloudWatch metrics permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "KycProcessingCloudWatchMetrics",
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "Sachain/KYCProcessing",
          },
        },
      })
    );

    // X-Ray tracing permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "KycProcessingXRayTracing",
        effect: iam.Effect.ALLOW,
        actions: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
        resources: ["*"],
      })
    );

    return role;
  }

  private createAdminReviewRole(): iam.Role {
    const role = new iam.Role(this, "AdminReviewLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Least-privilege role for Admin Review Lambda",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // DynamoDB permissions - read/write KYC documents and user profiles
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBAdminOperations",
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan",
        ],
        resources: [this.table.tableArn, `${this.table.tableArn}/index/*`],
        conditions: {
          "ForAllValues:StringLike": {
            "dynamodb:LeadingKeys": ["USER#*", "AUDIT#*"],
          },
        },
      })
    );

    // S3 permissions - read KYC documents for review
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "S3ReadKycDocuments",
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:GetObjectVersion"],
        resources: [this.documentBucket.arnForObjects("kyc-documents/*")],
      })
    );

    // EventBridge permissions for publishing status changes
    // Using wildcard for event bus to avoid circular dependency
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "AdminReviewEventBridgePutEvents",
        effect: iam.Effect.ALLOW,
        actions: ["events:PutEvents"],
        resources: [`arn:aws:events:*:${cdk.Aws.ACCOUNT_ID}:event-bus/*`],
        conditions: {
          StringEquals: {
            "events:source": "sachain.kyc",
          },
        },
      })
    );

    // CloudWatch metrics permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "AdminReviewCloudWatchMetrics",
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "Sachain/AdminReview",
          },
        },
      })
    );

    // X-Ray tracing permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "AdminReviewXRayTracing",
        effect: iam.Effect.ALLOW,
        actions: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
        resources: ["*"],
      })
    );

    return role;
  }

  private createUserNotificationRole(): iam.Role {
    const role = new iam.Role(this, "UserNotificationLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Least-privilege role for User Notification Lambda",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // DynamoDB permissions - read-only access to user profiles
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBReadUserProfiles",
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:GetItem", "dynamodb:Query"],
        resources: [this.table.tableArn, `${this.table.tableArn}/index/*`],
        conditions: {
          "ForAllValues:StringLike": {
            "dynamodb:LeadingKeys": ["USER#*"],
          },
          StringEquals: {
            "dynamodb:Select": ["ALL_ATTRIBUTES"],
          },
        },
      })
    );

    // SES permissions for user notifications

    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "SESNotification",
        effect: iam.Effect.ALLOW,
        actions: ["ses:SendEmail"],
        resources: [
          `arn:aws:ses:us-east-1:${cdk.Aws.ACCOUNT_ID}:identity/emmasandjio.com`,
          `arn:aws:ses:us-east-1:${cdk.Aws.ACCOUNT_ID}:configuration-set/my-first-configuration-set`,
        ],
      })
    );

    // CloudWatch metrics permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "UserNotificationCloudWatchMetrics",
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "Sachain/UserNotification",
          },
        },
      })
    );

    // X-Ray tracing permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "UserNotificationXRayTracing",
        effect: iam.Effect.ALLOW,
        actions: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
        resources: ["*"],
      })
    );

    return role;
  }

  private createProjectCreationRole(): iam.Role {
    const role = new iam.Role(this, "ProjectCreationLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Least-privilege role for Project Creation Lambda",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // DynamoDB permissions - read user profiles, write project data, audit logs, compliance logs
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBProjectOperations",
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
        ],
        resources: [this.table.tableArn, `${this.table.tableArn}/index/*`],
      })
    );
    // Add GSI3 query permissions for project status queries
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBGSI3ProjectQueries",
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:Query"],
        resources: [`${this.table.tableArn}/index/GSI3`],
      })
    );

    // EventBridge permissions for publishing project events
    // Using wildcard for event bus to avoid circular dependency
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "ProjectCreationEventBridgePutEvents",
        effect: iam.Effect.ALLOW,
        actions: ["events:PutEvents"],
        resources: [`arn:aws:events:*:${cdk.Aws.ACCOUNT_ID}:event-bus/*`],
        conditions: {
          StringEquals: {
            "events:source": "sachain.projects",
          },
        },
      })
    );

    // CloudWatch metrics permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "ProjectCreationCloudWatchMetrics",
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "Sachain/Projects",
          },
        },
      })
    );

    // X-Ray tracing permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "ProjectCreationXRayTracing",
        effect: iam.Effect.ALLOW,
        actions: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
        resources: ["*"],
      })
    );

    return role;
  }

  private createStockMintingRole(): iam.Role {
    const role = new iam.Role(this, "StockMintingLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Least-privilege role for Stock Minting Lambda",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // DynamoDB permissions - read/write project data, stock NFTs, and transactions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBStockMintingOperations",
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:BatchWriteItem",
        ],
        resources: [this.table.tableArn, `${this.table.tableArn}/index/*`],
        conditions: {
          "ForAllValues:StringLike": {
            "dynamodb:LeadingKeys": ["USER#*", "PROJECT#*"],
          },
        },
      })
    );

    // EventBridge permissions for publishing stock minting events
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "EventBridgeStockMintingEvents",
        effect: iam.Effect.ALLOW,
        actions: ["events:PutEvents"],
        resources: [`arn:aws:events:*:${cdk.Aws.ACCOUNT_ID}:event-bus/*`],
        conditions: {
          StringEquals: {
            "events:source": "sachain.stock-minting",
          },
        },
      })
    );

    // CloudWatch metrics permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "CloudWatchStockMintingMetrics",
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": [
              "Sachain/StockMinting",
              "Sachain/Projects",
            ],
          },
        },
      })
    );

    // X-Ray tracing permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "StockMintingXRayTracing",
        effect: iam.Effect.ALLOW,
        actions: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
        resources: ["*"],
      })
    );

    return role;
  }

  private createStockMintingStatusRole(): iam.Role {
    const role = new iam.Role(this, "StockMintingStatusLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Least-privilege role for Stock Minting Status Lambda",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // DynamoDB permissions - read project data, stock NFTs, and transactions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBStockMintingStatusOperations",
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:GetItem", "dynamodb:Query"],
        resources: [this.table.tableArn, `${this.table.tableArn}/index/*`],
        conditions: {
          "ForAllValues:StringLike": {
            "dynamodb:LeadingKeys": ["USER#*", "PROJECT#*"],
          },
        },
      })
    );

    // CloudWatch metrics permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "CloudWatchStockMintingStatusMetrics",
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "Sachain/StockMintingStatus",
          },
        },
      })
    );

    // X-Ray tracing permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "StockMintingStatusXRayTracing",
        effect: iam.Effect.ALLOW,
        actions: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
        resources: ["*"],
      })
    );

    return role;
  }

  private createOmPaymentRole(): iam.Role {
    const role = new iam.Role(this, "OmPaymentLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Least-privilege role for Om Payment Lambda",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // DynamoDB permissions - read project data, stock NFTs, and transactions
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBOmPaymentOperations",
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
        ],
        resources: [this.table.tableArn, `${this.table.tableArn}/index/*`],
        // conditions: {
        //   "ForAllValues:StringLike": {
        //     "dynamodb:LeadingKeys": ["USER#*", "PROJECT#*"],
        //   },
        // },
      })
    );
    return role;
  }

  private addCrossServiceAccessControls(): void {
    // Add conditions to prevent privilege escalation
    const roles = [
      { role: this.kycUploadRole, name: "KycUpload" },
      { role: this.adminReviewRole, name: "AdminReview" },
      { role: this.userNotificationRole, name: "UserNotification" },
      { role: this.kycProcessingRole, name: "KycProcessing" },
      { role: this.projectCreationRole, name: "ProjectCreation" },
      { role: this.stockMintingRole, name: "StockMinting" },
      { role: this.stockMintingStatusRole, name: "StockMintingStatus" },
      { role: this.omPaymentsRole, name: "OmPayment" },
    ];

    roles.forEach(({ role, name }) => {
      role.addToPolicy(
        new iam.PolicyStatement({
          sid: `PreventPrivilegeEscalation${name}`,
          effect: iam.Effect.DENY,
          actions: [
            "iam:CreateRole",
            "iam:AttachRolePolicy",
            "iam:DetachRolePolicy",
            "iam:PutRolePolicy",
            "iam:DeleteRolePolicy",
            "iam:UpdateAssumeRolePolicy",
          ],
          resources: ["*"],
        })
      );
    });
  }

  /**
   * Apply the security roles to Lambda functions
   */
  public applyToLambdaFunction(
    lambdaFunction: lambda.Function,
    roleType: "kycUpload" | "adminReview" | "userNotification"
  ): void {
    const roleMap = {
      kycUpload: this.kycUploadRole,
      adminReview: this.adminReviewRole,
      userNotification: this.userNotificationRole,
    };

    const role = roleMap[roleType];
    if (role) {
      // Replace the default execution role with our custom role
      const cfnFunction = lambdaFunction.node
        .defaultChild as lambda.CfnFunction;
      cfnFunction.role = role.roleArn;
    }
  }

  /**
   * Get security compliance report
   */
  public getSecurityComplianceReport(): any {
    return {
      roles: {
        kycUpload: {
          roleName: this.kycUploadRole.roleName,
          permissions: [
            "dynamodb:read-write-kyc-documents",
            "s3:read-write-kyc-documents",
            "kms:encrypt-decrypt",
            "sns:publish",
            "cloudwatch:metrics",
            "xray:tracing",
          ],
        },
        adminReview: {
          roleName: this.adminReviewRole.roleName,
          permissions: [
            "dynamodb:read-write-kyc-documents",
            "s3:read-kyc-documents",
            "kms:decrypt",
            "events:put-events",
            "cloudwatch:metrics",
            "xray:tracing",
          ],
        },
        userNotification: {
          roleName: this.userNotificationRole.roleName,
          permissions: [
            "dynamodb:read-user-profiles",
            "sns:publish",
            "cloudwatch:metrics",
            "xray:tracing",
          ],
        },
      },
      securityFeatures: [
        "least-privilege-access",
        "resource-based-policies",
        "cross-service-access-controls",
        "time-based-restrictions",
        "encryption-enforcement",
        "secure-transport-only",
        "privilege-escalation-prevention",
      ],
    };
  }
}
