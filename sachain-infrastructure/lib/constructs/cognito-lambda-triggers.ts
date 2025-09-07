import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import * as path from "path";

export interface CognitoLambdaConstructProps {
  environment: string;

  // Optional: only needed for PostAuth
  table?: dynamodb.ITable;
  postAuthRole?: iam.Role;

  // Optional: only needed for PostConfirm
  userPool?: cognito.UserPool;
  postAddUserToGroupRole?: iam.Role;
}

/**
 * Construct for creating Cognito-triggered Lambda functions (PostAuth & PostConfirm).
 * This merges the two constructs into one configurable construct.
 */
export class CognitoLambdaConstruct extends Construct {
  public readonly postAuthLambda: lambda.Function;
  public readonly postAuthRole?: iam.Role;

  public readonly postAddUserToGroupLambda: lambda.Function;
  public readonly postAddUserToGroupRole?: iam.Role;

  constructor(
    scope: Construct,
    id: string,
    props: CognitoLambdaConstructProps
  ) {
    super(scope, id);

    //
    // --- PostAuth Lambda (if table provided) ---
    //
    if (props.table) {
      this.postAuthRole =
        props.postAuthRole ??
        new iam.Role(this, "PostAuthLambdaRole", {
          roleName: `sachain-post-auth-lambda-role-${props.environment}`,
          assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName(
              "service-role/AWSLambdaBasicExecutionRole"
            ),
          ],
        });

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

      this.postAuthRole.addToPolicy(
        new iam.PolicyStatement({
          sid: "CloudWatchMetrics",
          effect: iam.Effect.ALLOW,
          actions: ["cloudwatch:PutMetricData"],
          resources: ["*"],
          conditions: {
            StringEquals: { "cloudwatch:namespace": "Sachain/PostAuth" },
          },
        })
      );

      this.postAuthRole.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess")
      );

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
        tracing: lambda.Tracing.ACTIVE,
      });
    }

    //
    // --- PostConfirm Lambda (if userPool provided) ---
    //
    if (props.userPool) {
      this.postAddUserToGroupRole =
        props.postAddUserToGroupRole ??
        new iam.Role(this, "PostAddUserToGroupRole", {
          roleName: `sachain-post-add-user-to-group-role-${props.environment}`,
          assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
          managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName(
              "service-role/AWSLambdaBasicExecutionRole"
            ),
          ],
        });

      this.postAddUserToGroupRole.addToPolicy(
        new iam.PolicyStatement({
          sid: "CognitoUserPoolGroups",
          effect: iam.Effect.ALLOW,
          actions: [
            "cognito-idp:AdminAddUserToGroup",
            "cognito-idp:AdminListGroupsForUser",
          ],
          resources: [props.userPool.userPoolArn],
        })
      );

      this.postAddUserToGroupRole.addToPolicy(
        new iam.PolicyStatement({
          sid: "CloudWatchMetrics",
          effect: iam.Effect.ALLOW,
          actions: ["cloudwatch:PutMetricData"],
          resources: ["*"],
          conditions: {
            StringEquals: {
              "cloudwatch:namespace": "Sachain/PostAddUserToGroup",
            },
          },
        })
      );

      this.postAddUserToGroupRole.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess")
      );

      this.postAddUserToGroupLambda = new NodejsFunction(
        this,
        "PostAddUserToGroupLambda",
        {
          functionName: `sachain-post-add-user-to-group-${props.environment}`,
          runtime: lambda.Runtime.NODEJS_20_X,
          handler: "handler",
          entry: path.join(
            __dirname,
            "../../..",
            "backend/src/lambdas/post-add-user-to-group/index.ts"
          ),
          role: this.postAddUserToGroupRole,
          bundling: {
            minify: true,
            sourceMap: true,
            target: "node20",
            externalModules: [
              "aws-lambda",
              "@aws-sdk/client-cognito-identity-provider",
            ],
          },
          projectRoot: path.join(__dirname, "../../.."),
          environment: {
            ENVIRONMENT: props.environment,
            DEFAULT_GROUP: "Investor",
            REGION: cdk.Stack.of(this).region,
          },
          timeout: cdk.Duration.seconds(30),
          memorySize: 256,
          tracing: lambda.Tracing.ACTIVE,
        }
      );
    }
  }

  /**
   * Grant Cognito User Pool permission to invoke the PostAuth Lambda
   */
  public grantInvokeToUserPool(userPoolArn: string): void {
    if (!this.postAuthLambda) return;
    this.postAuthLambda.addPermission("CognitoInvokePermission", {
      principal: new iam.ServicePrincipal("cognito-idp.amazonaws.com"),
      sourceArn: userPoolArn,
      action: "lambda:InvokeFunction",
    });
  }

  /**
   * Grant wildcard user pool access for PostConfirm Lambda
   */
  public grantUserPoolAccess(): void {
    if (!this.postAddUserToGroupRole) return;
    this.postAddUserToGroupRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "CognitoUserPoolGroups",
        effect: iam.Effect.ALLOW,
        actions: [
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminListGroupsForUser",
        ],
        resources: [`arn:aws:cognito-idp:*:*:userpool/*`],
      })
    );
  }
}
