import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export interface HBARApiConstructProps {
  environment: string;
  api: apigateway.RestApi;
  userPool: cognito.UserPool;
  rechargeHandlerLambda: lambda.Function;
  conversionHandlerLambda: lambda.Function;
}

export class HBARApiConstruct extends Construct {
  constructor(scope: Construct, id: string, props: HBARApiConstructProps) {
    super(scope, id);

    // Create Cognito User Pool Authorizer
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "HBARRechargeCognitoAuthorizer",
      {
        cognitoUserPools: [props.userPool],
        authorizerName: `sachain-hbar-recharge-authorizer-${props.environment}`,
      }
    );

    // Create recharge resource under API
    const rechargeResource = props.api.root.addResource("hbar-recharge");

    // Create Lambda integration
    const rechargeIntegration = new apigateway.LambdaIntegration(
      props.rechargeHandlerLambda,
      { proxy: true }
    );

    // POST /hbar-recharge - Initiate recharge request
    rechargeResource.addMethod("POST", rechargeIntegration, {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /hbar-recharge - List user's recharge transactions
    rechargeResource.addMethod("GET", rechargeIntegration, {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /hbar-recharge/{transactionId} - Get recharge status
    const transactionResource = rechargeResource.addResource("{transactionId}");
    transactionResource.addMethod("GET", rechargeIntegration, {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /hbar-recharge/{transactionId}/retry - Retry failed transaction
    const retryResource = transactionResource.addResource("retry");
    retryResource.addMethod("POST", rechargeIntegration, {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Add tags
    cdk.Tags.of(this).add("Component", "HBAR-API");
    cdk.Tags.of(this).add("Environment", props.environment);
  }
}