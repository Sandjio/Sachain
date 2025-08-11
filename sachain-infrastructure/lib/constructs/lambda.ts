import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as events from "aws-cdk-lib/aws-events";
import { Construct } from "constructs";

export interface LambdaConstructProps {
  table: dynamodb.Table;
  documentBucket?: s3.Bucket;
  notificationTopic?: sns.Topic;
  eventBus?: events.EventBus;
  environment: string;
}

export class LambdaConstruct extends Construct {
  public readonly postAuthLambda: lambda.Function;
  public readonly kycUploadLambda: lambda.Function;
  public readonly adminReviewLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    // Post-Authentication Lambda - will be implemented in task 4.1
    this.postAuthLambda = new lambda.Function(this, "PostAuthLambda", {
      functionName: `sachain-post-auth-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(
        "exports.handler = async () => ({ statusCode: 200 });"
      ),
      environment: {
        TABLE_NAME: props.table.tableName,
        ENVIRONMENT: props.environment,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // KYC Upload Lambda - will be implemented in task 6.1
    this.kycUploadLambda = new lambda.Function(this, "KYCUploadLambda", {
      functionName: `sachain-kyc-upload-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(
        "exports.handler = async () => ({ statusCode: 200 });"
      ),
      environment: {
        TABLE_NAME: props.table.tableName,
        ENVIRONMENT: props.environment,
      },
      timeout: cdk.Duration.seconds(60),
    });

    // Admin Review Lambda - will be implemented in task 7.1
    this.adminReviewLambda = new lambda.Function(this, "AdminReviewLambda", {
      functionName: `sachain-admin-review-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(
        "exports.handler = async () => ({ statusCode: 200 });"
      ),
      environment: {
        TABLE_NAME: props.table.tableName,
        ENVIRONMENT: props.environment,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant DynamoDB permissions
    props.table.grantReadWriteData(this.postAuthLambda);
    props.table.grantReadWriteData(this.kycUploadLambda);
    props.table.grantReadWriteData(this.adminReviewLambda);
  }
}
