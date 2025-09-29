import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";

import { CognitoLambdaConstruct } from "../constructs/cognito-lambda-triggers";
import { EnvironmentType } from "../types";

export interface CognitoLambdaStackProps extends cdk.StackProps {
  environment: EnvironmentType;
  table?: dynamodb.ITableV2;
  userPool?: cognito.IUserPool;
}

/**
 * Stack that provisions Cognito Lambda triggers (PostAuth + PostConfirm).
 */
export class CognitoLambdaStack extends cdk.Stack {
  public readonly postAuthLambda?: lambda.Function;
  public readonly postAddUserToGroupLambda?: lambda.Function;
  constructor(scope: Construct, id: string, props: CognitoLambdaStackProps) {
    super(scope, id, props);

    // Deploy Cognito Lambda construct
    const cognitoLambdas = new CognitoLambdaConstruct(this, "CognitoLambdas", {
      environment: props.environment,
      table: props.table,
      userPool: props.userPool as cognito.UserPool,
    });

    this.postAuthLambda = cognitoLambdas.postAuthLambda;
    this.postAddUserToGroupLambda = cognitoLambdas.postAddUserToGroupLambda;

    // Outputs for debugging / cross-stack references
    new cdk.CfnOutput(this, "PostAuthLambdaName", {
      value: cognitoLambdas.postAuthLambda?.functionName ?? "N/A",
    });

    new cdk.CfnOutput(this, "PostAddUserToGroupLambdaName", {
      value: cognitoLambdas.postAddUserToGroupLambda?.functionName ?? "N/A",
    });
  }
}
