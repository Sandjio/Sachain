import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export interface DynamoDBConstructProps {
  environment: string;
}

export class DynamoDBConstruct extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDBConstructProps) {
    super(scope, id);

    // Single Table Design configuration will be implemented in task 2.1
    this.table = new dynamodb.Table(this, "KYCTable", {
      tableName: `sachain-kyc-table-${props.environment}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      // Additional configuration will be added in task 2.1
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });
  }
}
