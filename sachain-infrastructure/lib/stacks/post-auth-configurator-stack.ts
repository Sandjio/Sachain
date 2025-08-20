import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cr from "aws-cdk-lib/custom-resources";
import * as iam from "aws-cdk-lib/aws-iam";

export interface PostAuthConfiguratorStackProps extends cdk.StackProps {
  environment: string;
  userPoolId: string;
  postAuthLambda: lambda.IFunction;
}

export class PostAuthConfiguratorStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: PostAuthConfiguratorStackProps
  ) {
    super(scope, id, props);

    const lambdaArn = props.postAuthLambda.functionArn;

    // Grant Cognito permission to invoke the Lambda
    props.postAuthLambda.addPermission("AllowCognitoInvoke", {
      principal: new iam.ServicePrincipal("cognito-idp.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${props.userPoolId}`,
    });

    const sdkCall: cr.AwsSdkCall = {
      service: "CognitoIdentityServiceProvider",
      action: "updateUserPool",
      parameters: {
        UserPoolId: props.userPoolId,
        LambdaConfig: {
          PostAuthentication: lambdaArn,
        },
      },
      physicalResourceId: cr.PhysicalResourceId.of(
        `PostAuthConfig-${props.userPoolId}`
      ),
    };

    new cr.AwsCustomResource(this, "ConfigurePostAuthLambda", {
      onCreate: sdkCall,
      onUpdate: sdkCall,
      onDelete: {
        service: "CognitoIdentityServiceProvider",
        action: "updateUserPool",
        parameters: {
          UserPoolId: props.userPoolId,
          LambdaConfig: {},
        },
        physicalResourceId: cr.PhysicalResourceId.of(
          `PostAuthConfig-${props.userPoolId}-delete`
        ),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });
  }
}
