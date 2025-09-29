import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

import { CognitoConstruct } from "../constructs/cognito";
import { EnvironmentType } from "../types";

export interface CognitoStackProps extends StackProps {
  environment: EnvironmentType;
  postAuthLambda?: lambda.Function;
  postAddUserToGroupLambda?: lambda.Function;
}

export class CognitoStack extends Stack {
  public readonly cognito: CognitoConstruct;

  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

    const cognitoConstruct = new CognitoConstruct(this, "SachainCognito", {
      environment: props.environment,
      postAuthLambda: props.postAuthLambda,
      postAddUserToGroupLambda: props.postAddUserToGroupLambda,
    });
    this.cognito = cognitoConstruct;
  }
}
