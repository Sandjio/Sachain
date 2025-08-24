import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as path from "path";

export interface PostAuthLambdaConstructProps {
  table: dynamodb.Table;
  environment: string;
  postAuthRole?: iam.Role;
}

/**
 * Construct for creating a post-authentication Lambda function
 * Extracted from the existing LambdaConstruct to be used in CoreStack
 */
export class PostAuthLambdaConstruct extends Construct {
  public readonly postAuthLambda: lambda.Function;
  public readonly postAuthRole: iam.Role;

  constructor(
    scope: Construct,
    id: string,
    props: PostAuthLambdaConstructProps
  ) {
    super(scope, id);

    // Create least-privilege IAM role for Post-Authentication Lambda
    this.postAuthRole =
      props.postAuthRole ??
      new iam.Role(this, "PostAuthLambdaRole", {
        roleName: `sachain-post-auth-lambda-role-${props.environment}`,
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        description: "Least-privilege role for Post-Authentication Lambda",
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
      });

    // Add DynamoDB permissions - only write access to user profiles
    this.postAuthRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "DynamoDBUserProfileWrite",
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:GetItem",
        ],
        resources: [props.table.tableArn],
      })
    );

    // Add CloudWatch metrics permissions
    this.postAuthRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "CloudWatchMetrics",
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "Sachain/PostAuth",
          },
        },
      })
    );

    // Add X-Ray tracing permissions
    this.postAuthRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "XRayTracing",
        effect: iam.Effect.ALLOW,
        actions: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
        resources: ["*"],
      })
    );

    // Post-Authentication Lambda - extracted from existing LambdaConstruct
    this.postAuthLambda = new NodejsFunction(this, "PostAuthLambda", {
      functionName: `sachain-post-auth-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(
        __dirname,
        "../../..",
        "backend/src/lambdas/post-auth/index.ts"
      ),
      role: this.postAuthRole,
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
        externalModules: [
          "@aws-sdk/client-dynamodb",
          "@aws-sdk/lib-dynamodb",
          "@aws-sdk/client-cloudwatch",
        ],
      },
      projectRoot: path.join(__dirname, "../../.."),
      environment: {
        TABLE_NAME: props.table.tableName,
        ENVIRONMENT: props.environment,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      // deadLetterQueue: Temporarily removed to avoid circular dependencies
      // Can be added back later after stack refactoring is complete
      tracing: lambda.Tracing.ACTIVE,
    });
  }

  /**
   * Grant Cognito User Pool permission to invoke this Lambda function
   */
  public grantInvokeToUserPool(userPoolArn: string): void {
    this.postAuthLambda.addPermission("CognitoInvokePermission", {
      principal: new iam.ServicePrincipal("cognito-idp.amazonaws.com"),
      sourceArn: userPoolArn,
      action: "lambda:InvokeFunction",
    });
  }

  /**
   * Get the Lambda function for use in other constructs
   */
  public getFunction(): lambda.Function {
    return this.postAuthLambda;
  }
}
