import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { CognitoConstruct } from "../constructs";
import { AuthStackOutputs } from "../interfaces";
import { ResourceReferenceTracker } from "../utils";

export interface AuthStackProps extends cdk.StackProps {
  environment: string;
  postAuthLambda?: lambda.IFunction;
}

export class AuthStack extends cdk.Stack implements AuthStackOutputs {
  public readonly cognitoConstruct: CognitoConstruct;

  // AuthStackOutputs interface implementation
  public readonly userPool: cdk.aws_cognito.UserPool;
  public readonly userPoolClient: cdk.aws_cognito.UserPoolClient;
  public readonly userPoolId: string;
  public readonly userPoolArn: string;
  public readonly userPoolClientId: string;
  public readonly userPoolDomain: string;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    // Record cross-stack references for tracking
    if (props.postAuthLambda) {
      ResourceReferenceTracker.recordReference(
        id,
        "LambdaStack",
        "postAuthLambda"
      );
    }

    // Add environment tags
    cdk.Tags.of(this).add("Environment", props.environment);
    cdk.Tags.of(this).add("Project", "Sachain");
    cdk.Tags.of(this).add("Component", "Authentication");

    // Create Cognito User Pool with optional post-authentication Lambda trigger
    this.cognitoConstruct = new CognitoConstruct(this, "Cognito", {
      postAuthLambda: props.postAuthLambda,
      environment: props.environment,
    });

    // Expose resources for cross-stack references
    this.userPool = this.cognitoConstruct.userPool;
    this.userPoolClient = this.cognitoConstruct.userPoolClient;
    this.userPoolId = this.userPool.userPoolId;
    this.userPoolArn = this.userPool.userPoolArn;
    this.userPoolClientId = this.userPoolClient.userPoolClientId;
    this.userPoolDomain = `sachain-${props.environment}.auth.${this.region}.amazoncognito.com`;

    // Create stack outputs for cross-stack references and API Gateway authorization
    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
      description: "Cognito User Pool ID",
      exportName: `${props.environment}-sachain-user-pool-id`,
    });

    new cdk.CfnOutput(this, "UserPoolArn", {
      value: this.userPool.userPoolArn,
      description: "Cognito User Pool ARN",
      exportName: `${props.environment}-sachain-user-pool-arn`,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
      exportName: `${props.environment}-sachain-user-pool-client-id`,
    });

    new cdk.CfnOutput(this, "UserPoolDomain", {
      value: `sachain-${props.environment}.auth.${this.region}.amazoncognito.com`,
      description: "Cognito User Pool Domain",
      exportName: `${props.environment}-sachain-user-pool-domain`,
    });
  }
}
