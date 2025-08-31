import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";

export interface PostConfirmLambdaConstructProps {
  environment: string;
  postAddUserToGroupRole?: iam.Role;
  userPool?: cdk.aws_cognito.UserPool;
}

/**
 * Construct for creating a post-confirmation Lambda function
 */
export class PostConfirmLambdaConstruct extends Construct {
  public readonly postAddUserToGroupLambda: lambda.Function;
  public readonly postAddUserToGroupRole: iam.Role;

  constructor(
    scope: Construct,
    id: string,
    props: PostConfirmLambdaConstructProps
  ) {
    super(scope, id);

    // Create least-privilege IAM role for Post-Confirmation Lambda
    this.postAddUserToGroupRole =
      props.postAddUserToGroupRole ??
      new iam.Role(this, "PostAddUserToGroupRole", {
        roleName: `sachain-post-add-user-to-group-role-${props.environment}`,
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        description: "Least-privilege role for Post-Confirmation Lambda",
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
      });

    // Add IAM permissions to manage Cognito User Pool groups (if userPool is provided)
    if (props.userPool) {
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
    }

    // Add CloudWatch metrics permissions
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

    // Add X-Ray tracing permissions
    this.postAddUserToGroupRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess")
    );

    // Post-Confirmation Lambda to add users to groups
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
          DEFAULT_GROUP: "Investor", // Default group if userType missing/invalid
          REGION: cdk.Stack.of(this).region,
        },
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        tracing: lambda.Tracing.ACTIVE,
      }
    );
  }

  /**
   * Grant permissions to access Cognito User Pools (using wildcard to avoid circular dependency)
   */
  public grantUserPoolAccess(): void {
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
