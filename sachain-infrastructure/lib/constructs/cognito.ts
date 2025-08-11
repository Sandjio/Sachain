import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface CognitoConstructProps {
  postAuthLambda: lambda.Function;
  environment: string;
}

export class CognitoConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: CognitoConstructProps) {
    super(scope, id);

    // User Pool configuration will be implemented in task 3.1
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `sachain-user-pool-${props.environment}`,
      // Configuration will be added in task 3.1
    });

    // User Pool Client configuration will be implemented in task 3.2
    this.userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,
      userPoolClientName: `sachain-client-${props.environment}`,
      // Configuration will be added in task 3.2
    });
  }
}
